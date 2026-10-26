"""Daily run:  python -m radar [--config sources.json] [--offline] [--today YYYY-MM-DD]

FETCH → DISCOVER → NORMALISE → FILTER → DE-DUPLICATE → SCORE → VERIFY → DIFF → PUBLISH → NOTIFY

Every step is a fixed rule. Outputs land in docs/ (GitHub Pages) and data/.
"""

import argparse
import dataclasses
import datetime as dt
import json
import os
import sys
import urllib.parse

from . import adapters, export, model, news
from .fetch import Blocked, Fetcher, UnsafeURL

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
DATA = os.path.join(ROOT, "data")


def _load(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    return default


def _domain(url):
    host = urllib.parse.urlsplit(url or "").hostname or ""
    return host[4:] if host.startswith("www.") else host


def _event_from_record(rec):
    fields = {f.name for f in dataclasses.fields(model.Event)}
    ev = model.Event(**{k: v for k, v in rec.items() if k in fields and k not in ("start", "end")},
                     start=dt.date.fromisoformat(rec["start"]), end=dt.date.fromisoformat(rec["end"]))
    ev.tier = min(rec.get("tiers") or ["C"])
    ev.source = (rec.get("sources") or ["carried-over"])[0]
    return ev


def all_sources(cfg, discovered):
    """Configured sources + venue/organiser watch entries + auto-discovered event sites."""
    out = [dict(s) for s in cfg["sources"]]
    for group in ("venues", "organisers"):
        for item in cfg.get("watch", {}).get(group, []):
            for i, src in enumerate(item.get("sources", [])):
                out.append({"name": f"{group[:-1]}:{item['name']}" + (f"#{i + 1}" if i else ""),
                            # page_watch titles are heuristic: those results are leads (tier D) for review
                            "tier": "D" if src.get("type") == "page_watch" else "A",
                            "organizer": item["name"] if group == "organisers" else "",
                            "venue": item["name"] if group == "venues" else "", **src})
    for dom, info in sorted(discovered.items()):
        if info.get("status") == "ok":
            out.append({"name": f"site:{dom}", "type": "jsonld", "url": info["url"], "tier": "B",
                        "discovered_from": info.get("from", "")})
    return out


def discover(fetcher, events, sources, discovered, cfg, today):
    """One hop from known events: probe each new official website for schema.org Event data.
    A site is (re)checked at most once a week and at most `budget` sites per run."""
    dcfg = cfg.get("discovery", {})
    skip = set(dcfg.get("skip_domains", []))
    known = {_domain(s.get("url", "")) for s in sources}
    for ev in events:
        if ev.tier not in ("A", "B") and ev.region != "Oman":
            continue
        for url in (ev.url, ev.organizer_url):
            dom = _domain(url)
            if not dom or dom in skip or dom in known or any(dom.endswith("." + s) for s in skip):
                continue
            discovered.setdefault(dom, {"url": f"https://{urllib.parse.urlsplit(url).netloc}/",
                                        "from": ev.title, "first_seen": today.isoformat(), "status": "new"})
    due = [d for d, i in discovered.items()
           if i.get("status") != "blocked" and (not i.get("checked") or
                                                (today - dt.date.fromisoformat(i["checked"])).days >= 7)]
    for dom in sorted(due, key=lambda d: discovered[d].get("checked", ""))[: dcfg.get("budget", 15)]:
        info = discovered[dom]
        info["checked"] = today.isoformat()
        try:
            found = adapters.parse_jsonld(fetcher.get(info["url"]), f"site:{dom}", info["url"])
            info["status"] = "ok" if found else "no-feed"
            info["events"] = len(found)
            info.pop("error", None)
        except Blocked:
            info["status"] = "blocked"
        except (UnsafeURL, Exception) as exc:
            info["status"] = "error"
            info["error"] = f"{type(exc).__name__}"
            info["failures"] = info.get("failures", 0) + 1


def run(config_path, offline=False, today=None):
    today = today or dt.date.today()
    cfg = _load(config_path, None)
    rules = cfg["rules"]
    fetcher = Fetcher(min_delay=cfg.get("min_delay_seconds", 2))
    state = _load(os.path.join(DATA, "state.json"), {})
    known = state.get("records", {})
    health = state.get("sources", {})
    pages = state.get("pages", {})
    seq = state.get("sequence", 0)
    discovered = _load(os.path.join(DATA, "discovered.json"), {})
    stamp = dt.datetime.now(dt.timezone.utc)

    # ---- FETCH ----
    sources = all_sources(cfg, discovered)
    collected, leads, report = [], [], []
    for src in sources:
        if not src.get("enabled", True) or (offline and src["type"] != "csv"):
            continue
        h = health.setdefault(src["name"], {})
        try:
            kwargs = {"root": ROOT} if src["type"] == "csv" else {}
            if src["type"] == "wp_tribe":
                kwargs["today"] = today
            got = adapters.ADAPTERS[src["type"]](fetcher, src, **kwargs)
            err = ""
        except Blocked as exc:
            got, err = [], f"blocked by robots.txt ({exc})"
        except Exception as exc:
            got, err = [], f"{type(exc).__name__}: {str(exc)[:120]}"
        for ev in got:
            ev.source, ev.tier = src["name"], src.get("tier", "C")
        dated = [e for e in got if e.start]
        leads += [{"title": e.title, "url": e.url, "source": src["name"], "found": today.isoformat()}
                  for e in got if not e.start]
        # A source that errors, or suddenly returns nothing, is unhealthy: keep its previous events.
        unhealthy = bool(err) or (not dated and h.get("last_count", 0) >= 3)
        if unhealthy:
            h["failures"] = h.get("failures", 0) + 1
            carried = [_event_from_record(r) for r in known.values()
                       if src["name"] in r.get("sources", []) and r.get("kind") == "event"
                       and r.get("status") != "Removed"]
            collected += carried
            err = err or "returned 0 events (usually ≥3) – kept previous results"
        else:
            h.update(failures=0, last_count=len(dated), last_ok=today.isoformat())
            collected += dated
        if "_hash" in src:
            old = pages.get(src["name"])
            pages[src["name"]] = {"hash": src["_hash"],
                                  "changed": today.isoformat() if old and old.get("hash") != src["_hash"]
                                  else (old or {}).get("changed", "")}
        report.append((src["name"], len(dated), err))

    # ---- NEWS: Omani newspapers, each event story opened and read once ----
    news_state = _load(os.path.join(DATA, "news_state.json"), {})
    articles = []
    if not offline and cfg.get("news"):
        articles, news_events, news_report = news.collect(fetcher, cfg, news_state, today)
        collected += news_events
        report += [(name, n, err) for name, n, err in news_report]

    # ---- NORMALISE / FILTER ----
    back = today - dt.timedelta(days=cfg.get("keep_past_days", 730))
    fwd = today + dt.timedelta(days=cfg.get("look_ahead_days", 730))
    collected = [e for e in collected if back <= e.last_day and e.start <= fwd and not model.excluded(e, rules)]
    for ev in collected:
        ev.region = model.region(ev, cfg["regions"])

    # ---- DISCOVER (venues / organisers / official event sites, one hop) ----
    if not offline:
        discover(fetcher, collected, sources, discovered, cfg, today)

    # ---- RECURRENCE + OCCASIONS ----
    history = [r for r in known.values() if r.get("kind") == "event" and r["start"] < today.isoformat()]
    for e in collected:                     # past events seen in this run count as history too
        if e.kind == "event" and e.last_day < today and e.tier in ("A", "B"):
            history.append({"series": model.series_key(e.title), "title": e.title, "start": e.start.isoformat(),
                            "end": e.last_day.isoformat(), "venue": e.venue, "url": e.url,
                            "relevance": model.score(e, rules)[1]})
    collected += model.expected_editions(history, collected, today, cfg.get("expect_horizon_days", 400))
    for occ in cfg.get("occasions", []):
        for year in (today.year, today.year + 1):
            d = dt.date(year, occ["month"], occ["day"])
            if today - dt.timedelta(days=30) <= d <= fwd:
                collected.append(model.Event(title=occ["title"], start=d, source="occasions", tier="A",
                                             kind="occasion", city="Oman", description=occ.get("note", "")))

    # ---- DE-DUPLICATE / SCORE / VERIFY ----
    events = model.dedupe(collected)
    publish_at, review_at = cfg["confidence"]["publish"], cfg["confidence"]["review"]
    records, changes, seen_ids = [], [], set()
    occurred = stamp.isoformat(timespec="seconds")
    for ev in events:
        ev.score, ev.relevance, ev.category = model.score(ev, rules)
        if ev.kind == "occasion":
            ev.category, ev.relevance = "National occasion", "High"
        ev.region = ev.region or model.region(ev, cfg["regions"])
        ev.confidence = model.confidence(ev)
        ev.id = model.assign_id(ev, {k: v for k, v in known.items() if k not in seen_ids})
        if ev.id in seen_ids:                       # two events claimed the same id: keep both apart
            ev.id = ev.id + "-" + model.hashlib.sha1(ev.title.encode()).hexdigest()[:4]
        seen_ids.add(ev.id)
        prev = known.get(ev.id, {})
        ev.first_seen = prev.get("first_seen", today.isoformat())
        ev.last_seen = today.isoformat()
        st = model.status(ev, today, publish_at, review_at)
        plan = model.post_plan(ev, cfg["post_plans"]) if st in ("Upcoming", "Rescheduled", "Ongoing") else {}
        rec = export.record(ev, plan, model.hashtags(ev, rules, cfg["base_hashtags"]), st, prev.get("version", 0))
        fp = export.fingerprint(rec)
        if fp != prev.get("fingerprint"):
            rec["version"] += 1
            seq += 1
            kind = "event.created" if not prev else (
                "event.cancelled" if st == "Cancelled" else
                "event.rescheduled" if prev.get("start") != rec["start"] else "event.updated")
            changes.append(export.change(seq, kind, rec, occurred))
        rec["_fp"] = fp
        records.append(rec)

    # Tombstones: upcoming events that vanished although their sources were healthy. A record known only from
    # news stories is not tombstoned when its story leaves the feed (papers rotate stories; that is not a removal).
    for rid, prev in known.items():
        if rid in seen_ids or prev.get("kind") != "event":
            continue
        if prev.get("sources") and all(s.startswith("news:") for s in prev["sources"]) and prev.get("status") != "Removed":
            continue
        if prev.get("status") == "Removed":
            if (today - dt.date.fromisoformat(prev.get("removed_on", today.isoformat()))).days <= 30:
                records.append({"start_time": "", "end_time": ""} | {k: v for k, v in prev.items() if k != "series"}
                               | {"_fp": prev.get("fingerprint")})
            continue
        if prev["end"] >= today.isoformat():
            tomb = {k: v for k, v in prev.items() if k not in ("fingerprint", "series")}
            tomb.setdefault("schema_version", export.SCHEMA_VERSION)
            tomb.setdefault("start_time", "")
            tomb.setdefault("end_time", "")
            tomb.update(status="Removed", removed_on=today.isoformat(), version=prev.get("version", 0) + 1,
                        workflow={})
            seq += 1
            changes.append(export.change(seq, "event.removed", tomb, occurred))
            records.append(dict(tomb, _fp=None))
    records.sort(key=lambda r: (r["start"], r["title"].lower()))

    # ---- PUBLISH ----
    os.makedirs(DOCS, exist_ok=True)
    public = [{k: v for k, v in r.items() if not k.startswith("_") and k not in ("fingerprint", "series")}
              for r in records]
    steps = list(dict.fromkeys(s for p in cfg["post_plans"].values() for s in p))
    export.write_json(os.path.join(DOCS, "events.json"),
                      {"schema_version": export.SCHEMA_VERSION, "generated_at": occurred,
                       "count": len(public), "events": public})
    export.write_csv(os.path.join(DOCS, "events.csv"), [r for r in public if r["status"] != "Removed"], steps)
    export.write_ics(os.path.join(DOCS, "events.ics"), os.path.join(DOCS, "posts.ics"),
                     public, stamp.strftime("%Y%m%dT%H%M%SZ"))
    feed = _load(os.path.join(DOCS, "changes.json"), {"changes": []})["changes"]
    cutoff = (stamp - dt.timedelta(days=60)).isoformat()
    feed = [c for c in feed if c["occurred_at"] >= cutoff] + changes
    export.write_json(os.path.join(DOCS, "changes.json"),
                      {"schema_version": export.SCHEMA_VERSION, "latest_sequence": seq, "changes": feed})
    # one entry per lead (keyed by url, or title when there is none): kept leads, new leads, and review-queue items
    lead_key = lambda l: l.get("url") or l.get("title", "")
    review = {lead_key(x): x for x in ({"title": r["title"], "url": r["url"], "source": ", ".join(r["sources"]),
                                        "found": r["first_seen"], "start": r["start"], "status": r["status"]}
                                       for r in public if r["status"] in ("Lead – verify", "Needs review", "Expected – confirm"))}
    by_key = {}
    for l in _load(os.path.join(DOCS, "leads.json"), {"leads": []})["leads"] + leads:
        if "status" not in l:                       # review items are rebuilt from the records below
            by_key.setdefault(lead_key(l), l)
    lead_list = [l for k, l in by_key.items() if k not in review and l["found"] >= (today - dt.timedelta(days=45)).isoformat()]
    lead_list += list(review.values())
    export.write_json(os.path.join(DOCS, "leads.json"), {"generated_at": occurred, "leads": lead_list})
    watch = [{"entity": n, "type": "source", "events": c, "status": e or "ok",
              "page_changed": pages.get(n, {}).get("changed", "")} for n, c, e in report]
    watch += [{"entity": d, "type": "discovered site", "events": i.get("events", 0),
               "status": i.get("status"), "discovered_from": i.get("from", ""), "checked": i.get("checked", "")}
              for d, i in sorted(discovered.items())]
    export.write_json(os.path.join(DOCS, "watchlist.json"), {"generated_at": occurred, "entities": watch})

    if not offline:
        news.link_to_events(articles, public, model.same_event)
        news.write(os.path.join(DOCS, "news.json"), articles, occurred)

    # ---- NOTIFY (ERP webhook; the static changes.json feed is the fallback) ----
    if changes and not offline:
        try:
            if export.send_webhook(changes):
                print(f"webhook: delivered {len(changes)} changes")
        except Exception as exc:
            print(f"webhook: {exc} – ERP can still pull docs/changes.json")

    new_known = {}
    for r in records:
        full = {k: v for k, v in r.items() if not k.startswith("_") and k != "fingerprint"}
        new_known[r["id"]] = dict(full, series=model.series_key(r["title"]), fingerprint=r.get("_fp"))
    os.makedirs(DATA, exist_ok=True)
    export.write_json(os.path.join(DATA, "state.json"),
                      {"updated": today.isoformat(), "sequence": seq, "records": new_known,
                       "sources": health, "pages": pages})
    export.write_json(os.path.join(DATA, "discovered.json"), discovered)
    export.write_json(os.path.join(DATA, "news_state.json"), news_state)

    print(f"{'source':40} events  note")
    for name, count, err in report:
        print(f"{name[:40]:40} {count:6}  {err}")
    by = {}
    for r in public:
        by[r["status"]] = by.get(r["status"], 0) + 1
    print(f"\n{len(public)} records {by} · {len(changes)} changes · {len(lead_list)} leads · "
          f"{sum(1 for i in discovered.values() if i.get('status') == 'ok')} discovered sites with event data · "
          f"{len(articles)} news stories ({sum(1 for a in articles if a.get('event'))} with event details)")
    return public, report


def main(argv=None):
    p = argparse.ArgumentParser(prog="radar")
    p.add_argument("--config", default=os.path.join(ROOT, "sources.json"))
    p.add_argument("--offline", action="store_true", help="only read local CSV sources")
    p.add_argument("--today", type=dt.date.fromisoformat, help="pretend today is this date (testing)")
    args = p.parse_args(argv)
    _, report = run(args.config, args.offline, args.today)
    # Fail the scheduled job only if every source failed (likely a runner/network problem).
    return 0 if any(not err for _, _, err in report) else 1


if __name__ == "__main__":
    sys.exit(main())
