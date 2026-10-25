# Oman Events Radar

An open, **rule-based** (no AI) radar of business, technology and startup events in Oman — refreshed every day so teams can plan their posts weeks ahead instead of discovering events the day before.

**Live calendar:** `https://maith98.github.io/oman-events-radar/` · **Subscribe:** `events.ics` (events) and `posts.ics` (content workflow)

## What it does

```
FETCH → DISCOVER → NORMALISE → FILTER → DE-DUPLICATE → SCORE → VERIFY → DIFF → PUBLISH → NOTIFY
```

| Step | Rule (always deterministic) |
|---|---|
| Fetch | Venue calendars (OCEC), organiser sites (CONNECT, Arabian Research Bureau/OITE, Al Nimr, Oman Expo, MTCIT), official event sites, aggregators (allevents, Eventbrite), Omani news RSS (EN + AR), the team seed list and community submissions |
| Discover | Every official website seen on an event or organiser is probed once a week for schema.org `Event` data and becomes a source automatically — one hop only, never a crawl of the whole web |
| Filter | Spam keyword blocklist; always-on aggregator listings longer than 45 days are dropped |
| De-duplicate | Same core title + start within 3 days, or within 14 days *and* same venue/organiser; different years in the titles never merge |
| Score | Keyword weights per category (title counts double, description only adds "core" words). Geography is a separate `region` field (Oman / GCC / Other) |
| Verify | Trust tiers A (venue/organiser/government) 70 · B (official event site, maintainer-approved) 60 · C (aggregator) 40 · D (news, page-watch, prediction) 25; +25 when an independent source agrees. ≥ 60 → team calendar, 40–59 → review queue, < 40 → lead |
| Recurrence | A past High/Medium event with no announced next edition creates an *Expected – confirm* entry 364 days later |
| Workflow | High: brief T-21 · announce T-14 · design lock T-7 · reminder T-3 · live T · recap T+1. Medium: brief T-10 · announce T-7 · reminder T-2. Low: calendar only |
| Diff | Stable event ids (a rescheduled event keeps its id), versioned change feed, tombstones instead of silent deletion |

Politeness and safety: `robots.txt` and crawl-delay are honoured on every request (Google News search and Meetup search disallow crawlers, so they are not used); only public `http(s)` addresses are fetched (SSRF guard, re-checked on redirects); responses are capped at 5 MB. LinkedIn, Instagram and X are **not** scraped — hashtags are used as keyword filters on permitted sources and as suggested hashtags for posts.

## Outputs (`docs/`, served by GitHub Pages)

| File | For |
|---|---|
| `index.html` | Team calendar: filters, review queue, expected editions, copy-hashtags |
| `events.csv` | Same columns as the team's events sheet, plus workflow dates, region, confidence |
| `events.ics` / `posts.ics` | Subscribe in Google Calendar / Outlook |
| `events.json` | Full records (schema below) |
| `changes.json` | Change feed for systems such as an ERP (see [`docs/INTEGRATION.md`](docs/INTEGRATION.md)) |
| `leads.json` | Undated announcements and items waiting for review |
| `watchlist.json` | Health of every source, venue, organiser and discovered site |

## Add an event

- **Easiest:** open an issue with the *Add an event* form, or comment the link on our LinkedIn post — a maintainer adds it.
- **Pull request:** add a row to [`community/submissions.csv`](community/submissions.csv). A row with only the `WEBSITE` column is enough when that page publishes schema.org event data.

Submissions are leads until a maintainer merges them. Only public information — no personal phone numbers or emails.

## Add a source, venue or organiser

Edit [`sources.json`](sources.json): `sources` for feeds, `watch.venues` / `watch.organisers` for places and organisers to follow. Supported types: `ical`, `wp_tribe`, `jsonld`, `rss_leads`, `page_watch`, `csv`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Run it

```bash
python3 -m radar                 # full run (Python 3.10+, no dependencies)
python3 -m radar --offline       # only local CSV files
python3 -m unittest discover -s tests
```

The GitHub Action in `.github/workflows/daily.yml` runs every day at 07:00 Muscat time and commits the refreshed files.

## Licence

MIT — see [LICENSE](LICENSE). Event facts belong to their organisers; we link to the official page for every event.
