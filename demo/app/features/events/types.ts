// Contract of the Oman Events Radar public API (schema_version 1.0).
// See https://github.com/MAITH98/oman-events-radar/blob/main/docs/INTEGRATION.md

export type EventStatus =
  | "Upcoming"
  | "Ongoing"
  | "Rescheduled"
  | "Cancelled"
  | "Needs review"
  | "Lead – verify"
  | "Expected – confirm"
  | "Occasion"
  | "Past"
  | "Removed";

export type Relevance = "High" | "Medium" | "Low";
export type EventKind = "event" | "expected" | "occasion";

export interface RadarEvent {
  id: string;
  version: number;
  kind: EventKind;
  title: string;
  start: string; // ISO date, Asia/Muscat calendar day
  end: string; // ISO date, inclusive
  previous_start: string;
  /** "HH:MM" Muscat time when the source publishes one, else "" (all-day / unknown) */
  start_time: string;
  end_time: string;
  venue: string;
  city: string;
  region: string;
  organizer: string;
  url: string;
  description: string;
  ticket_price: string;
  category: string;
  relevance: Relevance;
  confidence: number;
  status: EventStatus;
  sources: string[];
  first_seen: string;
  workflow: Record<string, string>;
  hashtags: string[];
}

export interface EventsResponse {
  generatedAt: string;
  events: RadarEvent[];
}

export interface NewsEvent {
  name: string;
  start: string;
  end: string;
  venue: string;
  organizer: string;
  matchedEventId: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  lang: "en" | "ar";
  published: string;
  summary: string;
  event: NewsEvent | null;
  /** other papers' stories about the same event (the radar folds duplicates into the newest story) */
  also: { source: string; url: string; title: string }[];
}

export type ChangeType =
  | "event.created"
  | "event.updated"
  | "event.rescheduled"
  | "event.cancelled"
  | "event.removed";

export interface RadarChange {
  sequence: number;
  type: ChangeType;
  occurredAt: string;
  eventId: string;
  eventVersion: number;
  title: string;
  start: string;
  status: EventStatus;
}

export interface ChangesResponse {
  latestSequence: number;
  changes: RadarChange[];
}
