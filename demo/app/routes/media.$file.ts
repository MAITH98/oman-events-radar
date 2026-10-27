import type { Route } from "./+types/media.$file";
import { previewImage } from "../features/media/previewImage.server";
import { sourceLogo } from "../features/media/logoImage.server";

/*
 * Build-time only: pre-rendered into one static file per picture (see react-router.config.ts). The bytes come from
 * the hardened server fetcher (public addresses only, checked on every connection and redirect, raster types only,
 * size and time limits) — exactly what the live site used to serve per request, now fetched once a day.
 *   media/event-<id>.jpg · media/news-<id>.jpg · media/logo-<site>.png
 * Nothing found → a 1×1 transparent PNG (a 404 would stop the static build).
 */
const PLACEHOLDER = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (c) => c.charCodeAt(0));

const DEADLINE_MS = 8_500; // under the build's 10 s per request: a slow source site is skipped, never fatal

async function find(file: string) {
  const m = /^(event|news)-([\w-]{1,40})\.jpg$|^logo-([a-z0-9.-]{1,100})\.png$/i.exec(file);
  if (!m) return null;
  return m[3] ? sourceLogo(m[3]) : previewImage(m[1] as "event" | "news", m[2]);
}

export async function loader({ params }: Route.LoaderArgs) {
  const img = await Promise.race([
    find(params.file ?? "").catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), DEADLINE_MS)),
  ]);
  if (!img) console.warn(`[media] no picture for ${params.file} (placeholder used)`); // shows in the build log
  return new Response((img ? img.body : PLACEHOLDER) as BodyInit, { headers: { "Content-Type": img?.contentType ?? "image/png" } });
}
