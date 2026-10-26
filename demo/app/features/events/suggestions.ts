import type { Suggestion } from "../../shared/ui/SuggestInput";
import { formatRange } from "./filters";
import type { RadarEvent } from "./types";

const HIDDEN = new Set(["Removed"]);

/**
 * Search suggestions from the radar's events: each event (opens it), each venue and each organiser (searches for it).
 * Upcoming events come before past ones; venues and organisers show how many events they have.
 */
export function buildSuggestions(
  events: RadarEvent[],
  today: string,
  locale: string,
  countLabel: (n: number) => string,
  /** The category in the reader's language, so e.g. Arabic readers can find English-titled events by «صحة». */
  categoryLabel: (category: string) => string = (c) => c,
): Suggestion[] {
  const out: Suggestion[] = [];
  const venues = new Map<string, number>();
  const organisers = new Map<string, number>();

  for (const e of events) {
    if (HIDDEN.has(e.status)) continue;
    const past = e.end < today;
    out.push({
      id: `e:${e.id}`,
      kind: "event",
      label: e.title,
      meta: [formatRange(e.start, e.end, locale), e.venue || e.city].filter(Boolean).join(" · "),
      keywords: [e.venue, e.city, e.organizer, e.category, categoryLabel(e.category)].join(" "),
      href: `/events/${e.id}`,
      // upcoming first (soonest first), then past (most recent first)
      order: past ? 1e9 - Date.parse(e.start) / 864e5 : Date.parse(e.start) / 864e5,
    });
    if (e.venue) venues.set(e.venue, (venues.get(e.venue) ?? 0) + 1);
    if (e.organizer) organisers.set(e.organizer, (organisers.get(e.organizer) ?? 0) + 1);
  }

  for (const [name, n] of venues) out.push({ id: `v:${name}`, kind: "venue", label: name, meta: countLabel(n), order: -n });
  for (const [name, n] of organisers) out.push({ id: `o:${name}`, kind: "organiser", label: name, meta: countLabel(n), order: -n });
  return out;
}
