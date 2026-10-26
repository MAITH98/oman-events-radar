# Oman Events — demo website

A React Router (framework mode) website that calls the public **Oman Events Radar API** and displays the events.

## Pages

| Route | API calls | Shows |
|---|---|---|
| `/` | `events.json`, `watchlist.json`, `news.json`, `changes.json` | Home: hero with search, source-logo loop, venue map (Go to…, layers, list, locate me) with its picture card, news showcase, charts, the automation (sources → radar → results, each with a (!) details popup), health gauges and the API card |
| `/search?q=` | `events.json`, `news.json` | Search results (opened only by searching; no query → home): events, news, venues and organisers as card grids, each event / news card with its picture; runs in the browser |
| `/media/<kind>-<id>.jpg`, `/media/logo-<site>.png` | the item's own web page / the source's site | Pictures, written once per daily build (see below) |
| `/calendar` | `events.json` | Post reminders popup (once per session), month grid + agenda of equal-height cards; search, view, relevance and category filters kept in the URL |
| `/events/:id` | `events.json` + `changes.json` (in parallel) | Hero card with the event's live picture, details (sources by name and logo, start/end time when published), content plan, hashtags, change history |
| `/changes` | `changes.json` | The change feed an ERP consumes (created / updated / rescheduled / cancelled / removed) |
| `/news` | `news.json` | Event stories from Omani newspapers (EN + AR) as a newspaper front page with each story's picture; duplicates folded ("Also in …") |

Navigation: **Home · Calendar · Changes · API**. A short ØER intro animation plays once per browser session
(skippable, never under reduced motion).

## Design system

### Style

**Minimalism + soft 3D (neumorphism / skeuomorphism) + glassmorphism.**

- **Minimal** — one idea per section, generous space, one accent colour per line, one filled (primary) action per view, no decoration without a job.
- **Glass** — every card is a translucent, blurred panel (`hud-panel`): 16 px backdrop blur, a hairline edge, a soft top sheen.
- **Soft 3D** — light comes from the top-left. Cards and controls are *raised* (highlight above-left, shadow below-right); fields, search and switch tracks are *pressed in*; the primary button has a physical highlight and presses in when clicked.
- **Light mode carries no glows** (no blurred halos, spotlights or radial light); dark mode keeps the logo's glass light.

| Surface (utility) | Used for |
|---|---|
| `hud-panel` | every card (dashboard, docs facts, tables, explorer, dropdown menus) |
| `neu-raised` | round buttons, chips, date blocks, docs prev/next, current docs page |
| `neu-inset` | inputs, selects, search, nav track, segmented tracks (keeps a ≥ 3:1 border) |
| `well` | recessed content: code blocks, embedded mini-maps, extracted event details, empty states |
| `btn-primary` | the one filled action: Search, Send request, Official event page, active nav/segment |

All tokens and utilities live in `app/app.css`.

### Typography

- **Font:** IBM Plex Sans Arabic for all text (Latin and Arabic), IBM Plex Mono for code — Google Fonts.
- **Scale** (fluid with `clamp()`, 320 → 1440 px; each step is one class that sets size, line height, tracking and weight):

| Class | Role | Size | Line height | Weight |
|---|---|---|---|---|
| `text-display` | Home hero title (uppercase) | 36 → 64 px | 1.05 | 300 |
| `text-h1` | Page titles | 28 → 40 px | 1.15 | 400 |
| `text-h2` | Section titles | 22 → 28 px | 1.25 | 400 |
| `text-h3` | Card titles | 17 px | 1.4 | 600 |
| `text-title` | Hero subline | 20 → 26 px | 1.35 | 300 |
| `text-lead` | Intro under a title | 17 px | 1.65 | 400 |
| body | Running text | 16 px | 1.65 | 400 |
| `text-sm` / `text-xs` | Meta, labels, captions | 14 / 12 px | — | 400–500 |
| `Eyebrow` | Small label above titles | 12 px, uppercase, 0.3em tracking (none in Arabic) | — | 500 |

- **Readability rules:** running text is held to a `measure` of 58ch (≈ 60–70 Latin characters per line; 44ch in Arabic, whose letters are narrower). Paragraphs stay within 4–6 lines. Measured on every page in English and Arabic: max 74 characters per line, max 5 lines per paragraph.
- **Alignment:** text is start-aligned (left in English, right in Arabic); only the intro and empty states are centred. Table headers align with their columns. Letter spacing is never applied to Arabic.

### Colour palette (sampled from the ØER logo)

| Token | Dark (default) | Light | Role |
|---|---|---|---|
| canvas | `#0a2224` | `#f1f6f5` | page background |
| surface | `#0f3133` | `#ffffff` | solid surfaces (glass uses it translucent) |
| raised | `#164245` | `#e5efed` | subtle fills |
| ink | `#eaf4f2` | `#0b2a2c` | text |
| muted | `#a6c3bf` | `#3e5d5e` | secondary text (≥ 5.9:1) |
| brand | `#f2a54a` radar amber | `#1a4a4c` logo teal | primary action |
| accent | `#f5b964` | `#975410` | links, highlights |
| ember | `#f68a74` | `#b03a26` | the red, tuned to the amber's brightness |
| ok | `#3cc178` | `#1e7a45` | online / success |
| control | `#5f918d` | `#6a8a87` | field borders (≥ 3:1) |

Every text pair meets WCAG 2.2 AA (≥ 4.5:1); control borders and chart marks ≥ 3:1.

### Grid & guides

- **Container:** max 1280 px (`max-w-7xl`), 16 px side margins; header, main and footer share it.
- **Grid:** 12 columns, 16 px gutters. The home dashboard uses only three track patterns so every gutter lines up row to row: KPIs 3·3·3·3 · map 8 | location 4 · venues 4 | next up 4 | sources 4 · news 8 | trends 4. Cards in a row share one height; "see more" links sit on the card's bottom edge.
- **Reading pages** (event, changes, news) use a centred 896 px column; docs use a 176 px side menu + content column.
- **Breakpoints:** `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Below `lg` cards stack in reading order; below `sm` every row of options becomes a dropdown (no sideways scrolling, verified at 320 and 390 px).

### Spacing system

4 px base unit. Steps in use: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 56 · 64**.

| Where | Spacing |
|---|---|
| Inside a card | 20 px padding; 16 px from card title to content |
| Between cards | 16 px |
| Between page sections | 32–40 px |
| Page header | eyebrow → 8 → H1 → 12 → lead |
| Home hero | header / body / footer zones, ≥ 48 px apart; body: title → 24 → subline → 48 → search |
| Touch targets | ≥ 44 × 44 px |

### Radii & elevation

Cards 20 px · controls 14 px · pills and round buttons fully rounded. Elevation is the raised shadow pair (`--neu-raised`, `--neu-raised-sm`) and the pressed pair (`--neu-inset`); the only other shadow is under the info dialog, which floats over a dimmed page.

### Motion & accessibility

Motion explains something (nav highlight sliding, radar sweep, the once-per-session logo intro) and stops completely under `prefers-reduced-motion`. EN + AR with full RTL; the logo never mirrors. Keyboard focus is always visible (2 px amber ring).

Components and their states are listed in [`docs/component-registry.md`](docs/component-registry.md).

## API documentation (`/docs`)

| Route | Content |
|---|---|
| `/docs` | Overview, quickstart, live "Try it" explorer, which integration fits |
| `/docs/endpoints` | All 7 endpoints (JSON, CSV, iCalendar) with response shapes and HTTP behaviour |
| `/docs/data-model` | Event fields, statuses, change entries, identity and versions |
| `/docs/examples` | curl, JavaScript, Python, PHP, React Router loader, change-feed consumer, Google Sheets, calendar subscriptions |
| `/docs/webhooks` | Payload, HMAC verification (Python, Node), Express receiver, delivery rules |
| `/docs/guides` | Best practices, error handling, versioning, FAQ |

Code samples are real files in `app/features/docs/examples/`, imported with `?raw`, so the page always shows exactly the code that was tested. Re-test them after changing the API:

```bash
cd app/features/docs/examples
bash quickstart.sh | head && node fetch-events.mjs && python3 fetch_events.py && php fetch_events.php
python3 consume_changes.py && rm radar_cursor.txt
```

## How it is published (static, GitHub Pages)

The site is **pre-rendered** — no server runs it. It is published at **https://maith98.github.io/oman-events-radar/**
together with the radar's API files, which keep their URLs (`events.json`, `changes.json`, …).

- **Daily build.** The radar's GitHub Action fetches the data, commits it, then builds this site with
  `RADAR_DATA_DIR` pointing at the files it has just written (`react-router.config.ts`: `ssr: false`, `prerender`),
  assembles it with the API files (`scripts/assemble-pages.sh`) and deploys it to Pages. Every page — including one
  page per event — is regenerated each morning, so the data is never more than a day old.
- **Search** is the one page computed in the browser (`clientLoader` in `routes/search.tsx`): it reads `events.json`
  and `news.json` from the same site.
- **Language and theme** are kept in the visitor's own browser (`localStorage`, `app/shared/preferences.ts`) — no
  cookie, nothing sent anywhere. Pages are pre-rendered in English/dark; a small `<head>` script applies a stored
  choice before the first paint, and React re-renders in that language right after loading.
- **The old team calendar** (the radar's single-page calendar) stays available at `/team/` and is linked in the footer.
- **Limits of a static host:** no custom response headers (GitHub Pages sets its own; no CSP or frame-ancestors),
  and an event that appears after the morning build has no page until the next build.

## Pictures (`/media/…`)

Event, news and search cards show the picture each item's own page publishes for link previews (Open Graph
`og:image`, then `twitter:image`, then `image_src`); source logos come from each source's own site. During the daily
build, `routes/media.$file.ts` fetches each one **once** and writes it as a file of the published site (they are
not committed to git; each build replaces them). An item without a usable picture gets a 1×1 placeholder, which the
components treat as "no picture" (`app/features/media/urls.ts`). Visitors never contact the third-party sites.

The fetch is a server-side read of third-party content, so it is locked down (`app/features/media/`, tests in `tests/media.test.mjs`):

- Only pages the radar already links to (looked up by **item id**, never a URL) and the known source sites (`sourceSites.ts`).
- http(s) on default ports only; no credentials in URLs; `localhost`, `.local`, `.internal` refused.
- Every host must resolve only to public addresses (private, loopback, link-local, cloud metadata, CGNAT, multicast,
  IPv4-mapped, 6to4 and NAT64 forms are blocked). The connection itself resolves through the same check, so a
  changing DNS answer cannot slip in between (no rebinding gap); every redirect is checked again (max 3).
- 7 s timeout per request and 8.5 s per picture overall (a slow site is skipped, never fatal); at most 1.5 MB of HTML
  and 4 MB per image, enforced while reading; at most six fetches at once.
- Raster images only (JPEG, PNG, WebP, GIF, AVIF, ICO for logos) — never SVG, which could carry script.

## How the API is called

- `app/features/events/api.ts` — the only place that reads the API. At build time it reads the radar's files from
  `RADAR_DATA_DIR` (or `https://maith98.github.io/oman-events-radar` when unset); in the browser (search) it reads them
  from the same site. Every response is validated and normalised before rendering, and only `http(s)` links are rendered.
- Route modules (`app/routes/*`) stay thin: loader → component → `ErrorBoundary`.

## Run

```bash
npm install
npm run dev          # http://localhost:5173/oman-events-radar/  (reads the live API)
npm test && npm run typecheck
npm run build        # pre-renders every page and picture into build/ (a few minutes: it fetches the pictures)
RADAR_DATA_DIR=../docs npm run pages   # assemble the Pages site (with the API files) in _site/oman-events-radar/
npm run preview      # http://127.0.0.1:4173/oman-events-radar/ — the site exactly as Pages serves it
```

`PAGES_BASE` changes the base path (default `/oman-events-radar/`).

API contract: [INTEGRATION.md](https://github.com/MAITH98/oman-events-radar/blob/main/docs/INTEGRATION.md).
