/** Pure HTML parsing for link-preview images (no network); shared by the server fetcher and its tests. */

/** First preview-image URL declared in a page's HTML (og:image → twitter:image → image_src), absolute, http(s) only. */
export function extractPreviewImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 300_000);
  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const attr = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  const value = (m: RegExpExecArray | null) => (m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "");
  const find = (keys: string[]) => {
    for (const key of keys) {
      for (const tag of metas) {
        const k = value(attr(tag, "property")) || value(attr(tag, "name"));
        if (k.toLowerCase() === key) {
          const c = value(attr(tag, "content"));
          if (c) return c;
        }
      }
    }
    return "";
  };
  let found = find(["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
  if (!found) {
    const link = /<link\b[^>]*\brel\s*=\s*["']?image_src["']?[^>]*>/i.exec(head);
    if (link) found = value(attr(link[0], "href"));
  }
  if (!found) return null;
  const decoded = found.replace(/&amp;/g, "&");
  try {
    const abs = new URL(decoded, pageUrl);
    return abs.protocol === "https:" || abs.protocol === "http:" ? abs.href : null;
  } catch {
    return null;
  }
}

/**
 * A site's logo candidates from its homepage HTML, best first: apple-touch-icon (large PNG) → rel="icon" links,
 * biggest declared size first, SVG skipped (never served from our origin) → /favicon.ico. Absolute http(s) URLs.
 */
export function extractIconCandidates(html: string, pageUrl: string): string[] {
  const head = html.slice(0, 300_000);
  const links = head.match(/<link\b[^>]*>/gi) ?? [];
  const get = (tag: string, name: string) => {
    const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
  };
  const found: { href: string; score: number }[] = [];
  for (const tag of links) {
    const rel = get(tag, "rel").toLowerCase().split(/\s+/);
    const href = get(tag, "href").replace(/&amp;/g, "&");
    if (!href || get(tag, "type").includes("svg") || /\.svg(\?|$)/i.test(href)) continue;
    const size = Math.max(0, ...(get(tag, "sizes").match(/\d+/g) ?? ["0"]).map(Number));
    if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) found.push({ href, score: 1000 + size });
    else if (rel.includes("icon")) found.push({ href, score: size || 16 });
  }
  found.sort((a, b) => b.score - a.score);
  const out: string[] = [];
  for (const { href } of [...found, { href: "/favicon.ico" }]) {
    try {
      const abs = new URL(href, pageUrl);
      if ((abs.protocol === "https:" || abs.protocol === "http:") && !out.includes(abs.href)) out.push(abs.href);
    } catch {
      // ignore malformed hrefs
    }
  }
  return out;
}
