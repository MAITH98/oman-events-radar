/**
 * 2.5D without 3D: the flat map plane is drawn through one affine transform
 * (rotate, then squash vertically) — the classic "tilted table" look of control
 * room screens. Markers, beams and labels are drawn upright in screen space at
 * the transformed points, so they never get distorted.
 */
export interface Bounds {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
}

export interface Plane {
  width: number;
  height: number;
  bounds: Bounds;
}

export type Matrix = [number, number, number, number, number, number]; // SVG matrix(a b c d e f)

export function tiltMatrix(tilted: boolean, angleDeg = -18, squash = 0.56): Matrix {
  if (!tilted) return [1, 0, 0, 1, 0, 0];
  const r = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  // S(1, squash) · R(angle)
  return [cos, sin * squash, -sin, cos * squash, 0, 0];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Lat/lon to plane coordinates (equirectangular, matches the generated basemap). */
export function toPlane(plane: Plane, lat: number, lon: number): [number, number] {
  const { lon0, lon1, lat0, lat1 } = plane.bounds;
  return [((lon - lon0) / (lon1 - lon0)) * plane.width, ((lat1 - lat) / (lat1 - lat0)) * plane.height];
}

/** viewBox that fits the transformed plane plus room above for beams and labels. */
export function fitViewBox(m: Matrix, plane: Plane, headroom: number, pad = 16) {
  const corners = [apply(m, 0, 0), apply(m, plane.width, 0), apply(m, 0, plane.height), apply(m, plane.width, plane.height)];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad - headroom;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2 + headroom;
  return { minX, minY, w, h };
}

/** Inverse of an affine matrix (screen → plane), e.g. to turn a click on the tilted map back into map position. */
export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

/** Plane coordinates back to latitude / longitude (inverse of toPlane). */
export function fromPlane(plane: Plane, x: number, y: number): [lat: number, lon: number] {
  const { lon0, lon1, lat0, lat1 } = plane.bounds;
  return [lat1 - (y / plane.height) * (lat1 - lat0), lon0 + (x / plane.width) * (lon1 - lon0)];
}

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
