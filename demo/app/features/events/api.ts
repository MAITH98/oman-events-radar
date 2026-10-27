import { SOURCE_SITES } from "./sourceSites";
import type {
  ChangesResponse,
  NewsArticle,
  EventKind,
  EventStatus,
  RadarChange,
  RadarEvent,
  Relevance,
} from "./types";

// Public, read-only API published daily by the radar on GitHub Pages.
export const API_BASE = "https://maith98.github.io/oman-events-radar";
const TIMEOUT_MS = 10_000;

export class RadarApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

// Server-side cache of the radar's files. The radar refreshes once a day, so 5 minutes is safe; pages themselves are
// not cached (they depend on the visitor's preferences), so this is what keeps them fast and spares the upstream API.
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function getJson(path: string): Promise<unknown> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  // Concurrent requests share one in-flight fetch; a failure is never cached.
  const value = fetchJson(path);
  cache.set(path, { at: Date.now(), value });
  value.catch(() => {
    if (cache.get(path)?.value === value) cache.delete(path);
  });
  return value;
}

async function fetchJson(path: string): Promise<unknown> {
  // Static build (GitHub Action): read the files the radar has just written, so the site shows today's data even
  // before it is deployed. Never part of the browser bundle (import.meta.env.SSR is false there).
  if (import.meta.env.SSR && process.env.RADAR_DATA_DIR) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    try {
      return JSON.parse(await readFile(join(process.env.RADAR_DATA_DIR, path), "utf-8"));
    } catch {
      throw new RadarApiError(`${path} is missing or unreadable in RADAR_DATA_DIR.`);
    }
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new RadarApiError("The events service could not be reached.", 503);
  }
  if (!res.ok) {
    throw new RadarApiError(`The events service answered with ${res.status}.`);
  }
  try {
    return await res.json();
  } catch {
    throw new RadarApiError("The events service sent an unreadable response.");
  }
}

// ---- response validation: the API is external, so nothing is trusted as-is ----

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const RELEVANCE: Relevance[] = ["High", "Medium", "Low"];
const KINDS: EventKind[] = ["event", "expected", "occasion"];

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 30) : [];
}

function toEvent(raw: unknown): RadarEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 64);
  const start = str(r.start, 10);
  const end = str(r.end, 10) || start;
  if (!id || !ISO_DATE.test(start) || !ISO_DATE.test(end) || !str(r.title)) return null;

  const workflow: Record<string, string> = {};
  if (r.workflow && typeof r.workflow === "object") {
    for (const [k, v] of Object.entries(r.workflow as Record<string, unknown>)) {
      if (typeof v === "string" && ISO_DATE.test(v)) workflow[k] = v;
    }
  }

  return {
    id,
    version: typeof r.version === "number" ? r.version : 1,
    kind: KINDS.includes(r.kind as EventKind) ? (r.kind as EventKind) : "event",
    title: str(r.title, 300),
    start,
    end,
    previous_start: ISO_DATE.test(str(r.previous_start, 10)) ? str(r.previous_start, 10) : "",
    start_time: HH_MM.test(str(r.start_time, 5)) ? str(r.start_time, 5) : "",
    end_time: HH_MM.test(str(r.end_time, 5)) ? str(r.end_time, 5) : "",
    venue: str(r.venue, 200),
    city: str(r.city, 100),
    region: str(r.region, 40),
    organizer: str(r.organizer, 200),
    url: str(r.url, 500),
    description: str(r.description, 1200),
    ticket_price: str(r.ticket_price, 60),
    category: str(r.category, 60) || "General",
    relevance: RELEVANCE.includes(r.relevance as Relevance) ? (r.relevance as Relevance) : "Low",
    confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(100, r.confidence)) : 0,
    status: (str(r.status, 40) || "Upcoming") as EventStatus,
    sources: strList(r.sources),
    first_seen: str(r.first_seen, 10),
    workflow,
    hashtags: strList(r.hashtags),
  };
}

export async function fetchEvents() {
  const data = (await getJson("events.json")) as Record<string, unknown> | null;
  if (!data || !Array.isArray(data.events)) {
    throw new RadarApiError("The events list has an unexpected format.");
  }
  return {
    generatedAt: str(data.generated_at, 40),
    events: data.events.map(toEvent).filter((e): e is RadarEvent => e !== null),
  };
}

export async function fetchChanges(): Promise<ChangesResponse> {
  const data = (await getJson("changes.json")) as Record<string, unknown> | null;
  if (!data || !Array.isArray(data.changes)) {
    throw new RadarApiError("The change feed has an unexpected format.");
  }
  const changes: RadarChange[] = [];
  for (const raw of data.changes) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const ev = toEvent(c.event);
    if (typeof c.sequence !== "number" || !ev) continue;
    changes.push({
      sequence: c.sequence,
      type: str(c.type, 40) as RadarChange["type"],
      occurredAt: str(c.occurred_at, 40),
      eventId: str(c.event_id, 64),
      eventVersion: typeof c.event_version === "number" ? c.event_version : 1,
      title: ev.title,
      start: ev.start,
      status: ev.status,
    });
  }
  changes.sort((a, b) => b.sequence - a.sequence);
  return {
    latestSequence: typeof data.latest_sequence === "number" ? data.latest_sequence : 0,
    changes,
  };
}

/** Event stories from Omani newspapers (news.json). Optional: failures resolve to an empty list. */
export async function fetchNews(): Promise<{ generatedAt: string; articles: NewsArticle[] }> {
  try {
    const data = (await getJson("news.json")) as Record<string, unknown> | null;
    if (!data || !Array.isArray(data.articles)) return { generatedAt: "", articles: [] };
    const articles: NewsArticle[] = [];
    for (const raw of data.articles) {
      if (!raw || typeof raw !== "object") continue;
      const a = raw as Record<string, unknown>;
      const url = safeUrl(str(a.url, 600));
      const published = str(a.published, 10);
      if (!url || !str(a.title) || !ISO_DATE.test(published)) continue;
      const e = a.event && typeof a.event === "object" ? (a.event as Record<string, unknown>) : null;
      const start = e ? str(e.start, 10) : "";
      articles.push({
        id: str(a.id, 40),
        title: str(a.title, 300),
        url,
        source: str(a.source, 80),
        lang: a.lang === "ar" ? "ar" : "en",
        published,
        summary: str(a.summary, 400),
        event: e && ISO_DATE.test(start)
          ? {
              name: str(e.name, 200),
              start,
              end: ISO_DATE.test(str(e.end, 10)) ? str(e.end, 10) : start,
              venue: str(e.venue, 120),
              organizer: str(e.organizer, 120),
              matchedEventId: str(e.matched_event_id, 40),
            }
          : null,
        image: safeUrl(str(a.image, 600)) ?? "",
        also: (Array.isArray(a.also) ? a.also : []).flatMap((x) => {
          const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
          const href = o ? safeUrl(str(o.url, 600)) : null;
          return o && href && str(o.title) ? [{ source: str(o.source, 80), url: href, title: str(o.title, 300) }] : [];
        }).slice(0, 5),
      });
    }
    return { generatedAt: str(data.generated_at, 40), articles };
  } catch {
    return { generatedAt: "", articles: [] };
  }
}

export type SourceKind = "venue" | "organiser" | "site" | "news" | "aggregator" | "team";
export type SourceState = "online" | "degraded" | "offline";

export interface SourceRow {
  name: string;
  kind: SourceKind;
  state: SourceState;
  events: number;
  /** The source's website (for its logo), when it has one. */
  site?: string;
}

export interface SourceHealth {
  ok: number;
  total: number;
  sources: SourceRow[];
}

// Readable names for the radar's internal source ids (anything unknown keeps a tidied id).
const SOURCE_NAMES: Record<string, string> = {
  "team-seed-2026": "Team event sheet",
  community: "Community submissions",
  "allevents-muscat": "AllEvents · Muscat",
  "eventbrite-muscat": "Eventbrite · Muscat",
  timesofoman: "Times of Oman",
  "observer-local": "Oman Observer",
  "observer-business": "Oman Observer",
  "observer-lifestyle": "Oman Observer",
  alroya: "Alroya",
  omandaily: "Oman Daily",
};

const STATE_RANK: Record<SourceState, number> = { online: 0, degraded: 1, offline: 2 };

/** "news:observer-local" → { kind: news, name: Oman Observer }; "organiser:X#2" → organiser X. */
export function describeSource(entity: string): { kind: SourceKind; name: string; site?: string } {
  const [prefix, rest] = entity.includes(":") ? [entity.slice(0, entity.indexOf(":")), entity.slice(entity.indexOf(":") + 1)] : ["", entity];
  const id = rest.replace(/#\d+$/, "").trim().slice(0, 80);
  const kind: SourceKind =
    prefix === "venue" ? "venue" : prefix === "organiser" ? "organiser" : prefix === "site" ? "site" : prefix === "news" ? "news"
      : /team|community/.test(id) ? "team" : "aggregator";
  return { kind, name: SOURCE_NAMES[id] ?? id, site: SOURCE_SITES[id] };
}

/**
 * Source health from watchlist.json. Optional data: failures resolve to null instead of throwing.
 * Raw error texts are reduced to three states and never shown.
 */
export async function fetchSourceHealth(): Promise<SourceHealth | null> {
  try {
    const data = (await getJson("watchlist.json")) as Record<string, unknown> | null;
    if (!data || !Array.isArray(data.entities)) return null;
    const raw = data.entities.filter(
      (e): e is Record<string, unknown> => !!e && typeof e === "object" && (e as Record<string, unknown>).type === "source",
    );
    const merged = new Map<string, SourceRow>();
    for (const r of raw) {
      const status = str(r.status, 200);
      const state: SourceState = status === "ok" ? "online" : /kept previous|returned 0/i.test(status) ? "degraded" : "offline";
      const { kind, name, site } = describeSource(str(r.entity, 200));
      const events = typeof r.events === "number" && r.events >= 0 ? r.events : 0;
      const key = `${kind}|${name}`;
      const prev = merged.get(key);
      merged.set(key, prev
        ? { ...prev, events: prev.events + events, state: STATE_RANK[state] > STATE_RANK[prev.state] ? state : prev.state }
        : { name, kind, state, events, site });
    }
    return {
      ok: raw.filter((s) => s.status === "ok").length,
      total: raw.length,
      sources: [...merged.values()].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.events - a.events),
    };
  } catch {
    return null;
  }
}

/** Only http(s) links from the API are ever rendered. */
export function safeUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}
