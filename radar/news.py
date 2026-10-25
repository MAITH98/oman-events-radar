"""Omani newspapers: find event stories, open each article once, and read the
event details written in it — all with fixed rules (keywords, regular expressions,
a venue alias list). No AI.

Flow per run:
  feeds → items whose title/summary contain event words (EN + AR)
        → article page fetched once (remembered in data/news_state.json)
        → dates, venue, organiser and event name extracted from the text
        → docs/news.json  +  dated future events become tier-D leads in the radar
"""

import datetime as dt
import email.utils
import hashlib
import html
import json
import re

from .adapters import _items
from .model import Event, clean, find_dates, normalize_title

# ---------- feed items ----------

def _pub_date(raw):
    if not raw:
        return None
    try:
        return email.utils.parsedate_to_datetime(raw).date()
    except (TypeError, ValueError):
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw.strip())
        return dt.date(*map(int, m.groups())) if m else None


def _matches(text, words_en, words_ar):
    low = text.lower()
    if any(re.search(r"(?<![\w])" + re.escape(w) + r"(?![\w])", low) for w in words_en):
        return True
    return any(w in text for w in words_ar)


# ---------- article reading ----------

_META = re.compile(r'<meta\s+[^>]*(?:property|name)=["\']([^"\']+)["\'][^>]*content=["\']([^"\']*)["\']', re.I)
_META_REV = re.compile(r'<meta\s+[^>]*content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']([^"\']+)["\']', re.I)


def read_article(page):
    """Return (meta dict, body text) from an article page."""
    meta = {k.lower(): html.unescape(v) for k, v in _META.findall(page)}
    meta.update({k.lower(): html.unescape(v) for v, k in _META_REV.findall(page) if k.lower() not in meta})
    page = re.sub(r"<(script|style|noscript|nav|footer|header|aside|form)\b.*?</\1>", " ", page, flags=re.S | re.I)
    scope = page
    m = re.search(r"<article\b.*?</article>", page, re.S | re.I)
    if m and len(m.group(0)) > 500:
        scope = m.group(0)
    paras = [clean(p) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", scope, re.S | re.I)]
    body = "\n".join(p for p in paras if len(p) > 25)
    return meta, body[:8000]


_ORG_EN = re.compile(r"\b(?:organi[sz]ed|hosted|held)\s+by\s+(?:the\s+)?([A-Z][\w&'.-]*(?:\s+(?:of|for|and|&|the|[A-Z][\w&'.-]*)){0,8})")
_ORG_AR = re.compile(r"(?:تنظمه|تنظمها|ينظمه|ينظمها|بتنظيم(?:\s+من)?|تنظيم)\s+([^\n،.:؛]{3,60})")
_NAME_EN = re.compile(
    r"((?:(?:the\s+)?\d{1,2}(?:st|nd|rd|th)\s+)?(?:[A-Z][\w&'’-]*\s+){1,7}"
    r"(?:Summit|Forum|Conference|Expo|Exhibition|Festival|Week|Hackathon|Awards|Show|Symposium|Congress|Fair|Meetup|Bootcamp)"
    r"(?:\s+(?:20\d{2}|[A-Z][\w&'-]*)){0,2})")
_NAME_AR = re.compile(r"((?:مؤتمر|معرض|ملتقى|منتدى|مهرجان|هاكاثون|أسبوع|قمة|جائزة|ندوة)\s+[^\n،.:؛\"«»]{3,60})")
_QUOTED = re.compile(r"[«\"“]([^»\"”]{4,80})[»\"”]")


def _name_in(text, lang):
    if lang == "en":
        m = _NAME_EN.search(text)
        return clean(re.sub(r"^the\s+", "", m.group(1), flags=re.I)) if m else ""
    q = _QUOTED.search(text)
    if q and any(k in q.group(1) for k in ("مؤتمر", "معرض", "ملتقى", "منتدى", "مهرجان", "هاكاثون", "أسبوع", "قمة")):
        return clean(q.group(1))
    m = _NAME_AR.search(text)
    return clean(" ".join(m.group(1).split()[:7])) if m else ""


def event_name(title, body, lang):
    """Best rule-based guess of the event's own name; falls back to the headline.
    When the article body names the same event more fully ("3rd … 2026"), the fuller name wins."""
    from_title, from_body = _name_in(title, lang), _name_in(body[:1500], lang)
    if from_title and from_body and normalize_title(from_title) in normalize_title(from_body):
        return from_body
    return from_title or from_body or clean(title)


def find_venue(text, aliases):
    low = text.lower()
    for canonical, words in aliases.items():
        for w in words:
            if (w.isascii() and re.search(r"(?<![\w])" + re.escape(w.lower()) + r"(?![\w])", low)) or (not w.isascii() and w in text):
                return canonical
    return ""


def find_organizer(text, lang):
    m = (_ORG_EN if lang == "en" else _ORG_AR).search(text)
    return clean(m.group(1))[:80] if m else ""


_MON = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?"
_EN_RANGES = [
    # "March 24-April 3, 2027" / "March 24 to April 3"
    (re.compile(_MON + r"\s+(\d{1,2})\s*(?:-|–|to|until)\s*" + _MON + r"\s+(\d{1,2})(?:,?\s+(20\d{2}))?", re.I), "MdMd"),
    # "24 March - 3 April 2027"
    (re.compile(r"\b(\d{1,2})\s+" + _MON + r"\s*(?:-|–|to|until)\s*(\d{1,2})\s+" + _MON + r"(?:,?\s+(20\d{2}))?", re.I), "dMdM"),
    # "November 18-19" / "November 18" (no year)
    (re.compile(_MON + r"\s+(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?(?!\d|,?\s*20\d{2})", re.I), "Md"),
    # "18-19 November" / "18 November" (no year)
    (re.compile(r"\b(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?\s+" + _MON + r"(?!\w)(?!,?\s*20\d{2})", re.I), "dM"),
]
_AR_MONTHS = {"يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "ابريل": 4, "إبريل": 4, "مايو": 5, "يونيو": 6, "يوليو": 7,
              "أغسطس": 8, "اغسطس": 8, "سبتمبر": 9, "أكتوبر": 10, "اكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12}
_AR_MON = "(" + "|".join(_AR_MONTHS) + ")"
_AR_RANGES = [
    (re.compile(r"(\d{1,2})\s+" + _AR_MON + r"\s*(?:-|–|إلى|الى|حتى)\s*(\d{1,2})\s+" + _AR_MON + r"(?:\s+(20\d{2}))?"), "dMdM"),
    (re.compile(r"(\d{1,2})(?:\s*(?:-|–|إلى|الى|و)\s*(\d{1,2}))?\s+(?:من\s+)?(?:شهر\s+)?" + _AR_MON + r"(?!\s*20\d{2})"), "dM"),
]
_EN_DAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
_AR_DAYS = {"الاثنين": 0, "الإثنين": 0, "الثلاثاء": 1, "الأربعاء": 2, "الاربعاء": 2, "الخميس": 3, "الجمعة": 4, "السبت": 5, "الأحد": 6, "الاحد": 6}
_EN_WEEKDAY = re.compile(r"\b(?:on|this|next|from)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", re.I)
_AR_WEEKDAY = re.compile(r"(?:يوم\s+|\.\.\s*|،\s*)(الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت|الأحد|الاحد)(?:\s+المقبل|\s+القادم)?\s*$")
_EN_TOMORROW = re.compile(r"\btomorrow\b", re.I)
_AR_TOMORROW = re.compile(r"(?:^|\s)(?:غدًا|غدا)(?:\s|$)")


def _month(name):
    return {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10,
            "nov": 11, "dec": 12}.get(name[:3].lower()) or _AR_MONTHS.get(name)


def _with_year(month, day, year, ref):
    """A date written without a year is the next one not long before the reference date."""
    for y in ([int(year)] if year else [ref.year, ref.year + 1]):
        try:
            d = dt.date(y, month, int(day))
        except ValueError:
            return None
        if year or d >= ref - dt.timedelta(days=10):
            return d
    return None


def _range_dates(text, ref):
    text = text.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    found = []
    for pattern, kind in _EN_RANGES + _AR_RANGES:
        for m in pattern.finditer(text):
            g = m.groups()
            if kind == "MdMd":
                m1, d1, m2, d2, y = g
            elif kind == "dMdM":
                d1, m1, d2, m2, y = g
            elif kind == "Md":
                m1, d1, d2 = g
                m2, y = m1, None
            else:  # dM
                d1, d2, m1 = g
                m2, y = m1, None
            mo1, mo2 = _month(m1), _month(m2)
            if not mo1 or not mo2 or int(d1) > 31 or (d2 and int(d2) > 31):
                continue
            start = _with_year(mo1, d1, y, ref)
            end = _with_year(mo2, d2, y or (start.year if start else None), ref) if d2 else None
            if start and end and end < start:
                end = None
            if start:
                found.append((m.start(), start, end))
    return [(s, e) for _, s, e in sorted(found, key=lambda f: f[0])]


def _weekday_date(title, lang, published):
    """'… on Monday' / '… الاثنين' / 'tomorrow' in a headline → the next such day after publication."""
    if lang == "en":
        if _EN_TOMORROW.search(title):
            return published + dt.timedelta(days=1)
        m = _EN_WEEKDAY.search(title)
        wd = _EN_DAYS[m.group(1).lower()] if m else None
    else:
        if _AR_TOMORROW.search(title):
            return published + dt.timedelta(days=1)
        m = _AR_WEEKDAY.search(title.strip())
        wd = _AR_DAYS[m.group(1)] if m else None
    if wd is None:
        return None
    return published + dt.timedelta(days=(wd - published.weekday()) % 7 or 7)


def pick_dates(text, published, today, horizon_days=400, lang="en", title=""):
    """The event date written in an article, by rule, in this order:
    1. an explicit date with a year (EN/AR, single day or range)
    2. a range or date without a year (incl. cross-month "March 24-April 3"), year inferred
    3. a weekday or "tomorrow" in the headline ("… on Monday", "… الاثنين")
    Only dates from 10 days before publication up to the horizon count."""
    ref = published or today
    earliest = ref - dt.timedelta(days=10)
    latest = today + dt.timedelta(days=horizon_days)
    ok = lambda d: d and earliest <= d <= latest
    for start, end, _ in find_dates(text):
        if ok(start):
            return start, end
    for start, end in _range_dates(text, ref):
        if ok(start):
            return start, end
    if title:
        d = _weekday_date(title, lang, ref)
        if ok(d):
            return d, None
    return None, None


# ---------- collection ----------

RULES_VERSION = 2  # bump when extraction rules change: cached articles are then read again

def collect(fetcher, cfg, state, today):
    """Returns (articles, events). `state` maps article url → cached extraction."""
    ncfg = cfg.get("news", {})
    words_en = [w.lower() for w in ncfg.get("keywords_en", [])]
    words_ar = ncfg.get("keywords_ar", [])
    skip_en = [w.lower() for w in ncfg.get("exclude_title_en", [])]
    skip_ar = ncfg.get("exclude_title_ar", [])
    aliases = ncfg.get("venue_aliases", {})
    budget = ncfg.get("max_new_articles_per_run", 40)
    keep = today - dt.timedelta(days=ncfg.get("keep_days", 45))
    report = []

    candidates = []
    for feed in ncfg.get("feeds", []):
        try:
            items = list(_items(fetcher.get(feed["url"])))
        except Exception as exc:  # one paper failing must not stop the others
            report.append((f"news:{feed['name']}", 0, f"{type(exc).__name__}: {str(exc)[:80]}"))
            continue
        kept = 0
        for title, link, desc, pub in items:
            title, desc = clean(title), clean(desc, 400)
            link = (link or "").strip()
            published = _pub_date(pub)
            if not link or not title or (published and published < keep):
                continue
            if _matches(f"{title} {desc}", words_en, words_ar) and not _matches(title, skip_en, skip_ar):
                candidates.append((feed, title, link, desc, published))
                kept += 1
        report.append((f"news:{feed['name']}", kept, ""))

    articles, events, fetched = [], [], 0
    seen = set()
    for feed, title, link, desc, published in candidates:
        if link in seen:
            continue
        seen.add(link)
        cached = state.get(link)
        if cached is not None and cached.get("rules") != RULES_VERSION:
            cached = None
        if cached is None and fetched < budget:
            fetched += 1
            try:
                meta, body = read_article(fetcher.get(link))
                lang = feed["lang"]
                text = f"{title}\n{meta.get('og:description', '')}\n{body}"
                start, end = pick_dates(text, published, today, lang=lang, title=title)
                cached = {
                    "rules": RULES_VERSION,
                    "checked": today.isoformat(),
                    "summary": clean(meta.get("og:description") or desc or body[:300], 300),
                    "published": (published or _pub_date(meta.get("article:published_time")) or today).isoformat(),
                    "event": None if not start else {
                        "name": event_name(title, body, lang),
                        "start": start.isoformat(),
                        "end": (end or start).isoformat(),
                        "venue": find_venue(text, aliases),
                        "organizer": find_organizer(text, lang),
                    },
                }
            except Exception as exc:
                cached = {"rules": RULES_VERSION, "checked": today.isoformat(), "error": type(exc).__name__, "summary": desc,
                          "published": (published or today).isoformat(), "event": None}
            state[link] = cached
        if cached is None:
            continue  # over budget: read on a later run
        art = {
            "id": hashlib.sha1(link.encode()).hexdigest()[:12],
            "title": title, "url": link, "source": feed["label"], "lang": feed["lang"],
            "published": cached["published"], "summary": cached.get("summary", ""),
            "event": dict(cached["event"]) if cached.get("event") else None,
        }
        articles.append(art)
        ev = art["event"]
        if ev and ev["start"] >= today.isoformat():
            events.append(Event(
                title=ev["name"], start=dt.date.fromisoformat(ev["start"]), end=dt.date.fromisoformat(ev["end"]),
                venue=ev["venue"], organizer=ev["organizer"], url=link, description=art["summary"],
                source=f"news:{feed['name']}", tier="D", city="Muscat" if ev["venue"] else ""))

    # Forget cache entries for articles that dropped out of every feed long ago.
    for url in [u for u, c in state.items() if c.get("checked", "") < keep.isoformat()]:
        state.pop(url, None)
    articles.sort(key=lambda a: a["published"], reverse=True)
    return articles, events, report


def link_to_events(articles, records, same):
    """Attach the radar event id when an article's event matches a published record."""
    for art in articles:
        ev = art.get("event")
        if not ev:
            continue
        probe = Event(title=ev["name"], start=dt.date.fromisoformat(ev["start"]))
        for r in records:
            if r.get("kind") not in ("event", "expected") or r.get("status") == "Removed":
                continue
            if all(src.startswith("news:") for src in r.get("sources", [])):
                continue  # the story's own lead is not a "match"
            cand = Event(title=r["title"], start=dt.date.fromisoformat(r["start"]), venue=r.get("venue", ""))
            if same(probe, cand) or (normalize_title(ev["name"]) and normalize_title(ev["name"]) == normalize_title(r["title"])):
                ev["matched_event_id"] = r["id"]
                break
    return articles


def write(path, articles, generated_at):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"schema_version": "1.0", "generated_at": generated_at, "count": len(articles), "articles": articles},
                  fh, ensure_ascii=False, indent=1)
