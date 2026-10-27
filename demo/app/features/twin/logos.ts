import { useEffect, useState } from "react";
import { logoUrl } from "../media/urls";

/*
 * Source logos normalised so they look equal (the usual "logo soup" fix):
 *  1. trim: each logo file's own empty or white margin is cropped off (pixels read from a canvas; the logos come
 *     from this site's media/ folder, so they are same-origin and readable; the build's 1×1 stand-in is blank);
 *  2. equal optical area: `logoSize` gives every logo the same area, so a wide wordmark is wider and shorter and a
 *     square emblem is compact, instead of all sharing one height.
 * Results are cached per site for the page's lifetime. A logo that fails or is blank on white resolves to null.
 */
/** `darkInk`: thin dark marks on an empty background (a wordmark): on a dark surface they need a light tone. */
export type TrimmedLogo = { src: string; aspect: number; darkInk: boolean } | null;
const cache = new Map<string, Promise<TrimmedLogo>>();

export function trimLogo(site: string): Promise<TrimmedLogo> {
  const hit = cache.get(site);
  if (hit) return hit;
  const job = new Promise<TrimmedLogo>((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return resolve(null);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            // "ink": visible and not near-white
            if (px[i + 3] > 24 && (px[i] < 238 || px[i + 1] < 238 || px[i + 2] < 238)) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return resolve(null); // blank on white (e.g. a white-only icon)
        const cw = x1 - x0 + 1;
        const ch = y1 - y0 + 1;
        // how much of the box is ink, and how dark that ink is
        let ink = 0, lum = 0;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = (y * w + x) * 4;
            if (px[i + 3] > 24 && (px[i] < 238 || px[i + 1] < 238 || px[i + 2] < 238)) {
              ink++;
              lum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
            }
          }
        }
        if (lum / ink > 0.85) return resolve(null); // a light mark for dark backgrounds: unreadable on the white strip
        const darkInk = ink / (cw * ch) < 0.55 && lum / ink < 0.4;
        const out = document.createElement("canvas");
        out.width = cw;
        out.height = ch;
        out.getContext("2d")?.drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
        resolve({ src: out.toDataURL("image/png"), aspect: cw / ch, darkInk });
      } catch {
        resolve(null);
      }
    };
    img.src = logoUrl(site);
  });
  cache.set(site, job);
  return job;
}

/** Width × height giving every logo the same visual `area` (px²), within `maxH` × `maxW`. */
export function logoSize(aspect: number, area: number, maxH: number, maxW: number) {
  let h = Math.sqrt(area / aspect);
  let w = h * aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  if (w > maxW) { w = maxW; h = w / aspect; }
  return { width: Math.round(w), height: Math.round(h) };
}

/**
 * Trimmed logos for these sites, filled in as each is ready (keyed by site; null = no usable logo).
 * Trimming reads pixels from a canvas, so it runs in the browser after hydration (an external browser API).
 */
export function useTrimmedLogos(sites: string[]): Record<string, TrimmedLogo> {
  const key = sites.join("|");
  const [logos, setLogos] = useState<Record<string, TrimmedLogo>>({});
  useEffect(() => {
    let live = true;
    for (const site of key.split("|").filter(Boolean)) {
      trimLogo(site).then((r) => live && setLogos((m) => (site in m ? m : { ...m, [site]: r })));
    }
    return () => { live = false; };
  }, [key]);
  return logos;
}
