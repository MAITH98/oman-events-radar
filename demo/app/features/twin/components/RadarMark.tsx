import { useId } from "react";
import { OMAN } from "../geo/basemap";
import { toPlane } from "../projection";

/*
 * The ØER logo, redrawn as SVG in the reference artwork's own pixel space (1254 × 1254 master):
 * glass-tube ring centred at (418, 602) r 162 with a gap at ~11 o'clock holding the satellite dot,
 * frosted Oman (real OSM outline), one amber beam out of Muscat that fades with distance,
 * and glass-tube "ER" with amber light on the E's middle bar and the R's leg.
 */
const C = { x: 418, y: 602, r: 162 };
const GAP = { from: -127, to: -104.5, dot: -116 };

// Fit the Oman outline into the reference's frosted shape box (top 478, bottom 727, left 325), keeping its aspect.
const OMAN_BOX = { top: 478, bottom: 727, left: 325 };
const bbox = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of OMAN.outline) {
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
      y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
    }
  }
  return { x0, y0, x1, y1 };
})();
const S = (OMAN_BOX.bottom - OMAN_BOX.top) / (bbox.y1 - bbox.y0);
const TX = OMAN_BOX.left - bbox.x0 * S;
const TY = OMAN_BOX.top - bbox.y0 * S;
const [mx, my] = toPlane(OMAN, 23.588, 58.3829);
const M = { x: TX + mx * S, y: TY + my * S }; // Muscat

const rad = (a: number) => (a * Math.PI) / 180;
const pt = (a: number, r = C.r, cx = C.x, cy = C.y) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))] as const;
const fmt = (p: readonly [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Arc along the ring, clockwise from a0 to a1 (degrees, SVG orientation: 0 = 3 o'clock, -90 = 12 o'clock). */
function arc(a0: number, a1: number) {
  const sweep = (((a1 - a0) % 360) + 360) % 360;
  return `M${fmt(pt(a0))} A${C.r} ${C.r} 0 ${sweep > 180 ? 1 : 0} 1 ${fmt(pt(a1))}`;
}
function wedge(a0: number, a1: number, r = 260) {
  return `M${M.x.toFixed(1)} ${M.y.toFixed(1)} L${fmt(pt(a0, r, M.x, M.y))} A${r} ${r} 0 0 1 ${fmt(pt(a1, r, M.x, M.y))} Z`;
}

const RING = arc(GAP.to, GAP.from + 360);
const DOT = pt(GAP.dot);
// Intro: the dot starts at the ring's first point (GAP.to) and turns clockwise to GAP.dot: 360 − (GAP.dot − GAP.to) = 348.5°
// (hard-coded in app.css as @keyframes i-orbit).
const LETTERS = {
  e: "M785 475 H630 Q618 475 618 487 V728 Q618 740 630 740 H788 M618 602 H770",
  r: "M827 740 V487 Q827 475 839 475 H925 A67.5 67.5 0 0 1 925 610 H872 L1000 740",
};

/** Glass tube: soft outer glow, bright glass edges and a lighter translucent interior. */
function Tube({ d, glow, draw }: { d: string; glow: string | null; draw?: string }) {
  // `draw` (intro only) names the stroke-drawing animation; pathLength 100 lets one dash rule fit every path.
  const p = draw ? { className: draw, pathLength: 100 } : {};
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {glow && <path className="glow-fx" d={d} stroke="var(--logo-glow-line)" strokeOpacity="0.3" strokeWidth="18" filter={`url(#${glow})`} {...p} />}
      <path d={d} stroke="var(--logo-core)" strokeOpacity="0.85" strokeWidth="10" {...p} />
      <path d={d} stroke="var(--logo-glass)" strokeWidth="5" {...p} />
    </g>
  );
}

/** Amber light laid along a straight segment, fading at both ends. */
function Light({ id, x1, y1, x2, y2, peak = 0.35, width = 6, glow }: {
  id: string; x1: number; y1: number; x2: number; y2: number; peak?: number; width?: number; glow: string | null;
}) {
  const d = `M${x1} ${y1} L${x2} ${y2}`;
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="var(--radar-beam)" stopOpacity="0" />
          <stop offset={peak} stopColor="var(--radar-beam)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--radar-beam)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {glow && <path className="glow-fx" d={d} stroke={`url(#${id})`} strokeWidth={width + 16} strokeOpacity="0.6" strokeLinecap="round" filter={`url(#${glow})`} />}
      <path d={d} stroke={`url(#${id})`} strokeWidth={width * 0.6} strokeOpacity="0.85" strokeLinecap="round" />
    </>
  );
}

/** Amber light along a stretch of the ring (fades in and out). */
function RingLight({ id, a0, a1, glow }: { id: string; a0: number; a1: number; glow: string | null }) {
  const [x1, y1] = pt(a0);
  const [x2, y2] = pt(a1);
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="var(--radar-beam)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--radar-beam)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--radar-beam)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {glow && <path className="glow-fx" d={arc(a0, a1)} fill="none" stroke={`url(#${id})`} strokeWidth="16" strokeOpacity="0.5" filter={`url(#${glow})`} />}
      <path d={arc(a0, a1)} fill="none" stroke={`url(#${id})`} strokeWidth="4" strokeOpacity="0.85" strokeLinecap="round" />
    </>
  );
}

function Emblem({ uid, sweep, intro = false, halo = true }: { uid: string; sweep: boolean; intro?: boolean; halo?: boolean }) {
  const glow = halo ? `glow-${uid}` : null;
  return (
    <g>
      <defs>
        {/* user-space region: a straight bar has a zero-height bounding box, which would clip a %-based region */}
        <filter id={`glow-${uid}`} filterUnits="userSpaceOnUse" x="0" y="200" width="1254" height="800">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`clip-${uid}`}><circle cx={C.x} cy={C.y} r={C.r - 3} /></clipPath>
        <linearGradient id={`land-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--logo-land-a)" />
          <stop offset="1" stopColor="var(--logo-land-b)" />
        </linearGradient>
        {/* one beam whose light falls off with distance from Muscat: hottest at the point, gone at the ring */}
        <radialGradient id={`beam-${uid}`} cx={M.x} cy={M.y} r="155" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4dc" stopOpacity="0.95" />
          <stop offset="0.12" stopColor="var(--radar-beam)" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="var(--radar-beam)" stopOpacity="0.38" />
          <stop offset="0.8" stopColor="var(--radar-beam)" stopOpacity="0.08" />
          <stop offset="1" stopColor="var(--radar-beam)" stopOpacity="0" />
        </radialGradient>
        <filter id={`beamsoft-${uid}`} filterUnits="userSpaceOnUse" x="200" y="300" width="500" height="500">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <radialGradient id={`pin-${uid}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffb08a" />
          <stop offset="0.55" stopColor="var(--radar-dot)" />
          <stop offset="1" stopColor="#c23a1c" />
        </radialGradient>
        <radialGradient id={`sat-${uid}`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="var(--logo-sat-hi)" />
          <stop offset="1" stopColor="var(--logo-sat)" />
        </radialGradient>
      </defs>

      {/* beam: one soft-edged sector, clipped to the ring */}
      <g clipPath={`url(#clip-${uid})`}>
        <g className={intro ? "i-beam" : undefined} style={intro ? { transformOrigin: `${M.x}px ${M.y}px` } : undefined}>
        <g style={sweep ? { transformOrigin: `${M.x}px ${M.y}px`, animation: "radar-sweep 9s linear infinite" } : undefined}>
          <path d={wedge(-72, -18)} fill={`url(#beam-${uid})`} filter={`url(#beamsoft-${uid})`} />
        </g>
        </g>
      </g>

      {/* frosted Oman */}
      <g className={intro ? "i-land" : undefined} style={intro ? { transformOrigin: `${C.x}px ${C.y}px` } : undefined}>
      <g transform={`translate(${TX.toFixed(2)} ${TY.toFixed(2)}) scale(${S.toFixed(4)})`} filter={`url(#soft-${uid})`}>
        {OMAN.outline.map((d, i) => (
          <path key={i} d={d} fill={`url(#land-${uid})`} stroke="var(--logo-core)" strokeOpacity="0.35" strokeWidth={1.4 / S} strokeLinejoin="round" />
        ))}
      </g>
      </g>

      {/* ring + its two lights (top-right from the beam, bottom-left reflection) */}
      <Tube d={RING} glow={glow} draw={intro ? "i-ring" : undefined} />
      <g className={intro ? "i-glow" : undefined}>
        <RingLight id={`rl1-${uid}`} a0={-95} a1={-8} glow={glow} />
        <RingLight id={`rl2-${uid}`} a0={92} a1={150} glow={glow} />
      </g>

      {/* satellite dot, on the ring line inside the gap. In the intro it leads the pen around the ring
          (rotated back to the ring's start, then turned with the same easing as the stroke) and comes to rest here. */}
      <g className={intro ? "i-dot" : undefined} style={intro ? { transformOrigin: `${C.x}px ${C.y}px` } : undefined}>
        <circle cx={DOT[0]} cy={DOT[1]} r="17" fill={`url(#sat-${uid})`} />
      </g>

      {/* radar ping (intro only) */}
      {intro && <circle className="i-ping" cx={C.x} cy={C.y} r={C.r} fill="none" stroke="var(--logo-glow-line)" strokeWidth="3" style={{ transformOrigin: `${C.x}px ${C.y}px` }} />}

      {/* Muscat */}
      <g className={intro ? "i-pin" : undefined} style={intro ? { transformOrigin: `${M.x}px ${M.y}px` } : undefined}>
      {glow && (
        <circle className="glow-fx" cx={M.x} cy={M.y} r="24" fill="var(--radar-dot)" opacity="0.35" filter={`url(#${glow})`}
          style={sweep ? { transformOrigin: `${M.x}px ${M.y}px`, animation: "radar-ping 2.4s ease-out infinite" } : undefined} />
      )}
      <circle cx={M.x} cy={M.y} r="11" fill={`url(#pin-${uid})`} />
      </g>
    </g>
  );
}

/**
 * Engraved emblem: the same shapes in one flat colour (currentColor), no glass, glow or amber. The carved look
 * (shadow on the upper lip, light on the lower lip) comes from the `.hero-radar` CSS so it follows the theme.
 */
function EngravedEmblem({ uid, sweep }: { uid: string; sweep: boolean }) {
  return (
    <g>
      <defs>
        <clipPath id={`eclip-${uid}`}><circle cx={C.x} cy={C.y} r={C.r - 3} /></clipPath>
        <radialGradient id={`ebeam-${uid}`} cx={M.x} cy={M.y} r="155" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#eclip-${uid})`}>
        <g style={sweep ? { transformOrigin: `${M.x}px ${M.y}px`, animation: "radar-sweep 9s linear infinite" } : undefined}>
          <path d={wedge(-72, -18)} fill={`url(#ebeam-${uid})`} />
        </g>
      </g>
      <g transform={`translate(${TX.toFixed(2)} ${TY.toFixed(2)}) scale(${S.toFixed(4)})`}>
        {OMAN.outline.map((d, i) => <path key={i} d={d} fill="currentColor" />)}
      </g>
      <path d={RING} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      <circle cx={DOT[0]} cy={DOT[1]} r="17" fill="currentColor" />
      <circle cx={M.x} cy={M.y} r="8" fill="currentColor" />
    </g>
  );
}

/**
 * The ØER emblem alone. `sweep` slowly turns the beam; still under prefers-reduced-motion (app.css).
 * `engraved` draws it as a flat, carved backdrop (hero) instead of the glass logo.
 */
export function RadarMark({ className = "", sweep = false, engraved = false }: { className?: string; sweep?: boolean; engraved?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="226 410 384 384" overflow="visible" className={className} aria-hidden="true" focusable="false">
      {engraved ? <EngravedEmblem uid={uid} sweep={sweep} /> : <Emblem uid={uid} sweep={sweep} />}
    </svg>
  );
}

/**
 * Full ØER logo. One SVG with fixed coordinates, so it never mirrors in Arabic (RTL).
 * `glow={false}` drops the blurred halos (header); the amber light on the strokes stays as colour.
 */
export function LogoMark({ className = "", intro = false, glow: halo = true }: { className?: string; intro?: boolean; glow?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glow = halo ? `glow-${uid}` : null;
  return (
    <svg viewBox="228 418 790 370" overflow="visible" className={`${intro ? "oer-intro " : ""}${className}`} aria-hidden="true" focusable="false">
      <Emblem uid={uid} sweep={false} intro={intro} halo={halo} />
      <Tube d={LETTERS.e} glow={glow} draw={intro ? "i-e" : undefined} />
      <Tube d={LETTERS.r} glow={glow} draw={intro ? "i-r" : undefined} />
      <g className={intro ? "i-glow" : undefined}>
      {/* amber light: E middle bar (and where it meets the stem), R stem and leg */}
      <Light id={`l1-${uid}`} x1={612} y1={602} x2={772} y2={602} peak={0.18} glow={glow} />
      <Light id={`l2-${uid}`} x1={618} y1={545} x2={618} y2={665} peak={0.5} width={5} glow={glow} />
      <Light id={`l3-${uid}`} x1={827} y1={560} x2={827} y2={720} peak={0.55} width={4} glow={glow} />
      <Light id={`l4-${uid}`} x1={872} y1={610} x2={1000} y2={740} peak={0.45} glow={glow} />
      </g>
    </svg>
  );
}
