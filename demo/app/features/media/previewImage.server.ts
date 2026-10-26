import { fetchEvents, fetchNews, safeUrl } from "../events/api";
import { extractPreviewImage } from "./extractPreview";
import { byteCache } from "./byteCache.server";
import { fetchPublic, type FetchedBody } from "./publicFetch.server";

/*
 * Live preview images for search results: the picture a page publishes for link previews (Open Graph / Twitter
 * card), fetched from the result's own page at request time. Only pages the radar already links to are read — the
 * caller passes an item id, never a URL. Nothing is written to disk; the image bytes are kept in memory (byteCache)
 * so repeat views don't re-read the page or re-download the picture.
 */

export type PreviewKind = "event" | "news";

const PAGE_LIMIT = 1_500_000; // bytes of HTML read to find the <head>
const IMAGE_LIMIT = 4_000_000;
const TIMEOUT_MS = 7000;
// Raster formats only: SVG can carry script, and the bytes are served from this site's origin.
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const cache = byteCache<FetchedBody & { source: string }>();

async function pageUrlFor(kind: PreviewKind, id: string): Promise<string | null> {
  if (kind === "event") {
    const { events } = await fetchEvents();
    return safeUrl(events.find((e) => e.id === id)?.url ?? "") ?? null;
  }
  const { articles } = await fetchNews();
  return safeUrl(articles.find((a) => a.id === id)?.url ?? "") ?? null;
}

async function resolveImageUrl(kind: PreviewKind, id: string): Promise<string | null> {
  const page = await pageUrlFor(kind, id);
  if (!page) return null;
  const html = await fetchPublic(page, { maxBytes: PAGE_LIMIT, timeoutMs: TIMEOUT_MS, accept: (t) => t === "text/html" || t === "application/xhtml+xml" });
  if (!html) return null;
  return extractPreviewImage(new TextDecoder().decode(html.body), html.url.href);
}

/** The preview image bytes for a radar item, fetched live (then cached); null when the page has none or anything is refused. */
export function previewImage(kind: PreviewKind, id: string) {
  return cache(`${kind}:${id}`, async () => {
    const imageUrl = await resolveImageUrl(kind, id);
    if (!imageUrl) return null;
    const img = await fetchPublic(imageUrl, { maxBytes: IMAGE_LIMIT, timeoutMs: TIMEOUT_MS, accept: (t) => IMAGE_TYPES.has(t) });
    return img ? { ...img, source: new URL(imageUrl).hostname } : null;
  });
}
