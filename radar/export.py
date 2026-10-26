"""Writers for every output the radar publishes, plus the ERP change contract."""

import csv
import datetime as dt
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request

from .fetch import USER_AGENT, check_public

SCHEMA_VERSION = "1.0"

SHEET_COLUMNS = [
    # Same order as the team's "2026 EVENTS" Google Sheet, so rows paste straight in.
    "START DATE", "END DATE", "EVENT", "AVENUE", "ORGANIZED BY", "ORGANIZED FOR", "WEBSITE",
    "GENERAL INFO", "TICKET DEADLINE", "TICKET PRICE", "RELEVANCE", "EVENT STATUS",
    "CEO ATTENDANCE RECOMMENDATION",
]
EXTRA_COLUMNS = ["CATEGORY", "REGION", "CONFIDENCE", "SUGGESTED HASHTAGS", "SOURCES", "FIRST SEEN",
                 "PREVIOUS START", "ID"]


def record(ev, plan, tags, status, version):
    return {
        "schema_version": SCHEMA_VERSION, "id": ev.id, "version": version, "kind": ev.kind,
        "title": ev.title, "start": ev.start.isoformat(), "end": ev.last_day.isoformat(),
        "start_time": ev.start_time, "end_time": ev.end_time,
        "previous_start": ev.previous_start,
        "venue": ev.venue, "city": ev.city, "region": ev.region,
        "organizer": ev.organizer, "organizer_url": ev.organizer_url, "audience": ev.audience,
        "url": ev.url, "description": ev.description,
        "ticket_deadline": ev.ticket_deadline, "ticket_price": ev.ticket_price,
        "category": ev.category, "relevance": ev.relevance, "score": ev.score,
        "confidence": ev.confidence, "status": status,
        "sources": ev.sources, "tiers": ev.tiers,
        "first_seen": ev.first_seen, "last_seen": ev.last_seen,
        "workflow": {k: v.isoformat() for k, v in plan.items()}, "hashtags": tags,
    }


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)


def _fmt(iso):
    return dt.date.fromisoformat(iso).strftime("%-d %b %Y")


_FORMULA_START = ("=", "+", "-", "@", "\t", "\r")


def _cell(v):
    """A text cell that a spreadsheet will not run as a formula ("=IMPORTXML(…)" from a scraped title)."""
    v = "" if v is None else str(v)
    return "'" + v if v.startswith(_FORMULA_START) else v


def write_csv(path, records, workflow_steps):
    steps = [s.upper().replace("_", " ") for s in workflow_steps]
    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(SHEET_COLUMNS + EXTRA_COLUMNS[:2] + steps + EXTRA_COLUMNS[2:])
        for r in records:
            w.writerow([_cell(c) for c in [
                _fmt(r["start"]), _fmt(r["end"]), r["title"],
                ", ".join(x for x in (r["venue"], r["city"]) if x), r["organizer"], r["audience"], r["url"],
                r["description"], r["ticket_deadline"], r["ticket_price"], r["relevance"], r["status"], "",
                r["category"], r["region"],
                *[r["workflow"].get(s, "") for s in workflow_steps],
                r["confidence"], " ".join(r["hashtags"]), ", ".join(r["sources"]), r["first_seen"],
                r["previous_start"], r["id"],
            ]])


def _ics_text(v):
    v = (v or "").replace("\r\n", "\n").replace("\r", "\n")
    return v.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _ics_url(v):
    """A URL property value: control characters (CR/LF would start new properties) removed."""
    return "".join(ch for ch in (v or "") if ch >= " " and ch != "\x7f")


_VTIMEZONE = ["BEGIN:VTIMEZONE", "TZID:Asia/Muscat", "BEGIN:STANDARD", "DTSTART:19700101T000000",
              "TZOFFSETFROM:+0400", "TZOFFSETTO:+0400", "TZNAME:+04", "END:STANDARD", "END:VTIMEZONE"]


def _when(start, end, start_time="", end_time=""):
    """DTSTART/DTEND lines: all-day dates, or Muscat local times when the source published a start time."""
    if not start_time:
        return [f"DTSTART;VALUE=DATE:{start:%Y%m%d}", f"DTEND;VALUE=DATE:{end + dt.timedelta(days=1):%Y%m%d}"]
    t0 = dt.datetime.combine(start, dt.time.fromisoformat(start_time))
    t1 = dt.datetime.combine(end, dt.time.fromisoformat(end_time)) if end_time else None
    if t1 is None or t1 <= t0:
        t1 = t0 + dt.timedelta(hours=1)
    return [f"DTSTART;TZID=Asia/Muscat:{t0:%Y%m%dT%H%M%S}", f"DTEND;TZID=Asia/Muscat:{t1:%Y%m%dT%H%M%S}"]


def _fold(line):
    out, b = [], line.encode()
    while len(b) > 74:
        cut = 74
        while (b[cut] & 0xC0) == 0x80:  # do not split a UTF-8 character
            cut -= 1
        out.append(b[:cut].decode())
        b = b[cut:]
    out.append(b.decode())
    return "\r\n ".join(out)


def _ics(name, items, stamp):
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Oman Events Radar//EN", "CALSCALE:GREGORIAN",
             "METHOD:PUBLISH", f"X-WR-CALNAME:{name}", "X-WR-TIMEZONE:Asia/Muscat",
             "REFRESH-INTERVAL;VALUE=DURATION:PT12H"]
    # items: (uid, start, end, summary, description, url, location, cancelled[, start_time, end_time])
    items = [tuple(i) + ("", "")[: max(0, 10 - len(i))] for i in items]
    if any(i[8] for i in items):
        lines += _VTIMEZONE
    for uid, start, end, summary, desc, url, loc, cancelled, start_time, end_time in items:
        lines += ["BEGIN:VEVENT", f"UID:{uid}@oman-events-radar", f"DTSTAMP:{stamp}",
                  *_when(start, end, start_time, end_time),
                  f"SUMMARY:{_ics_text(summary)}", f"DESCRIPTION:{_ics_text(desc)}"]
        if cancelled:
            lines.append("STATUS:CANCELLED")
        if _ics_url(url):
            lines.append(f"URL:{_ics_url(url)}")
        if loc:
            lines.append(f"LOCATION:{_ics_text(loc)}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"


LABELS = {"brief": "📝 Content brief due", "announce": "📣 Announce", "design_lock": "🎨 Design & copy lock",
          "reminder": "⏰ Reminder", "live": "🔴 Live coverage", "recap": "📸 Recap", "occasion": "🇴🇲 Occasion post"}
CALENDAR_STATUSES = {"Upcoming", "Ongoing", "Rescheduled", "Cancelled", "Occasion"}


def write_ics(events_path, posts_path, records, stamp):
    ev_items, post_items = [], []
    for r in records:
        if r["status"] not in CALENDAR_STATUSES:
            continue
        loc = ", ".join(x for x in (r["venue"], r["city"]) if x)
        desc = (f"{r['description']}\n\nRelevance: {r['relevance']} · {r['category']} · confidence "
                f"{r['confidence']}\nSources: {', '.join(r['sources'])}")
        start, end = dt.date.fromisoformat(r["start"]), dt.date.fromisoformat(r["end"])
        cancelled = r["status"] == "Cancelled"
        ev_items.append((r["id"], start, end, r["title"], desc, r["url"], loc, cancelled,
                         r.get("start_time", ""), r.get("end_time", "")))
        steps = dict(r["workflow"]) if r["kind"] != "occasion" else {"occasion": r["start"]}
        if cancelled:
            continue
        for kind, day in steps.items():
            d = dt.date.fromisoformat(day)
            post_items.append((f"{r['id']}-{kind}", d, d, f"{LABELS.get(kind, kind)}: {r['title']}",
                               f"Event: {_fmt(r['start'])} – {_fmt(r['end'])}\n{r['url']}\n\n"
                               f"Hashtags: {' '.join(r['hashtags'])}", r["url"], loc, False, "", ""))
    with open(events_path, "w", encoding="utf-8") as fh:
        fh.write(_ics("Oman Events Radar", ev_items, stamp))
    with open(posts_path, "w", encoding="utf-8") as fh:
        fh.write(_ics("Oman Events – Post Plan", post_items, stamp))


# ---------- change tracking (ERP contract) ----------

FINGERPRINT_KEYS = ("title", "start", "end", "venue", "url", "status", "relevance", "ticket_price", "organizer",
                    "start_time", "end_time")


def fingerprint(r):
    # .get: records stored before a key existed count as "" (so adding start/end times bumps only timed events)
    return hashlib.sha1(json.dumps([r.get(k, "") for k in FINGERPRINT_KEYS], ensure_ascii=False).encode()).hexdigest()


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """The webhook never follows a redirect: it would re-send the signed payload to a host nobody approved."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, f"webhook redirect to {newurl} refused", headers, fp)


def change(seq, kind, rec, occurred_at):
    """One entry of the change feed. idempotency_key = event id + version + type."""
    return {
        "schema_version": SCHEMA_VERSION, "sequence": seq, "type": kind, "occurred_at": occurred_at,
        "event_id": rec["id"], "event_version": rec["version"],
        "idempotency_key": f"{rec['id']}:{rec['version']}:{kind}", "event": rec,
    }


def send_webhook(entries, attempts=3):
    """POST change entries to RADAR_WEBHOOK_URL, signed with HMAC-SHA256 (RADAR_WEBHOOK_SECRET)."""
    url, secret = os.environ.get("RADAR_WEBHOOK_URL"), os.environ.get("RADAR_WEBHOOK_SECRET")
    if not url or not entries:
        return None
    if not url.startswith("https://"):
        raise ValueError("RADAR_WEBHOOK_URL must use https")
    check_public(url)
    body = json.dumps({"schema_version": SCHEMA_VERSION, "changes": entries}, ensure_ascii=False).encode()
    ts = str(int(time.time()))
    headers = {"Content-Type": "application/json", "User-Agent": USER_AGENT, "X-Radar-Timestamp": ts}
    if secret:
        sig = hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
        headers["X-Radar-Signature"] = f"sha256={sig}"
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.build_opener(_NoRedirect()).open(req, timeout=30) as resp:
                if 200 <= resp.status < 300:
                    return True
                last = f"HTTP {resp.status}"
        except Exception as exc:
            last = exc
        if attempt < attempts - 1:
            time.sleep(2 ** attempt * 5)
    raise RuntimeError(f"webhook failed after {attempts} attempts: {last}")
