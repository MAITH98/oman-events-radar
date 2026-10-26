# Component registry

Design language: **Minimalism + soft 3D (neumorphism/skeuomorphism) + glassmorphism** — glass cards (`hud-panel`),
raised controls (`neu-raised`), pressed-in fields (`neu-inset`), recessed content (`well`), one filled action (`btn-primary`);
no glows in light mode. Full spec (type scale, palette, grid, spacing): README → "Design system". References: two Pinterest motion pieces (pill segmented tabs with a sliding
highlight; word-by-word blur-in type; floating prompt-style search bar).

Palette (sampled from the ØER logo, 2026-10-26): **deep teal** `#0a2224`–`#2f6e6e` · **glass mint** `#cfe6e3` ·
**radar amber** `#f2a54a` · **ember red** `#f68a74` (tuned to the amber's brightness band; `#b03a26` in light theme).
Semantic tokens live in `app/app.css`; text pairs checked ≥ 4.5:1 on canvas, surface and raised in both themes,
control borders and chart marks ≥ 3:1. Chart colours: `#ad6618` (light), `#e9a04a` (dark). Dark is the default theme.
Type: **IBM Plex Sans Arabic** for both scripts (its Latin glyphs cover English).

All components respect **prefers-reduced-motion** (still content, no movement) and work in **LTR and RTL**.

## Shared UI — `app/shared/ui`

| Component | Status | Purpose | Variants / props | Accessibility | Source |
|---|---|---|---|---|---|
| `PillNav` | approved | Main navigation | items, label | ≥ sm: links in a pill with sliding highlight, `aria-current`; < sm: full-width menu button (`aria-expanded`, `aria-controls`), Esc / outside press closes, focus returns | project + `motion` (layout animation) |
| `Segmented` | approved | 2–3 option switch (map area, 2.5D / 2D) | label, value, options | `radiogroup` / `radio` + `aria-checked`, 36 px+ targets | project + `motion` |
| `SearchPill` | approved | Hero search (GET `?q=`) with live suggestions | action, label, placeholder, button, suggestions | focus shown as a deeper press-in (no coloured ring on fields), labelled input, 44 px targets | project |
| `InfoPopup` | approved | "!" button opening an iOS-style alert | label, title, body, close | native modal `<dialog>`: focus kept inside, Esc closes, focus returns to the button, backdrop click closes | project + `motion` |
| `RotatingWord` | approved | One word cycling through options | words | full list once for screen readers; animated word `aria-hidden` | wraps React Bits **RotatingText** |
| `HeroBackdrop` | approved | Soft palette colour field behind the hero | — | `aria-hidden`, never covers text, no motion | project (CSS gradients) |
| `RadarMark` / `LogoMark` | new | ØER emblem (ring, real Oman outline, beam from Muscat) and header logo | `sweep`, `rings` | `aria-hidden`; brand name is real text; sweep stops under reduced motion | `features/twin/components/RadarMark.tsx` — owned by the twin feature because it draws its geography |
| `IntroSplash` | new | Opening animation, once per session: large centred ØER draws itself (ring with leading dot → Oman, beam, Muscat → E → R → amber light, ping, caption), then fades to the page (~3.5 s) | — | "Skip intro" button; never shown under reduced motion; head gate script hides it before paint on repeat visits; CSS-only timeline so the page is revealed even if JS fails | `features/twin/components/IntroSplash.tsx` + "Intro" section of `app/app.css`; animation logic adapted from the ØER motion study, no code reused |
| Map card (`TwinMap` + `PlaceSpotlight`) | changed | One connected card: the 2.5D map of Oman (simplemaps governorate shapes, calibrated; orange dots; levels of detail with zoom; zoom / fit / locate-me controls; drop a pin; a "go to" governorate/city picker) with a Venues / Events switch and a List toggle; beside it the chosen venue's or event's live picture and details. Replaces the separate Venue map, Selected location, Venues, Next up and Event sources panels | — | pins/dots are buttons (Enter/Space, `aria-pressed`); the List is a disclosure (`aria-expanded`); floats over the map from sm up, sits under it on phones; picture falls back to the place's mini map | `features/twin/components/TwinMap.tsx`, `PlaceSpotlight.tsx`, `TwinDashboard.tsx` |
| `AutomationCanvas` | new | Home automation from lg up (refs: node-graph automation UIs): one sources card → the radar logo → one results card, joined by glowing wires aimed at each card row; no backdrop | inputs, steps, outputs, active, onSelect, controls | wires decorative and mirrored in RTL; cards are real HTML with logical insets | `features/twin/components/AutomationCanvas.tsx` |
| `AutomationFlow` + bento (`DataGathering`) | new | Home automation for general users, full width: canvas from lg, stacked cards below | inputs (with sources), steps, outputs | only one layout is displayed at a time | `features/twin/components/AutomationFlow.tsx` |
| `InputsCard`, `OutputsCard`, `ProcessLogo` | new | The automation's three parts, as small static cards (no click): a card of source logos per type; a card per result; the radar logo. The only controls are the hero's round (!) `InfoPopup`s with the details (each type's sources by name, each result's live number, the steps) | see props | item lists are decorative (`aria-hidden`); each popup is the accessible version; `fr` rows let the canvas aim wires | `features/twin/components/FlowParts.tsx` |
| `logos.ts` (`trimLogo`, `logoSize`, `useTrimmedLogos`) | new | Shared logo normalising: trims a logo's own margin, sizes logos to equal visual area; used by `LogoLoop` and `InputsCard` | sites | runs after hydration (canvas) | `features/twin/logos.ts` |
| `LogoLoop` | new | Endless strip of source logos under the hero in a card like the rest of Home (edges fade with a mask; in dark theme, dark wordmarks turn a light tone, coloured badges keep their colours); each logo trimmed of its own margin and sized to equal visual area, one fixed gap; blank or failed logos drop out | sources | names in `sr-only` + tooltip; second copy `aria-hidden`; pauses on hover/focus; still and wrapped under reduced motion | `features/twin/components/LogoLoop.tsx` |
| `PostReminders` | new | Calendar: "Posts to prepare" popup (hero popup style; days as chips, each post one of Home's item cards; English titles aligned with the page via `bdi`, wrapping to 2 lines) — every content-plan step due in the next 14 days, grouped by day | events, today | opens by itself once per session (`InfoPopup autoOpenOnce`), reopened from its labelled button; focus starts on the close button | `features/events/components/PostReminders.tsx` |
| `MapList` | new | The list inside the map card (venues or upcoming events) with its own mini search and filter (All · Confirmed · In review · High relevance for events) | id, layer, places, events, selection, handlers | search uses the site-wide matching; filter is a native dropdown (no sideways row); polite live count "n of total"; narrows the list only — the map keeps every pin; resets when the layer changes | `features/twin/components/MapList.tsx` |
| `SourceLogo` | new | A source's logo, live from its own site via `/media/logo` (allowlisted domains only), on a white tile | name, site | decorative (`aria-hidden`, name shown beside it); initials when there is no site, the fetch fails, or the logo is blank (pixel check — e.g. an all-white icon) | `features/twin/components/SourceLogo.tsx` |
| `NewsShowcase` | new | Home "Latest event news": auto-playing feature accordion (numbered stories + large card with the story's live picture and headline) — ref. Shareframe "orchestration layer" riff | articles (top 5) | real tablist (←/→/↑/↓, Home/End, RTL-aware); advances every 6 s with a progress line; pauses on hover and keyboard focus; still under reduced motion; scrim keeps overlaid text ≥ 4.5:1 | `features/events/components/NewsShowcase.tsx` |
| `ApiPromoCard` | new | Dismissible "Build on the radar" call to action (replaces "What you can build") — ref. "making dismissing things more fun" riff | className, onGone | ✕ is a named 44 px button; card swirls into an amber–teal vortex (fade only under reduced motion); focus moves to the section heading; remembered per session; Deliver widens into the freed slot | `features/twin/components/ApiPromoCard.tsx` |
| `SourceCredits` | changed | The `/credits` page (opened from the footer's Credits button): hero-style header card, a glass card per source type with live logos and domains, and "Built with" cards (map, pictures, type, software) | sources | real `<h1>`/`<h2>`/`<h3>`; names direction-isolated (`<bdi>`) | `features/events/components/SourceCredits.tsx`, `routes/credits.tsx` |
| `SiteFooter` | new | Footer bar mirroring the header: logo + brand · page links · owner profiles as round icon buttons | — (profiles from `shared/site.ts`; an empty URL hides its button) | icon buttons have names that say "opens in a new tab"; 44 × 44 px; `rel="me noopener noreferrer"` | `shell/SiteFooter.tsx` (app shell) |
| `ResultCard` | new | Search result card: live preview image (or engraved kind icon), kind, title (2 lines), details, "via site" | result | whole card is one link (external news opens a new tab, announced); image is decorative (`alt=""`) next to the real title; icon fallback when a page has no image or it fails before hydration | `features/events/components/ResultCard.tsx` |
| `SuggestInput` | new | Search field with live suggestions (events open; venues / organisers search) — hero and calendar search | name, defaultValue, suggestions, labels | WAI-ARIA combobox + listbox: `aria-expanded`, `aria-activedescendant`, ↑/↓/Enter/Esc, IME-safe, polite result count; matching ignores case, accents and Arabic letter variants (`shared/search.ts`, shared with the calendar filter) | `shared/ui/SuggestInput.tsx`, data from `features/events/suggestions.ts` |
| `PageHeader` / `Eyebrow` | updated | The one page header, in Home's language: a hero-style card (`HeroBackdrop`, glass edge, 2rem radius) with eyebrow → H1 → lead across the card's full width; page actions at its end edge | eyebrow, title, lead, children | H1 per page; actions wrap below on phones | `shared/ui/PageHeader.tsx` |
| `Panel` | moved | Home's titled card (title + chip), now shared: Home map, Calendar agenda, Changes list; `sub` may be a live status | title, sub, hideTitle | hidden titles stay real `h2`s | `shared/ui/Panel.tsx` (was `features/twin/components/Hud.tsx`) |
| `EventCard` | updated | Event card as Home's item card (surface, glass edge, soft raise), date in a raised tile | event | stretched link; heading is the name | `features/events/components/EventCard.tsx` |
| Event page (`routes/event.tsx`) | updated | Hero-style header card (facts, CTA \| the event's picture, whole), then Home `Panel`s: details (sources by name with logos) \| content plan; hashtags \| change history; empty states fill their card as a well | — | one H1; links named | `routes/event.tsx` |
| `InfoPopup` `wide` | updated | Roomier dialog (40rem) for list content — the calendar's post reminders | wide | as InfoPopup | `shared/ui/InfoPopup.tsx` |
| Item card style | convention | Cards inside a Home card (automation items, event/news/search results, credits groups, docs boxes) use the light item style — `rounded-2xl border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)]` — never a nested `hud-panel` | — | — | — |
| `NewsFront` | new | News page as a newspaper front page inside one of Home's cards: masthead (title, Muscat date, story count) over a double rule; lead story large with its picture; 5 compact side stories (small picture beside headline); the rest in ruled 4/2/1 columns. Stories keep their language (`lang` + `bdi`) but align with the page; found events show in a well; stories without a picture run text-only (lead keeps the radar) | articles, today | headlines are links to the source (new tab, announced); pictures decorative; below-the-fold pictures lazy | `features/events/components/NewsFront.tsx` (replaces `NewsCard`) |
| `StoryImage` | new | A news story's or event's live picture (/media/preview, `kind` + `id`) with the engraved-radar fallback; `whole` shows logos/banners uncropped over a blurred fill; `onMissing` lets a layout drop the slot. Used by Home's news showcase, `NewsFront` and the event page | kind, id, lazy, whole, fallbackInset, onMissing | decorative (`alt=""`) | `features/events/components/StoryImage.tsx` |
| `MonthGrid` | new | Calendar month view | month, events, today, prev/next hrefs | `ol` of days with full date + count in `sr-only`; phones show dots (agenda below is the accessible list) | `features/events/components/MonthGrid.tsx` |
| `DataGathering` | new | Home "API strengths": collect → verify → deliver, gauges, possibilities | events, health, news stats, latest sequence | all numbers live from the API; gauges show the value as text | `features/twin/components/DataGathering.tsx` |
| `hud-panel` (utility) | approved | The one card surface | — | 1 px border, surface colour, 20 px radius | `app/app.css` |

## React Bits — `app/shared/ui/reactbits`

Copied unmodified from the official registry (`https://reactbits.dev/r/<Name>-TS-TW.json`), each file headed with its
source and licence. Licence: **MIT + Commons Clause** (David Haz) — use inside this app is allowed, including
commercially; the components must **not** be sold or redistributed on their own. Only components actually used are kept.

| Component | Dependency | Used by |
|---|---|---|
| RotatingText | `motion` | RotatingWord |

Considered and **not** used: **Aurora** (WebGL background) — in testing its canvas painted an opaque wash over the hero
text in both themes (AA failure) and added GPU cost, so `HeroBackdrop` uses CSS gradients instead. gsap-based
components (SplitText, ScrollReveal, TextType, …) were skipped to keep a single animation dependency.

## Dependency

`motion` ^12 (MIT, motiondivision) — no install scripts, `npm audit`: 0 vulnerabilities at install.

## Responsive behaviour

Verified on every page at 320 × 700, 390 × 800 (portrait), 667 × 375 and 844 × 390 (phones in landscape), 768 × 1024 and
1280 × 800: no horizontal overflow. Type is fluid (`--text-display`, `--text-title` use `clamp()`); the hero height
follows its content (never `100vh`), so landscape phones keep the search field on screen.
