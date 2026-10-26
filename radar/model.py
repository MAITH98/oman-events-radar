"""Event model and the deterministic rules applied to it.

Everything here is rule-based: regular expressions, keyword weights, fixed
point scores and string similarity. No machine-learning or generative models.
"""

import dataclasses
import datetime as dt
import difflib
import hashlib
import html
import re

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

# Trust tiers:
#   A official venue / organiser / government calendar   B official event website or maintainer-approved
#   C aggregator (allevents, eventbrite)                  D news, page-watch, prediction
TIER_POINTS = {"A": 70, "B": 60, "C": 40, "D": 25}


@dataclasses.dataclass
class Event:
    title: str
    start: dt.date | None
    end: dt.date | None = None
    venue: str = ""
    city: str = ""
    organizer: str = ""
    organizer_url: str = ""
    audience: str = ""
    url: str = ""
    description: str = ""
    ticket_deadline: str = ""
    ticket_price: str = ""
    source: str = ""
    tier: str = "C"
    kind: str = "event"          # event | expected (predicted next edition) | occasion
    status_hint: str = ""        # schema.org eventStatus, e.g. EventCancelled / EventPostponed
    start_time: str = ""         # "HH:MM" local Muscat time when the source publishes one
    end_time: str = ""
    # filled by the pipeline
    id: str = ""
    sources: list = dataclasses.field(default_factory=list)
    tiers: list = dataclasses.field(default_factory=list)
    category: str = ""
    relevance: str = ""
    score: int = 0
    region: str = ""
    confidence: int = 0
    previous_start: str = ""
    first_seen: str = ""
    last_seen: str = ""

    @property
    def last_day(self):
        return self.end or self.start


# ---------- text helpers ----------

def clean(text, limit=None):
    text = html.unescape(re.sub(r"<[^>]+>", " ", str(text or "")))
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        text = text[: limit - 1].rsplit(" ", 1)[0] + "…"
    return text


_STOP = r"\b(the|annual|edition|summit|conference|exhibition|expo|forum|event|and|of|in|at|oman|muscat|international)\b"


def normalize_title(title):
    """Core tokens of a title: years, ordinals, punctuation and generic event words removed."""
    t = clean(title).lower()
    t = re.sub(r"\b(19|20)\d{2}\b", " ", t)
    t = re.sub(r"\b\d+(st|nd|rd|th)\b", " ", t)
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(_STOP, " ", t)
    return re.sub(r"\s+", " ", t).strip()


def title_years(title):
    return set(re.findall(r"\b(20\d{2})\b", title or ""))


def series_key(title):
    """Identity of an event series, used for stable ids and recurrence."""
    return normalize_title(title) or clean(title).lower()


# ---------- dates ----------

MUSCAT = dt.timezone(dt.timedelta(hours=4))
_ISO_DT = re.compile(r"(\d{4})-?(\d{2})-?(\d{2})[T ](\d{2}):?(\d{2})(?::?(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$")


def _muscat_dt(value):
    """An ISO / iCal date-time as a naive Muscat wall-clock datetime. With an offset ("Z", "+00:00") it is converted
    to Muscat time (UTC+4, no daylight saving); without one, the time is kept as written."""
    m = _ISO_DT.match(str(value or "").strip())
    if not m:
        return None
    y, mo, d, h, mi, sec, off = m.groups()
    try:
        moment = dt.datetime(int(y), int(mo), int(d), int(h), int(mi), int(sec or 0))
    except ValueError:
        return None
    if off:
        sign = 1 if off[0] == "+" else -1
        tz = dt.timezone.utc if off == "Z" else dt.timezone(sign * dt.timedelta(hours=int(off[1:3]), minutes=int(off[-2:])))
        moment = moment.replace(tzinfo=tz).astimezone(MUSCAT).replace(tzinfo=None)
    return moment


def parse_time(value):
    """'2026-11-02 11:00:00' / '2026-10-28T18:00+04:00' / '20261028T140000Z' → Muscat 'HH:MM'
    ('…T140000Z' is 18:00 in Muscat). Midnight-only or date-only values → ''."""
    moment = _muscat_dt(value)
    if not moment or (moment.hour, moment.minute) == (0, 0):
        return ""
    return f"{moment:%H:%M}"


def parse_date(value, default_year=None):
    """Parse ISO dates/datetimes, iCal dates and '1 Jan' / 'Jan 1, 2026' style strings."""
    if not value:
        return None
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, dt.date):
        return value
    v = str(value).strip()
    moment = _muscat_dt(v)
    if moment and re.search(r"(Z|[+-]\d{2}:?\d{2})$", v):
        return moment.date()   # a UTC time late in the evening is already the next day in Muscat
    m = re.match(r"(\d{4})-?(\d{2})-?(\d{2})", v)
    if m:
        try:
            return dt.date(*map(int, m.groups()))
        except ValueError:
            return None
    for pattern, order in ((r"(\d{1,2})\s*([A-Za-z]{3,9})\.?,?\s*(\d{4})?", "dmy"),
                           (r"([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s*(\d{4})?", "mdy")):
        m = re.match(pattern, v)
        if m:
            a, b, year = m.groups()
            day, mon = (a, b) if order == "dmy" else (b, a)
            mon = MONTHS.get(mon[:3].lower())
            year = int(year) if year else default_year
            if mon and year:
                try:
                    return dt.date(year, mon, int(day))
                except ValueError:
                    return None
    return None


_DATE_IN_TEXT = re.compile(
    r"\b(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(20\d{2})\b"
    r"|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,?\s+(20\d{2})\b",
    re.I)
AR_MONTHS = {"يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "ابريل": 4, "إبريل": 4, "مايو": 5,
             "يونيو": 6, "يوليو": 7, "أغسطس": 8, "اغسطس": 8, "سبتمبر": 9, "أكتوبر": 10,
             "اكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12}
_AR_DATE = re.compile(r"(\d{1,2})(?:\s*[-–إلى]+\s*(\d{1,2}))?\s+(" + "|".join(AR_MONTHS) + r")\s+(20\d{2})")
_AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def find_dates(text):
    """All (start, end, position) date ranges written in free text (English or Arabic)."""
    text = (text or "").translate(_AR_DIGITS)
    found = []
    for m in _DATE_IN_TEXT.finditer(text):
        if m.group(3):
            d1, d2, mon, year = m.group(1), m.group(2), m.group(3), m.group(4)
        else:
            mon, d1, d2, year = m.group(5), m.group(6), m.group(7), m.group(8)
        found.append((int(year), MONTHS[mon[:3].lower()], d1, d2, m.start()))
    for m in _AR_DATE.finditer(text):
        found.append((int(m.group(4)), AR_MONTHS[m.group(3)], m.group(1), m.group(2), m.start()))
    out = []
    for year, mon, d1, d2, pos in sorted(found, key=lambda x: x[-1]):
        try:
            start = dt.date(year, mon, int(d1))
            end = dt.date(year, mon, int(d2)) if d2 and int(d2) > int(d1) else None
        except ValueError:
            continue
        out.append((start, end, pos))
    return out


def find_date_range(text):
    dates = find_dates(text)
    return (dates[0][0], dates[0][1]) if dates else (None, None)


# ---------- relevance & region ----------

def _hits(keywords, text):
    return sum(1 for kw in keywords if re.search(r"(?<!\w)" + re.escape(kw.lower()) + r"(?!\w)", text))


def score(event, rules):
    """Business relevance from keyword weights. Returns (score, label, category).

    Title keywords count twice; the description adds at most one hit per category,
    and only from that category's "core" words, so long marketing copy cannot turn
    a fisheries show into a tech event. Geography is NOT part of this score.
    """
    title = event.title.lower()
    body = f"{event.description} {event.organizer}".lower()
    total, best_cat, best = 0, "General", (0, 0)
    for category, spec in rules["categories"].items():
        t_hits = min(2, _hits(spec["keywords"], title))       # synonyms must not stack up
        b_hits = min(1, _hits(spec.get("core", spec["keywords"]), body))
        hits = 2 * t_hits + b_hits
        total += hits * spec["weight"]
        if hits and (2 * t_hits, hits) > best:
            best_cat, best = category, (2 * t_hits, hits)
    th = rules["thresholds"]
    label = "High" if total >= th["high"] else "Medium" if total >= th["medium"] else "Low"
    return total, label, best_cat


def region(event, regions):
    text = f"{event.city} {event.venue} {event.title}".lower()
    for name, places in regions.items():
        if _hits(places, text):
            return name
    return "Other" if (event.city or event.venue) else "Unknown"


def excluded(event, rules):
    """Rule-based filter for spam, and for always-on listings from aggregators/news only."""
    text = f"{event.title} {event.description}".lower()
    if _hits(rules.get("exclude_keywords", []), text):
        return True
    max_days = rules.get("max_duration_days")
    long_listing = max_days and (event.last_day - event.start).days > max_days
    return bool(long_listing and event.tier in ("C", "D"))


# ---------- de-duplication ----------

def same_event(a, b, ratio=0.82):
    """Candidates come from a ±14 day window; merging needs stronger evidence the further apart."""
    gap = abs((a.start - b.start).days)
    if gap > 14:
        return False
    ya, yb = title_years(a.title), title_years(b.title)
    if ya and yb and not ya & yb:
        return False                                   # "COMEX 2026" is not "COMEX 2027"
    na, nb = normalize_title(a.title), normalize_title(b.title)
    if not na or not nb:
        return False
    title_match = na == nb or (min(len(na), len(nb)) >= 4 and (na in nb or nb in na)) \
        or difflib.SequenceMatcher(None, na, nb).ratio() >= ratio
    if not title_match:
        return False
    if gap <= 3:
        return True
    same_place = a.venue and b.venue and normalize_title(a.venue) == normalize_title(b.venue)
    same_org = a.organizer and b.organizer and normalize_title(a.organizer) == normalize_title(b.organizer)
    return bool(na == nb and (same_place or same_org))


def merge(primary, other):
    """Fill empty fields of the higher-trust record from the other one."""
    for f in dataclasses.fields(Event):
        if f.name in ("sources", "tiers", "first_seen", "last_seen", "tier"):
            continue
        if not getattr(primary, f.name) and getattr(other, f.name):
            setattr(primary, f.name, getattr(other, f.name))
    primary.sources = sorted(set(primary.sources) | set(other.sources))
    primary.tiers = sorted(set(primary.tiers) | set(other.tiers))
    return primary


def dedupe(events):
    ordered = sorted(events, key=lambda e: (e.tier, e.kind != "event", e.start))
    kept = []
    for ev in ordered:
        ev.sources = ev.sources or [ev.source]
        ev.tiers = ev.tiers or [ev.tier]
        for k in kept:
            if same_event(k, ev):
                merge(k, ev)
                break
        else:
            kept.append(ev)
    return sorted(kept, key=lambda e: (e.start, e.title.lower()))


# ---------- confidence, identity, status ----------

def confidence(event):
    """Fixed points: best tier + corroboration by an independent source."""
    pts = max(TIER_POINTS.get(t, 0) for t in event.tiers or [event.tier])
    if len(set(event.sources)) > 1:
        pts += 25
    if event.venue:
        pts += 5
    if event.organizer:
        pts += 5
    if event.kind == "expected":
        pts = min(pts, 35)
    return min(pts, 100)


def assign_id(event, known):
    """Stable id: reuse the id of a known record of the same series within 120 days, so a
    rescheduled event keeps its id. A new edition (a year later) gets a new id.
    The record with the same start wins, then the nearest one — never simply the first in the series
    (for a monthly series that would shift every edition onto its neighbour's id)."""
    key = series_key(event.title)
    best = None
    for rid, rec in known.items():
        if rec["series"] != key or rec.get("kind", "event") != event.kind:
            continue
        gap = abs((dt.date.fromisoformat(rec["start"]) - event.start).days)
        if gap <= 120 and (best is None or gap < best[0]):
            best = (gap, rid, rec)
    if best:
        _, rid, rec = best
        if rec["start"] != event.start.isoformat() and event.kind == "event":
            event.previous_start = rec.get("previous_start") or rec["start"]
        return rid
    raw = f"{event.kind}|{key}|{event.start.isoformat()}"
    return hashlib.sha1(raw.encode()).hexdigest()[:12]


def status(event, today, publish_at, review_at):
    if event.status_hint.endswith("Cancelled"):
        return "Cancelled"
    if event.last_day < today:
        return "Past"
    if event.kind == "occasion":
        return "Occasion"
    if event.kind == "expected":
        return "Expected – confirm"
    if event.confidence < review_at:
        return "Lead – verify"
    if event.confidence < publish_at:
        return "Needs review"
    if event.previous_start or event.status_hint.endswith(("Postponed", "Rescheduled")):
        return "Rescheduled"
    if event.start <= today:
        return "Ongoing"
    return "Upcoming"


# ---------- recurrence ("COMEX existed in 2026 → watch for COMEX 2027") ----------

def expected_editions(history, current, today, horizon_days=400):
    """history: past records {series,title,start,end,venue,url,relevance}."""
    have = {series_key(e.title) for e in current if e.start >= today and e.kind == "event"}
    out = []
    for rec in sorted(history, key=lambda r: r["start"], reverse=True):
        start = dt.date.fromisoformat(rec["start"])
        if rec.get("relevance") == "Low" or rec["series"] in have:
            continue
        nxt = start + dt.timedelta(days=364)           # same weekday, one year later
        if not (today < nxt <= today + dt.timedelta(days=horizon_days)):
            continue
        dur = (dt.date.fromisoformat(rec["end"]) - start).days
        have.add(rec["series"])
        out.append(Event(title=re.sub(r"\b(20\d{2})\b", lambda m: str(int(m.group(1)) + 1), rec["title"]),
                         start=nxt, end=nxt + dt.timedelta(days=dur) if dur else None,
                         venue=rec.get("venue", ""), url=rec.get("url", ""), source="recurrence",
                         tier="D", kind="expected",
                         description=f"Predicted from the {start.year} edition ({rec['start']}). Confirm dates."))
    return out


# ---------- content planning ----------

def post_plan(event, plans):
    """Rule-based preparation and posting schedule; depends on relevance."""
    if event.kind != "event" or event.status_hint.endswith("Cancelled"):
        return {}
    plan = {}
    for name, step in (plans.get(event.relevance) or {}).items():
        anchor = event.last_day if step["from"] == "end" else event.start
        plan[name] = anchor + dt.timedelta(days=step["days"])
    return plan


def hashtags(event, rules, base):
    tags = list(base)
    tags += rules["categories"].get(event.category, {}).get("hashtags", [])
    words = re.sub(r"[^A-Za-z0-9 ]", " ", re.sub(r"\b(19|20)\d{2}\b", "", event.title)).split()
    if 1 <= len(words) <= 4:
        tags.append("#" + "".join(w.capitalize() if not w.isupper() else w for w in words))
    seen, out = set(), []
    for t in tags:
        if t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out
