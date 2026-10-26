import { matchRank } from "../../shared/search";
import { formatDay, formatRange } from "./filters";
import type { NewsArticle, RadarEvent } from "./types";
import { safeUrl } from "./api";

export type ResultKind = "event" | "news" | "venue" | "organiser";

export interface SearchResult {
  key: string;
  kind: ResultKind;
  title: string;
  meta: string;
  href: string;
  external: boolean;
  /** Site the result (and its preview image) comes from, shown as "via …". */
  host?: string;
  /** Live preview image source: /media/preview?kind=…&id=… */
  preview?: { kind: "event" | "news"; id: string };
  lang?: "en" | "ar";
  rank: number;
  order: number;
}

const host = (url: string) => {
  const safe = safeUrl(url);
  return safe ? new URL(safe).hostname.replace(/^www\./, "") : undefined;
};

/**
 * Everything the radar knows that matches `q` — same matching as the search suggestions (shared/search.ts):
 * events (title, then venue / organiser / category), news stories (title, summary, event found), venues and organisers.
 * Grouped by kind, best match first; upcoming events before past ones.
 */
export function searchAll(
  q: string,
  events: RadarEvent[],
  news: NewsArticle[],
  today: string,
  locale: string,
  countLabel: (n: number) => string,
  categoryLabel: (c: string) => string = (c) => c,
): Record<ResultKind, SearchResult[]> {
  const out: Record<ResultKind, SearchResult[]> = { event: [], news: [], venue: [], organiser: [] };
  const venues = new Map<string, number>();
  const organisers = new Map<string, number>();

  for (const e of events) {
    if (e.status === "Removed") continue;
    if (e.venue) venues.set(e.venue, (venues.get(e.venue) ?? 0) + 1);
    if (e.organizer) organisers.set(e.organizer, (organisers.get(e.organizer) ?? 0) + 1);
    const rank = matchRank(e.title, q, [e.venue, e.city, e.organizer, e.category, categoryLabel(e.category)].join(" "));
    if (rank === null) continue;
    const day = Date.parse(e.start) / 864e5;
    out.event.push({
      key: `e:${e.id}`,
      kind: "event",
      title: e.title,
      meta: [formatRange(e.start, e.end, locale), e.venue || e.city].filter(Boolean).join(" · "),
      href: `/events/${e.id}`,
      external: false,
      host: host(e.url),
      preview: e.url ? { kind: "event", id: e.id } : undefined,
      rank,
      order: e.end < today ? 1e9 - day : day,
    });
  }

  for (const a of news) {
    const rank = matchRank(a.title, q, [a.summary, a.event?.name, a.event?.venue, a.source].join(" "));
    if (rank === null) continue;
    out.news.push({
      key: `n:${a.id}`,
      kind: "news",
      title: a.title,
      meta: `${a.source} · ${formatDay(a.published, locale)}`,
      href: a.url,
      external: true,
      host: host(a.url),
      preview: { kind: "news", id: a.id },
      lang: a.lang,
      rank,
      order: -Date.parse(a.published) / 864e5, // newest first
    });
  }

  for (const [kind, map] of [["venue", venues], ["organiser", organisers]] as const) {
    for (const [name, n] of map) {
      const rank = matchRank(name, q);
      if (rank === null) continue;
      out[kind].push({
        key: `${kind}:${name}`,
        kind,
        title: name,
        meta: countLabel(n),
        href: `/calendar?q=${encodeURIComponent(name)}`,
        external: false,
        rank,
        order: -n,
      });
    }
  }

  for (const list of Object.values(out)) list.sort((a, b) => a.rank - b.rank || a.order - b.order || a.title.localeCompare(b.title));
  return out;
}
