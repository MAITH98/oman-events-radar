import { normalizeForSearch } from "../../shared/search";
import type { RadarEvent, Relevance } from "./types";

// "all" first: the calendar opens on every record; the other views narrow it down.
export const VIEWS = {
  all: "All",
  calendar: "Team calendar",
  review: "Review queue",
  expected: "Expected next editions",
  occasion: "National occasions",
} as const;
export type View = keyof typeof VIEWS;

const CALENDAR = new Set(["Upcoming", "Ongoing", "Rescheduled", "Cancelled", "Occasion"]);
const REVIEW = new Set(["Needs review", "Lead – verify"]);

export interface EventFilters {
  q: string;
  relevance: Relevance | "";
  category: string;
  view: View;
}

export function readFilters(params: URLSearchParams): EventFilters {
  const view = params.get("view") ?? "all";
  const relevance = params.get("relevance") ?? "";
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    relevance: (["High", "Medium", "Low"].includes(relevance) ? relevance : "") as EventFilters["relevance"],
    category: (params.get("category") ?? "").slice(0, 60),
    view: (view in VIEWS ? view : "all") as View,
  };
}

export function filterEvents(events: RadarEvent[], f: EventFilters): RadarEvent[] {
  const q = normalizeForSearch(f.q);
  return events.filter((e) => {
    if (f.relevance && e.relevance !== f.relevance) return false;
    if (f.category && e.category !== f.category) return false;
    if (f.view === "calendar" && !CALENDAR.has(e.status)) return false;
    if (f.view === "review" && !REVIEW.has(e.status)) return false;
    if (f.view === "expected" && e.kind !== "expected") return false;
    if (f.view === "occasion" && e.kind !== "occasion") return false;
    if (!q) return true;
    // same normalisation as the suggestions (case, accents, Arabic letter variants); every word must match
    const hay = normalizeForSearch([e.title, e.venue, e.city, e.organizer].join(" "));
    return q.split(" ").every((word) => hay.includes(word));
  });
}

export function groupByMonth(events: RadarEvent[], locale = "en-GB"): { month: string; events: RadarEvent[] }[] {
  const groups: { month: string; events: RadarEvent[] }[] = [];
  for (const e of events) {
    const month = formatMonth(e.start, locale);
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }
  return groups;
}

export function categoriesOf(events: RadarEvent[]): string[] {
  return [...new Set(events.map((e) => e.category))].sort();
}

// Dates are calendar days in Muscat; format them in UTC so the server and browser agree.
function parts(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDay(iso: string, locale = "en-GB"): string {
  return parts(iso).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatMonth(iso: string, locale = "en-GB"): string {
  return parts(iso).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatRange(start: string, end: string, locale = "en-GB"): string {
  return start === end ? formatDay(start, locale) : `${formatDay(start, locale)} – ${formatDay(end, locale)}`;
}

/** "1 – 4 February 2027", used where the year matters (detail pages). */
export function formatLongRange(start: string, end: string, locale = "en-GB"): string {
  const long = (iso: string) =>
    parts(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  if (start === end) return long(start);
  const [s, e] = [parts(start), parts(end)];
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    return `${s.getUTCDate()} – ${long(end)}`;
  }
  return `${long(start)} – ${long(end)}`;
}
