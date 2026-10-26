import { knownSourceSite } from "../events/sourceSites";
import { extractIconCandidates } from "./extractPreview";
import { IMAGE_TYPES } from "./previewImage.server";
import { byteCache } from "./byteCache.server";
import { fetchPublic, type FetchedBody } from "./publicFetch.server";

/*
 * Source logos, fetched live from the source's own site (same hardened fetcher as preview images).
 * Only domains in SOURCE_SITES are ever requested; nothing is written to disk — the logo bytes are kept in memory
 * (byteCache). Icons: raster formats plus .ico; SVG is never served from this origin.
 */
const ICON_TYPES = new Set([...IMAGE_TYPES, "image/x-icon", "image/vnd.microsoft.icon"]);
const LIMIT = 600_000;
const TIMEOUT_MS = 6000;
const cache = byteCache<FetchedBody>();

async function findLogo(site: string): Promise<FetchedBody | null> {
  const page = await fetchPublic(`https://${site}/`, { maxBytes: 1_500_000, timeoutMs: TIMEOUT_MS, accept: (t) => t === "text/html" || t === "application/xhtml+xml" });
  const candidates = page ? extractIconCandidates(new TextDecoder().decode(page.body), page.url.href) : [`https://${site}/favicon.ico`];
  for (const url of candidates.slice(0, 4)) {
    const img = await fetchPublic(url, { maxBytes: LIMIT, timeoutMs: TIMEOUT_MS, accept: (t) => ICON_TYPES.has(t) });
    if (img && img.body.byteLength > 0) return img;
  }
  return null;
}

/** The logo bytes for a known source site, or null. */
export function sourceLogo(domain: string | null) {
  const site = knownSourceSite(domain);
  if (!site) return Promise.resolve(null);
  return cache(site, () => findLogo(site));
}
