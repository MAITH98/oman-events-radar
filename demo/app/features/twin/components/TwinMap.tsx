import { useEffect, useRef, useState } from "react";
import { MUSCAT } from "../geo/basemap";
import { AREAS } from "../geo/areas";
import { OMAN_SVG_REGIONS, SVG_BOUNDS, fromSvg, toSvg } from "../geo/omanSvg";
import { MUSCAT_WILAYATS } from "../geo/regions";
import { useI18n } from "../../../shared/i18n";
import { usePrefersStill } from "../../../shared/ui/motion";
import type { RadarEvent } from "../../events/types";
import { placeName, type PlaceGroup } from "../places";
import { apply, invert, tiltMatrix, type Matrix } from "../projection";

export type Layer = "venues" | "events";
export interface MapPin {
  lat: number;
  lon: number;
  source: "pin" | "me";
}

interface Props {
  layer: Layer;
  groups: PlaceGroup[];
  selectedKey: string | null;
  selectedEventId: string | null;
  pin: MapPin | null;
  /** "Go to" request: a governorate id (OMxx) or a city key; `n` changes on every request so the same place can be chosen twice. */
  area: { key: string; n: number } | null;
  onSelect: (key: string) => void;
  onSelectEvent: (id: string, placeKey: string) => void;
  onPin: (pin: MapPin | null) => void;
}

/*
 * 2.5D map of Oman: governorate lines on a soft land fill, events and venues as orange dots. Country and governorate shapes:
 * simplemaps.com SVG (calibrated to latitude / longitude, see geo/omanSvg.ts); Muscat wilayats, coast and roads at
 * city level: OpenStreetMap, converted into the same SVG coordinates.
 * Level of detail follows the zoom:
 *   L0 country  (zoom < 2.5)  governorates; nearby venues grouped into one dot with a count
 *   L1 region   (zoom < 7)    groups split as they spread apart
 *   L2 city     (zoom ≥ 7)    + Muscat wilayat lines, coast and main roads, every venue named
 * Grouping uses a ~24 px screen grid, so dots separate naturally as you zoom in.
 * Controls: + / − / fit Oman / locate me, and a "go to" governorate / city picker (the `area` prop); drag to pan; Ctrl/⌘ + wheel or pinch to zoom; double-click to
 * zoom in; keyboard (when the map has focus): + − arrows 0. A click on empty map drops a pin (the list then sorts
 * by distance from it). "Locate me" asks the browser for your position, which stays in this page — never sent.
 */

const M: Matrix = tiltMatrix(true, -10, 0.72);
const INV = invert(M);
const B = SVG_BOUNDS;
/** The view that shows the whole tilted country (plus a margin). */
const BASE = (() => {
  const pts = [[B.minX, B.minY], [B.maxX, B.minY], [B.minX, B.maxY], [B.maxX, B.maxY]].map(([x, y]) => apply(M, x, y));
  const pad = 14;
  const minX = Math.min(...pts.map((p) => p[0])) - pad;
  const minY = Math.min(...pts.map((p) => p[1])) - pad - 30;
  return { minX, minY, w: Math.max(...pts.map((p) => p[0])) - minX + pad, h: Math.max(...pts.map((p) => p[1])) - minY + pad };
})();
const MAX_Z = 26;
const lodFor = (z: number) => (z >= 7 ? 2 : z >= 2.5 ? 1 : 0);
const CONFIRMED = new Set(["Upcoming", "Ongoing", "Rescheduled"]);

// ---- static geometry, built once ----
const ringPath = (rings: [number, number][][]) =>
  rings.map((r) => r.map(([lon, lat], i) => `${i ? "L" : "M"}${toSvg(lat, lon).map((v) => v.toFixed(2)).join(" ")}`).join("") + "Z").join("");
const GOV_PATH = OMAN_SVG_REGIONS.map((g) => g.d).join(" ");
const WIL_PATH = MUSCAT_WILAYATS.map((g) => ringPath(g.rings)).join("");
// The Muscat street basemap lives in its own small plane; over 0.2° the projection is linear, so one scale + offset.
const MB = MUSCAT.bounds;
const [mx0, my0] = toSvg(MB.lat1, MB.lon0);
const [mx1, my1] = toSvg(MB.lat0, MB.lon1);
const MUSCAT_ON_SVG = [(mx1 - mx0) / MUSCAT.width, 0, 0, (my1 - my0) / MUSCAT.height, mx0, my0].join(" ");

interface View { cx: number; cy: number; z: number }
const HOME: View = { cx: BASE.minX + BASE.w / 2, cy: BASE.minY + BASE.h / 2, z: 1 };

function clampView(v: View): View {
  const z = Math.min(MAX_Z, Math.max(1, v.z));
  const w = BASE.w / z;
  const h = BASE.h / z;
  return {
    z,
    cx: Math.min(BASE.minX + BASE.w - w / 2, Math.max(BASE.minX + w / 2, v.cx)),
    cy: Math.min(BASE.minY + BASE.h - h / 2, Math.max(BASE.minY + h / 2, v.cy)),
  };
}

export function TwinMap({ layer, groups, selectedKey, selectedEventId, pin, area, onSelect, onSelectEvent, onPin }: Props) {
  const { t, lang } = useI18n();
  const still = usePrefersStill();
  const svg = useRef<SVGSVGElement>(null);
  const [view, setViewRaw] = useState<View>(HOME);
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const anim = useRef<number | null>(null);
  const [widthPx, setWidthPx] = useState(800);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);

  const setView = (v: View) => setViewRaw(clampView(v));
  /** Fly to a view (eased; instant under reduced motion). */
  function fly(to: View) {
    if (anim.current) cancelAnimationFrame(anim.current);
    const target = clampView(to);
    if (still) return setViewRaw(target);
    const from = view;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 450);
      const e = 1 - (1 - k) ** 3;
      setViewRaw(clampView({ cx: from.cx + (target.cx - from.cx) * e, cy: from.cy + (target.cy - from.cy) * e, z: from.z * (target.z / from.z) ** e }));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }
  const flyToPlane = (px: number, py: number, z: number) => {
    const [x, y] = apply(M, px, py);
    fly({ cx: x, cy: y, z });
  };

  // Track the map's on-screen width so marks and tags are sized in real pixels at every zoom (external: layout).
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidthPx(Math.max(200, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current); }, []);
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(timer);
  }, [note]);

  const lod = lodFor(view.z);
  const vb = { w: BASE.w / view.z, h: BASE.h / view.z, minX: view.cx - BASE.w / view.z / 2, minY: view.cy - BASE.h / view.z / 2 };
  const u = vb.w / widthPx; // one screen pixel in view units: marks and tags keep their size at every zoom
  const cell = 24 * u; // grouping grid (plane units ≈ view units): ~24 px on screen at every zoom

  // ---- markers, snapped to the current grid ----
  const snap = (lat: number, lon: number) => {
    const [x, y] = toSvg(lat, lon);
    return [Math.floor(x / cell), Math.floor(y / cell)] as const;
  };
  const center = (gx: number, gy: number) => [gx * cell + cell / 2, gy * cell + cell / 2] as const;
  const SPIRAL = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1], [2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1], [2, 2], [-2, 2], [-2, -2], [2, -2]];

  // venues: aggregate venues that share a cell at this level of detail
  const venueCells = new Map<string, { gx: number; gy: number; groups: PlaceGroup[]; events: number }>();
  for (const g of groups) {
    const [gx, gy] = snap(g.place.lat, g.place.lon);
    const k = `${gx}:${gy}`;
    const c = venueCells.get(k) ?? { gx, gy, groups: [], events: 0 };
    c.groups.push(g);
    c.events += g.events.length;
    venueCells.set(k, c);
  }
  // events: one dot each, fanned into neighbouring cells around their venue
  const taken = new Set<string>();
  const eventDots: { e: RadarEvent; g: PlaceGroup; gx: number; gy: number }[] = [];
  if (layer === "events") {
    for (const g of groups) {
      const [bx, by] = snap(g.place.lat, g.place.lon);
      let i = 0;
      for (const e of g.events) {
        let gx = bx, gy = by;
        for (; i < SPIRAL.length * 4; i++) {
          const ring = Math.floor(i / SPIRAL.length);
          const [dx, dy] = SPIRAL[i % SPIRAL.length];
          gx = bx + dx * (ring + 1) - (ring ? 0 : dx) ; gy = by + dy * (ring + 1) - (ring ? 0 : dy);
          if (!taken.has(`${gx}:${gy}`)) break;
        }
        taken.add(`${gx}:${gy}`);
        eventDots.push({ e, g, gx, gy });
      }
    }
  }

  // ---- interaction ----
  const toView = (clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    return [vb.minX + ((clientX - r.left) / r.width) * vb.w, vb.minY + ((clientY - r.top) / r.height) * vb.h] as const;
  };
  function zoomAt(factor: number, sx?: number, sy?: number) {
    const fx = sx ?? view.cx;
    const fy = sy ?? view.cy;
    const z = view.z * factor;
    // keep the point under the cursor fixed
    setView({ z, cx: fx - (fx - view.cx) / factor, cy: fy - (fy - view.cy) / factor });
  }
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) {
      setNote(t.twin.ctl.wheelHint);
      return; // plain scrolling keeps scrolling the page
    }
    e.preventDefault();
    const [x, y] = toView(e.clientX, e.clientY);
    zoomAt(Math.exp(-e.deltaY * 0.0025), x, y);
  }
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as Element).closest("[data-mark]")) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const r = svg.current!.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / r.width) * vb.w;
    const dy = ((e.clientY - d.y) / r.height) * vb.h;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    if (d.moved) setView({ z: view.z, cx: d.cx - dx, cy: d.cy - dy });
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    // a click on the map (not a mark): drop / move the pin there
    const [x, y] = toView(e.clientX, e.clientY);
    const [px, py] = apply(INV, x, y);
    if (px < B.minX || py < B.minY || px > B.maxX || py > B.maxY) return;
    const [lat, lon] = fromSvg(px, py);
    onPin({ lat, lon, source: "pin" });
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = vb.w * 0.12;
    const moves: Record<string, () => void> = {
      "+": () => zoomAt(1.6), "=": () => zoomAt(1.6), "-": () => zoomAt(1 / 1.6), "0": () => fly(HOME),
      ArrowLeft: () => setView({ ...view, cx: view.cx - step }), ArrowRight: () => setView({ ...view, cx: view.cx + step }),
      ArrowUp: () => setView({ ...view, cy: view.cy - step }), ArrowDown: () => setView({ ...view, cy: view.cy + step }),
    };
    if (e.target === e.currentTarget && moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    }
  }
  function locate() {
    if (!("geolocation" in navigator)) return setNote(t.twin.ctl.locateUnavailable);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        const [px, py] = toSvg(lat, lon);
        if (px < B.minX || px > B.maxX || py < B.minY || py > B.maxY) return setNote(t.twin.ctl.outside);
        onPin({ lat, lon, source: "me" });
        flyToPlane(px, py, 14);
      },
      (err) => {
        setLocating(false);
        setNote(err.code === err.PERMISSION_DENIED ? t.twin.ctl.denied : t.twin.ctl.locateUnavailable);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  // "Go to": fit a governorate's outline to the view, or fly to a city at city level.
  useEffect(() => {
    if (!area) return;
    const gov = OMAN_SVG_REGIONS.find((r) => r.id === area.key);
    if (gov) {
      const [x0, y0, x1, y1] = gov.bbox;
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => apply(M, x, y));
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const z = Math.min(BASE.w / ((Math.max(...xs) - Math.min(...xs)) * 1.25), BASE.h / ((Math.max(...ys) - Math.min(...ys)) * 1.25));
      fly({ cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, z });
      return;
    }
    const city = AREAS.flatMap((g) => g.cities).find((ct) => ct.key === area.key);
    if (city) flyToPlane(...toSvg(city.lat, city.lon), 12);
  }, [area?.n]); // eslint-disable-line react-hooks/exhaustive-deps -- react to each request only

  // Bring the chosen venue / event into view (and separate it from its neighbours) when it is off screen or grouped.
  const selGroup = groups.find((g) => g.place.key === selectedKey) ?? null;
  // the map opens on all of Oman; it only moves when the choice changes (safe under React's double-run of effects)
  const lastChoice = useRef(`${selectedKey}|${selectedEventId}`);
  useEffect(() => {
    const choice = `${selectedKey}|${selectedEventId}`;
    if (choice === lastChoice.current) return;
    lastChoice.current = choice;
    if (!selGroup) return;
    const [px, py] = toSvg(selGroup.place.lat, selGroup.place.lon);
    const [x, y] = apply(M, px, py);
    const visible = x > vb.minX && x < vb.minX + vb.w && y > vb.minY && y < vb.minY + vb.h;
    const grouped = (venueCells.get(snap(selGroup.place.lat, selGroup.place.lon).join(":"))?.groups.length ?? 1) > 1;
    if (!visible || grouped) flyToPlane(px, py, Math.max(view.z, selGroup.place.scope === "muscat" ? 12 : 4));
  }, [selectedKey, selectedEventId]); // eslint-disable-line react-hooks/exhaustive-deps -- react to the choice only

  // ---- labels (screen space): orange count block + light name block; placed so they never overlap ----
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const tag = (x: number, y: number, label: string, badge: string, strong: boolean) => {
    const h = 26 * u;
    const bw = Math.max(26, badge.length * 9 + 14) * u;
    const lw = (label.length * 7.6 + 18) * u;
    const w = bw + lw;
    // first free spot: right, left, above-right, below-right, above-left, below-left of the mark
    let spot: { x: number; y: number } | null = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [1, -1.25], [1, 1.25], [-1, -1.25], [-1, 1.25]]) {
      const rx = dx > 0 ? x + 10 * u : x - 10 * u - w;
      const ry = y - h / 2 + dy * h;
      const inView = rx >= vb.minX && rx + w <= vb.minX + vb.w && ry >= vb.minY && ry + h <= vb.minY + vb.h;
      if (inView && !placed.some((p) => rx < p.x + p.w + 4 * u && rx + w + 4 * u > p.x && ry < p.y + p.h + 3 * u && ry + h + 3 * u > p.y)) {
        spot = { x: rx, y: ry };
        break;
      }
    }
    if (!spot) return null; // no room: the mark stays, its name is in the list and on hover
    placed.push({ x: spot.x, y: spot.y, w, h });
    const { x: rx, y: ry } = spot;
    return (
      <g pointerEvents="none" aria-hidden="true">
        <rect x={rx} y={ry} width={bw} height={h} fill="var(--map-event)" />
        <text x={rx + bw / 2} y={ry + h / 2 + 4.6 * u} textAnchor="middle" fontSize={13 * u} fontWeight={700} fill="#1a0a00" fontFamily="var(--font-sans)">{badge}</text>
        <rect x={rx + bw} y={ry} width={lw} height={h} fill="var(--map-tag-bg)" stroke={strong ? "var(--map-event)" : "none"} strokeWidth={1.4 * u} />
        <text x={rx + bw + 9 * u} y={ry + h / 2 + 4.6 * u} fontSize={13 * u} fontWeight={600} fill="var(--map-tag-ink)" fontFamily="var(--font-sans)">{label}</text>
      </g>
    );
  };
  const short = (g: PlaceGroup) => (g.place.key === "ocec" ? "OCEC" : placeName(g.place, lang));
  const btn = "neu-raised grid h-11 w-11 place-items-center rounded-full text-ink transition hover:text-brand active:shadow-[var(--neu-inset)]";
  const pinXY = pin ? apply(M, ...toSvg(pin.lat, pin.lon)) : null;
  const c = t.twin.ctl;

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`}
        className="block aspect-[4/5] w-full sm:aspect-[16/10] cursor-grab touch-pan-y select-none rounded-xl bg-[var(--map-sea)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        direction="ltr" // geography is never mirrored; Arabic labels still shape correctly
        tabIndex={0}
        role="application"
        aria-roledescription={c.roleDescription}
        aria-label={t.twin.mapAria(t.twin.oman, layer === "venues" ? t.twin.layerVenues : t.twin.layerEvents, layer === "venues" ? groups.length : eventDots.length)}
        aria-describedby="map-keys"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={(e) => { const [x, y] = toView(e.clientX, e.clientY); zoomAt(2, x, y); }}
        onKeyDown={onKeyDown}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ---- ground: land, governorate lines, and (city level) wilayats, coast + roads ---- */}
        <g transform={`matrix(${M.join(" ")})`} aria-hidden="true" pointerEvents="none">
          <path d={GOV_PATH} fill="var(--map-land)" stroke="none" />
          <path d={GOV_PATH} fill="none" stroke="var(--map-border)" strokeWidth={lod === 2 ? 1.4 : 1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {lod === 2 && (
            <>
              <path d={WIL_PATH} fill="none" stroke="var(--map-border)" strokeOpacity="0.6" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <g transform={`matrix(${MUSCAT_ON_SVG})`}>
                <path d={MUSCAT.roadsMajor} fill="none" stroke="var(--map-border)" strokeOpacity="0.35" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <path d={MUSCAT.coast} fill="none" stroke="var(--map-border)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
              </g>
            </>
          )}

        </g>

        {/* ---- dots (screen space: round and the same size at every zoom) ---- */}
        <g aria-hidden="true" pointerEvents="none">
          {layer === "venues"
            ? [...venueCells.values()].map((vc) => {
                const [x, y] = apply(M, ...center(vc.gx, vc.gy));
                const sel = vc.groups.some((g) => g.place.key === selectedKey);
                const review = vc.groups.every((g) => g.confirmed === 0);
                const r = (vc.groups.length > 1 ? 9 : 7) * u;
                return (
                  <g key={`d${vc.gx}:${vc.gy}`}>
                    {sel && <circle cx={x} cy={y} r={r + 6 * u} fill="var(--map-event)" fillOpacity="0.18" />}
                    <circle cx={x} cy={y} r={r} fill={review ? "var(--map-tag-bg)" : "var(--map-event)"} stroke={sel ? "var(--map-tag-ink)" : review ? "var(--map-event)" : "var(--map-tag-bg)"} strokeWidth={(sel ? 2.5 : 1.8) * u} />
                  </g>
                );
              })
            : eventDots.map((d) => {
                const [x, y] = apply(M, ...center(d.gx, d.gy));
                const sel = d.e.id === selectedEventId;
                const review = !CONFIRMED.has(d.e.status);
                return (
                  <g key={`d${d.e.id}`}>
                    {sel && <circle cx={x} cy={y} r={12 * u} fill="var(--map-event)" fillOpacity="0.2" />}
                    <circle cx={x} cy={y} r={(sel ? 6.5 : 5) * u} fill={review ? "var(--map-tag-bg)" : "var(--map-event)"} stroke={sel ? "var(--map-tag-ink)" : review ? "var(--map-event)" : "var(--map-tag-bg)"} strokeWidth={(sel ? 2.2 : 1.4) * u} />
                  </g>
                );
              })}
        </g>

        {/* ---- hit areas + accessible buttons (screen space, so they stay finger-sized at every zoom) ---- */}
        {layer === "venues"
          ? [...venueCells.values()].map((vc) => {
              const [x, y] = apply(M, ...center(vc.gx, vc.gy));
              const one = vc.groups.length === 1 ? vc.groups[0] : null;
              const label = one ? t.twin.markerAria(placeName(one.place, lang), one.confirmed, one.events.length - one.confirmed) : c.cluster(vc.groups.length, vc.events);
              const act = () => (one ? onSelect(one.place.key) : flyToPlane(...center(vc.gx, vc.gy), Math.min(MAX_Z, view.z * 3)));
              return (
                <circle key={`h${vc.gx}:${vc.gy}`} data-mark="" cx={x} cy={y} r={22 * u} fill="transparent" role="button" tabIndex={0} aria-label={label}
                  aria-pressed={one ? one.place.key === selectedKey : undefined} className="cursor-pointer outline-none focus-visible:[stroke:var(--color-accent)] focus-visible:[stroke-width:2px]"
                  onClick={act} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } }}>
                  <title>{label}</title>
                </circle>
              );
            })
          : eventDots.map((d) => {
              const [x, y] = apply(M, ...center(d.gx, d.gy));
              const act = () => onSelectEvent(d.e.id, d.g.place.key);
              return (
                <circle key={`h${d.e.id}`} data-mark="" cx={x} cy={y} r={12 * u} fill="transparent" role="button" tabIndex={0} aria-label={d.e.title}
                  aria-pressed={d.e.id === selectedEventId} className="cursor-pointer outline-none focus-visible:[stroke:var(--color-accent)] focus-visible:[stroke-width:2px]"
                  onClick={act} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } }}>
                  <title>{d.e.title}</title>
                </circle>
              );
            })}

        {/* ---- tags (decorative; lists and the picture panel name everything) ---- */}
        <g className="hidden sm:block">
          {layer === "venues" &&
            [...venueCells.values()]
              .filter((vc) => vc.groups.some((g) => g.place.key === selectedKey) || (lod === 2 && vc.groups.length === 1) || (lod < 2 && vc.groups.length > 1))
              .sort((a, b) => Number(b.groups.some((g) => g.place.key === selectedKey)) - Number(a.groups.some((g) => g.place.key === selectedKey)) || b.events - a.events)
              .map((vc) => {
                const [x, y] = apply(M, ...center(vc.gx, vc.gy));
                const one = vc.groups.length === 1 ? vc.groups[0] : null;
                return <g key={`t${vc.gx}:${vc.gy}`}>{tag(x, y, one ? short(one) : c.clusterShort(vc.groups.length), String(vc.events), vc.groups.some((g) => g.place.key === selectedKey))}</g>;
              })}
          {layer === "events" && eventDots.filter((d) => d.e.id === selectedEventId).map((d) => {
            const [x, y] = apply(M, ...center(d.gx, d.gy));
            return <g key="sel">{tag(x, y, d.e.title.length > 32 ? `${d.e.title.slice(0, 31)}…` : d.e.title, "●", true)}</g>;
          })}
        </g>

        {/* ---- the dropped pin / your location ---- */}
        {pinXY && (
          <g aria-hidden="true" pointerEvents="none">
            {pin!.source === "me" && <circle cx={pinXY[0]} cy={pinXY[1]} r={16 * u} fill="var(--map-pin)" fillOpacity="0.18" />}
            <path d={`M${pinXY[0]} ${pinXY[1]} l${-7 * u} ${-12 * u} a${9 * u} ${9 * u} 0 1 1 ${14 * u} 0 z`} fill="var(--map-pin)" stroke="var(--map-tag-bg)" strokeWidth={1.6 * u} />
            <circle cx={pinXY[0]} cy={pinXY[1] - 16.5 * u} r={3.2 * u} fill="var(--map-tag-bg)" />
          </g>
        )}
      </svg>

      {/* ---- controls ---- */}
      {/* a row on phones (the map is short there), a column from sm up */}
      <div className="absolute end-2 top-2 flex gap-1.5 sm:end-3 sm:top-3 sm:flex-col sm:gap-2">
        <button type="button" className={btn} onClick={() => zoomAt(1.6)} aria-label={c.zoomIn} title={c.zoomIn} disabled={view.z >= MAX_Z}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <button type="button" className={btn} onClick={() => zoomAt(1 / 1.6)} aria-label={c.zoomOut} title={c.zoomOut} disabled={view.z <= 1}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4"><path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <button type="button" className={btn} onClick={() => fly(HOME)} aria-label={c.fit} title={c.fit}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" /></svg>
        </button>
        <button type="button" className={btn} onClick={locate} aria-label={c.locate} title={c.locate} aria-busy={locating}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="5" /><circle cx="10" cy="10" r="1.6" fill="currentColor" /><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" /></svg>
        </button>
      </div>

      {/* bottom row: pin action + level-of-detail / zoom readout (the list floats on the other edge) */}
      <div className="absolute bottom-2 end-2 flex flex-wrap items-center justify-end gap-2 sm:bottom-3 sm:end-3">
        {pin && (
          <button type="button" onClick={() => onPin(null)} className="neu-raised inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-ink hover:text-brand">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[var(--map-pin)] ring-1 ring-[var(--map-border)]" />
            {pin.source === "me" ? c.clearMe : c.clearPin}
          </button>
        )}
        <span className="neu-raised pointer-events-none rounded-full px-3 py-1 text-xs tabular-nums text-muted" aria-live="polite">{c.lod[lod]} · {view.z.toFixed(1)}×</span>
      </div>
      <p aria-live="polite" className={`pointer-events-none absolute inset-x-0 top-16 mx-auto sm:top-3 w-fit max-w-[90%] rounded-full bg-[var(--map-tag-ink)] px-4 py-2 text-center text-xs text-[var(--map-tag-bg)] transition-opacity ${note ? "opacity-95" : "opacity-0"}`}>
        {note ?? ""}
      </p>
      <p id="map-keys" className="sr-only">{c.keys}</p>
    </div>
  );
}
