import type { RadarEvent } from "../events/types";
import type { Datum } from "./components/Charts";

const LIVE = new Set(["Upcoming", "Ongoing", "Rescheduled"]);

/** Confirmed, not-yet-finished events (occasions and review items excluded). */
export function liveEvents(events: RadarEvent[]) {
  return events.filter((e) => e.kind === "event" && LIVE.has(e.status));
}

const MAPPABLE = new Set(["Upcoming", "Ongoing", "Rescheduled", "Needs review", "Lead – verify"]);

/** Everything still ahead with a real date: confirmed events plus those waiting for review. */
export function upcomingIncludingReview(events: RadarEvent[]) {
  return events.filter((e) => e.kind === "event" && MAPPABLE.has(e.status));
}

export function daysUntil(iso: string, todayIso: string) {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function monthCounts(events: RadarEvent[], todayIso: string, locale = "en-GB", months = 6): Datum[] {
  const [y, m] = todayIso.split("-").map(Number);
  const out: Datum[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({
      label: d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }).toUpperCase(),
      value: events.filter((e) => e.start.slice(0, 7) === key).length,
    });
  }
  return out;
}

export function categoryCounts(events: RadarEvent[], top = 6): Datum[] {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
  return rest ? [...head, { label: "Other", value: rest }] : head;
}

export function todayInMuscat() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
}
