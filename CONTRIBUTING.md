# Contributing

Thank you for helping Oman's event calendar stay complete.

## Ground rules

1. **Public information only.** Official event pages, venue calendars, organiser websites. Never personal phone numbers, personal emails or private events.
2. **Rules, not AI.** Every change must stay deterministic: parsers, keyword lists, fixed scores. No calls to language models or ML services.
3. **Be polite to websites.** New sources must allow crawling in `robots.txt`. Do not add sources that require logging in, solving captchas or bypassing paywalls. Social networks (LinkedIn, Instagram, X, Facebook) are not crawled.
4. **Every rule change needs a test** in `tests/test_rules.py`.

## Adding an event

Add a row to `community/submissions.csv` (columns match the team sheet). Minimum: `EVENT`, `START DATE`, `WEBSITE`. Or just `WEBSITE` if that page publishes schema.org `Event` data — the radar reads the rest.

## Adding a source

In `sources.json`:

```json
{ "name": "my-venue", "type": "jsonld", "tier": "A", "url": "https://venue.example/events" }
```

| type | When to use |
|---|---|
| `ical` | The site offers an `.ics` / `?ical=1` calendar |
| `wp_tribe` | WordPress site using "The Events Calendar" (`/wp-json/tribe/events/v1/events`) |
| `jsonld` | Pages with schema.org `Event` markup; add `link_pattern` + `max_details` to follow detail pages from a listing |
| `rss_leads` | News feeds; `must_include` keeps only items containing event words |
| `page_watch` | Official pages with no machine-readable data — dates in the page text become leads for review |
| `csv` | Local files |

Tiers: `A` venue/organiser/government, `B` official event site, `C` aggregator, `D` news/page-watch.

Venues and organisers go under `watch.venues` / `watch.organisers` with one or more sources each.

## Changing rules

Keyword lists, weights, thresholds, workflow offsets and occasions all live in `sources.json`. Run the tests and a local run before opening a pull request:

```bash
python3 -m unittest discover -s tests
python3 -m radar
```

## Reporting wrong information

Open an issue with the event link and what is wrong (date, venue, cancelled, duplicate). Fixes go into `community/submissions.csv` or the source rules.
