import type { RadarEvent } from "./types";

// Years 1900–2199 only: Date.UTC reads years 0–99 as 1900–1999, which would shift the whole grid.
const MONTH = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;

/** `?month=YYYY-MM`, falling back to the month of `todayIso` (Muscat) for anything else. */
export function readMonth(params: URLSearchParams, todayIso: string): string {
  const m = params.get("month") ?? "";
  return MONTH.test(m) ? m : todayIso.slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export interface CalendarDay {
  iso: string;
  day: number;
  events: RadarEvent[];
}

/**
 * Weeks of the month, Sunday first (the Omani working week). `null` pads the first and last week.
 * A multi-day event appears on every day it runs inside the month.
 */
export function monthGrid(month: string, events: RadarEvent[]): (CalendarDay | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (CalendarDay | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d, events: events.filter((e) => e.start <= iso && iso <= e.end) });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Short weekday names, Sunday first, in the reader's locale. */
export function weekdayNames(locale: string): string[] {
  // 2026-10-04 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2026, 9, 4 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }),
  );
}
