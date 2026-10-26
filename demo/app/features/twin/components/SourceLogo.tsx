import { useState } from "react";
import { logoUrl } from "../../media/urls";

/** True when an image shows (next to) nothing on a white tile: almost every pixel near-white or transparent (e.g. a white-only icon). */
function looksBlank(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 16, 16);
    const px = ctx.getImageData(0, 0, 16, 16).data;
    // a few grey edge pixels (anti-aliasing of a white mark) are not a visible logo: need some real ink
    let ink = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] > 40 && (px[i] < 225 || px[i + 1] < 225 || px[i + 2] < 225)) ink++;
    }
    return ink < 6;
  } catch {
    return false; // unreadable: keep the image
  }
}

/**
 * A source's logo, a static file from the daily build (same origin, so its pixels can be checked), on a white
 * tile; its initials when it has no site, the logo fails, or the logo is blank. Decorative: the name is shown next to it.
 */
export function SourceLogo({ name, site, className = "h-9 w-9" }: { name: string; site?: string; className?: string }) {
  const [failed, setFailed] = useState(!site);
  const initials = name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center overflow-hidden text-xs font-semibold rounded-xl border border-[var(--glass-edge)] bg-white text-[#0b2a2c] shadow-[var(--neu-raised-sm)] ${className}`}>
      {failed ? initials || "•" : (
        <img src={logoUrl(site!)} alt="" loading="lazy" referrerPolicy="no-referrer"
          onLoad={(e) => looksBlank(e.currentTarget) && setFailed(true)}
          onError={() => setFailed(true)} className="block max-h-[66%] max-w-[66%] object-contain" />
      )}
    </span>
  );
}
