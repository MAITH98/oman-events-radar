"""Source adapters. Each adapter turns one kind of public source into Events.

Adapter types (set as "type" in sources.json):
  ical      - any .ics / ?ical=1 calendar feed
  wp_tribe  - WordPress "The Events Calendar" REST API (/wp-json/tribe/events/v1/events)
  jsonld    - pages that publish schema.org Event markup; optionally follows
              detail links on a listing page that match "link_pattern"
  rss_leads - news RSS feeds filtered by event words; dated items become tier-D
              events, undated items go to the lead queue (start=None)
  page_watch- organiser/venue pages without any feed: dates written in the page
              text become tier-D leads; the page hash flags changes for review
  csv       - a local CSV (seed list or community submissions)
"""

import csv
import datetime as dt
import hashlib
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET

from .model import Event, clean, find_date_range, find_dates, parse_date


# ---------- iCal ----------

def _ical_unescape(v):
    return v.replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")


def parse_ical(text, source):
    lines = []
    for raw in text.replace("\r\n", "\n").split("\n"):
        if raw[:1] in (" ", "\t") and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    events, cur = [], None
    for line in lines:
        if line == "BEGIN:VEVENT":
            cur = {}
        elif line == "END:VEVENT" and cur is not None:
            start = parse_date(cur.get("DTSTART"))
            if start and cur.get("SUMMARY"):
                end = parse_date(cur.get("DTEND"))
                # DTEND for all-day events is exclusive
                if end and "T" not in cur.get("DTSTART", "") and end > start:
                    end -= dt.timedelta(days=1)
                events.append(Event(
                    title=clean(_ical_unescape(cur["SUMMARY"])), start=start,
                    end=end if end and end != start else None,
                    venue=clean(_ical_unescape(cur.get("LOCATION", ""))),
                    url=cur.get("URL", ""), description=clean(_ical_unescape(cur.get("DESCRIPTION", "")), 400),
                    source=source))
            cur = None
        elif cur is not None and ":" in line:
            key, val = line.split(":", 1)
            cur[key.split(";", 1)[0]] = val
    return events


def ical(fetcher, src):
    return parse_ical(fetcher.get(src["url"]), src["name"])


# ---------- WordPress The Events Calendar ----------

def wp_tribe(fetcher, src, today=None):
    today = today or dt.date.today()
    url = src["url"] + ("&" if "?" in src["url"] else "?") + urllib.parse.urlencode(
        {"per_page": 50, "start_date": today.isoformat()})
    events, pages = [], 0
    while url and pages < src.get("max_pages", 5):
        data = json.loads(fetcher.get(url))
        for e in data.get("events", []):
            venue = e.get("venue") or {}
            organizer = e.get("organizer") or []
            events.append(Event(
                title=clean(e.get("title")), start=parse_date(e.get("start_date")),
                end=parse_date(e.get("end_date")),
                venue=clean(venue.get("venue", "") if isinstance(venue, dict) else ""),
                city=src.get("city", ""),
                organizer=clean(organizer[0].get("organizer", "")) if organizer else "",
                organizer_url=(organizer[0].get("website", "") or "") if organizer else "",
                url=e.get("website") or e.get("url", ""),
                description=clean(e.get("excerpt") or e.get("description"), 400),
                ticket_price=clean(e.get("cost", "")), source=src["name"]))
        url, pages = data.get("next_rest_url"), pages + 1
    return [e for e in events if e.start]


# ---------- schema.org JSON-LD ----------

_LD = re.compile(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", re.S | re.I)


def _walk(node):
    if isinstance(node, list):
        for n in node:
            yield from _walk(n)
    elif isinstance(node, dict):
        t = node.get("@type", "")
        types = t if isinstance(t, list) else [t]
        if any(str(x).endswith("Event") for x in types):
            yield node
        for k in ("@graph", "itemListElement", "item", "mainEntity", "subEvent"):
            if k in node:
                yield from _walk(node[k])


def _text(v):
    if isinstance(v, list):
        v = v[0] if v else ""
    if isinstance(v, dict):
        return v.get("name") or v.get("streetAddress") or v.get("addressLocality") or ""
    return v or ""


def parse_jsonld(page, source, base_url=""):
    events = []
    for block in _LD.findall(page):
        try:
            data = json.loads(block.strip())
        except ValueError:
            continue
        for node in _walk(data):
            start = parse_date(node.get("startDate"))
            if not start or not node.get("name"):
                continue
            loc = node.get("location") or {}
            if isinstance(loc, list):
                loc = loc[0] if loc else {}
            address = loc.get("address", {}) if isinstance(loc, dict) else {}
            offers = node.get("offers") or {}
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            price = ""
            if isinstance(offers, dict) and offers.get("price") not in (None, ""):
                price = f"{offers.get('price')} {offers.get('priceCurrency', '')}".strip()
                try:
                    if float(offers.get("price")) == 0:
                        price = "Free"
                except (TypeError, ValueError):
                    pass
            end = parse_date(node.get("endDate"))
            org = node.get("organizer")
            org = org[0] if isinstance(org, list) and org else org
            org_url = org.get("url", "") if isinstance(org, dict) else ""
            events.append(Event(
                title=clean(node["name"]), start=start, end=end if end and end != start else None,
                venue=clean(_text(loc)),
                city=clean(address.get("addressLocality", "") if isinstance(address, dict) else _text(address)),
                organizer=clean(_text(node.get("organizer"))),
                organizer_url=org_url if isinstance(org_url, str) else "",
                status_hint=str(node.get("eventStatus", "")).rsplit("/", 1)[-1],
                url=urllib.parse.urljoin(base_url, _text(node.get("url")) or base_url),
                description=clean(node.get("description"), 400),
                ticket_price=price, source=source))
    return events


def jsonld(fetcher, src):
    page = fetcher.get(src["url"])
    events = parse_jsonld(page, src["name"], src["url"])
    pattern = src.get("link_pattern")
    if pattern:
        links = []
        for link in re.findall(pattern, page):
            link = urllib.parse.urljoin(src["url"], link)
            if link not in links:
                links.append(link)
        for link in links[: src.get("max_details", 20)]:
            try:
                events += parse_jsonld(fetcher.get(link), src["name"], link)
            except Exception as exc:  # one broken page must not stop the run
                print(f"  ! {link}: {exc}")
    return events


# ---------- RSS leads ----------

def rss_leads(fetcher, src):
    """News feeds filtered by event words (the hashtag/keyword vocabulary in sources.json).
    (Google News search RSS is disallowed by its robots.txt, so it is not used.)"""
    urls = list(src.get("urls", [])) + ([src["url"]] if src.get("url") else [])
    must = [k.lower() for k in src.get("must_include", [])]
    events = []
    for url in urls:
        try:
            events += _rss_items(fetcher.get(url), src, must)
        except Exception as exc:  # one feed failing must not hide the others
            print(f"  ! {url}: {type(exc).__name__}: {exc}")
    return events


def _items(text):
    """Yield (title, link, description). Falls back to regex for feeds that are not valid XML."""
    try:
        for item in ET.fromstring(text).iter("item"):
            yield item.findtext("title"), item.findtext("link"), item.findtext("description")
        return
    except ET.ParseError:
        pass
    for block in re.findall(r"<item\b.*?</item>", text, re.S):
        def tag(name):
            m = re.search(rf"<{name}[^>]*>(.*?)</{name}>", block, re.S)
            return re.sub(r"^<!\[CDATA\[|\]\]>$", "", m.group(1).strip()) if m else ""
        yield tag("title"), tag("link"), tag("description")


def _rss_items(text, src, must):
    events = []
    for raw_title, link, desc in _items(text):
        title = clean(raw_title)
        if must and not any(k in title.lower() for k in must):
            continue
        start, end = find_date_range(title + " " + clean(desc))
        # Undated announcements are kept too: they become leads (start=None) for the review queue.
        events.append(Event(title=re.sub(r"\s+-\s+[^-]+$", "", title), start=start, end=end,
                            url=(link or "").strip(), source=src["name"],
                            description=clean(desc, 300), city=src.get("city", "")))
    return events


# ---------- page watch (organiser / venue pages with no feed) ----------

_BLOCK = re.compile(r"</?(p|div|li|h[1-6]|tr|td|section|article|br|span)\b[^>]*>", re.I)


def page_text_lines(page):
    page = re.sub(r"<(script|style|noscript)\b.*?</\1>", " ", page, flags=re.S | re.I)
    lines = [clean(x) for x in _BLOCK.sub("\n", page).split("\n")]
    return [x for x in lines if x]


_PLACE_WORDS = {"muscat", "oman", "sultanate", "of", "the", "ocec", "venue", "date", "dates", "location",
                "convention", "exhibition", "centre", "center", "&", "and", "مسقط", "عمان", "سلطنة"}


_UI_TEXT = re.compile(r"^(visit|register|book|read|learn|view|see|more|click|download|buy|get|join|apply|"
                      r"contact|subscribe|share|home|menu|tickets?)\b", re.I)


# Times ("08:00 AM") and generic section labels ("INDUSTRY NEWS") are not event titles.
_LABEL = re.compile(r"^(\d{1,2}[:.]\d{2}\s*(am|pm)?|(latest|industry|press|media)?\s*(news|events?|updates?|"
                    r"announcements?|highlights|calendar|agenda|programme|program))$", re.I)


def _only_places(title):
    """True for titles that are only place names, dates or button text ("VISIT WEBSITE")."""
    words = re.findall(r"[\w&]+", title.lower())
    return (not words or all(w in _PLACE_WORDS or w.isdigit() for w in words)
            or bool(_UI_TEXT.match(title.strip())) or bool(_LABEL.match(title.strip())))


_DATE_TEXT = re.compile(r"[\d٠-٩]{1,2}\s*[-–]?\s*[\d٠-٩]{0,2}\s+\S+\s+20\d{2}"
                        r"|\S+\s+\d{1,2}(\s*[-–]\s*\d{1,2})?,?\s+20\d{2}")


def _strip_dates(line):
    return clean(_DATE_TEXT.sub("", line)).strip(" -–|:,")


def page_watch(fetcher, src):
    """Every line that contains an explicit date becomes a lead; the title is that line with
    the date removed, or the previous line when the line is only a date."""
    page = fetcher.get(src["url"])
    src["_hash"] = hashlib.sha1("\n".join(page_text_lines(page)).encode()).hexdigest()[:16]
    events = parse_jsonld(page, src["name"], src["url"])
    lines = page_text_lines(page)
    for i, line in enumerate(lines):
        if len(line) > 220:
            continue
        for start, end, _ in find_dates(line)[:1]:
            title = _strip_dates(line)
            if _only_places(title) and i:
                title = _strip_dates(lines[i - 1])
            if 6 <= len(title) <= 90 and len(title.split()) <= 12 and not _only_places(title):
                events.append(Event(title=title, start=start, end=end, url=src["url"],
                                    organizer=src.get("organizer", ""), venue=src.get("venue", ""),
                                    city=src.get("city", ""), source=src["name"]))
    return events


# ---------- CSV (seed list, community submissions) ----------

SHEET_COLUMNS = ["START DATE", "END DATE", "EVENT", "AVENUE", "ORGANIZED BY", "ORGANIZED FOR",
                 "WEBSITE", "GENERAL INFO", "TICKET DEADLINE", "TICKET PRICE"]


def csv_file(fetcher, src, root="."):
    path = src["path"] if src["path"].startswith("/") else f"{root}/{src['path']}"
    year = src.get("default_year", dt.date.today().year)
    events = []
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            row = {k.strip().upper(): (v or "").strip() for k, v in row.items() if k}
            title = row.get("EVENT")
            start = parse_date(row.get("START DATE"), year)
            url = row.get("WEBSITE", "")
            if not title and url and src.get("follow_links"):
                # Community submission with only a link: read its schema.org markup.
                try:
                    events += parse_jsonld(fetcher.get(url), src["name"], url)
                except Exception as exc:
                    print(f"  ! {url}: {exc}")
                continue
            if not (title and start):
                continue
            end = parse_date(row.get("END DATE"), year)
            events.append(Event(
                title=clean(title), start=start, end=end if end and end != start else None,
                venue=clean(row.get("AVENUE")), organizer=clean(row.get("ORGANIZED BY")),
                audience=clean(row.get("ORGANIZED FOR")), url=url,
                description=clean(row.get("GENERAL INFO"), 400),
                ticket_deadline=row.get("TICKET DEADLINE", ""), ticket_price=row.get("TICKET PRICE", ""),
                source=src["name"], city=src.get("city", "")))
    return events


ADAPTERS = {"ical": ical, "wp_tribe": wp_tribe, "jsonld": jsonld, "rss_leads": rss_leads,
            "page_watch": page_watch, "csv": csv_file}
