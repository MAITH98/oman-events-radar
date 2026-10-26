import type { Config } from "@react-router/dev/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Static site for GitHub Pages (https://maith98.github.io/oman-events-radar/). Every page is pre-rendered with the
 * radar's data at build time; the daily GitHub Action rebuilds it right after the fetch (RADAR_DATA_DIR = the
 * radar's docs/ folder, so it uses the files just written). Search runs in the browser (routes/search.tsx).
 * Pictures are pre-rendered too: one file per event, news story and source logo (routes/media.$file.ts).
 */
const API = "https://maith98.github.io/oman-events-radar";
const BASE = process.env.PAGES_BASE ?? "/oman-events-radar/";

async function radarJson(file: string): Promise<Record<string, unknown>> {
  const dir = process.env.RADAR_DATA_DIR;
  if (dir) return JSON.parse(await readFile(join(dir, file), "utf-8"));
  const res = await fetch(`${API}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

const ids = (list: unknown, key = "id") =>
  (Array.isArray(list) ? list : []).map((x) => String((x as Record<string, unknown>)[key] ?? "")).filter((id) => /^[\w-]{1,40}$/.test(id));

export default {
  ssr: false,
  basename: BASE,
  routeDiscovery: { mode: "initial" },
  prerender: {
    concurrency: 4,
    paths: async () => {
      const [events, news] = await Promise.all([radarJson("events.json"), radarJson("news.json")]);
      const { SOURCE_SITES } = await import("./app/features/events/sourceSites");
      const eventIds = ids(events.events);
      const newsIds = ids(news.articles);
      const sites = [...new Set(Object.values(SOURCE_SITES as Record<string, string>))];
      return [
        "/", "/calendar", "/changes", "/news", "/credits", "/search",
        "/docs", "/docs/endpoints", "/docs/data-model", "/docs/examples", "/docs/webhooks", "/docs/guides",
        ...eventIds.map((id) => `/events/${id}`),
        ...eventIds.map((id) => `/media/event-${id}.jpg`),
        ...newsIds.map((id) => `/media/news-${id}.jpg`),
        ...sites.map((s) => `/media/logo-${s}.png`),
      ];
    },
  },
} satisfies Config;
