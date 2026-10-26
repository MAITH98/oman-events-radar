/*
 * Where pictures live on the static site: one file per event / news story / source logo, written by the daily build
 * (routes/media.$file.ts, pre-rendered). A story or site without a usable picture gets a 1×1 placeholder, which the
 * components treat as "no picture" (isPlaceholder).
 */
const BASE = import.meta.env.BASE_URL;

export const previewUrl = (kind: "event" | "news", id: string) => `${BASE}media/${kind}-${encodeURIComponent(id)}.jpg`;
export const logoUrl = (site: string) => `${BASE}media/logo-${encodeURIComponent(site)}.png`;

/** The build's stand-in for "no picture". */
export const isPlaceholder = (img: HTMLImageElement) => img.naturalWidth <= 1 && img.naturalHeight <= 1;
