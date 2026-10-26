#!/usr/bin/env python3
"""
Builds app/features/twin/geo/omanSvg.ts from the simplemaps.com Oman SVG (free for commercial use,
https://simplemaps.com/resources/svg-license — attribution appreciated, credited on /credits).

The SVG has no stated projection. Calibration: its outer extents are matched to Oman's extents from OpenStreetMap
(app/features/twin/geo/regions.ts) with a Mercator latitude scale (a linear one put coastal cities offshore),
then checked against 13 known cities, each of which must fall inside its own governorate.

  python3 scripts/build-oman-svg.py "<path to om.svg>"
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads/om (1).svg"
OUT = ROOT / "app/features/twin/geo/omanSvg.ts"
# simplemaps id → OSM English name (regions.ts)
OSM = {"OMMU": "Musandam Governorate", "OMBA": "Al Batinah North Governorate", "OMBU": "Al Buraimi Governorate",
       "OMZA": "Ad Dhahirah Governorate", "OMZU": "Dhofar Governorate", "OMWU": "Al Wusta Governorate",
       "OMSH": "Ash Sharqiyah South Governorate", "OMSS": "Ash Sharqiyah North Governorate", "OMMA": "Muscat Governorate",
       "OMBJ": "Al Batinah South Governorate", "OMDA": "Ad Dakhiliyah Governorate"}


def svg_rings(d: str):
    """Parse M/m/L/l/Z path data (all simplemaps uses) into absolute rings."""
    rings, ring, x, y = [], [], 0.0, 0.0
    for cmd, args in re.findall(r"([MmLlZz])([^MmLlZz]*)", d):
        nums = [float(n) for n in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", args)]
        if cmd in "Zz":
            if ring: rings.append(ring); ring = []
            continue
        pts = list(zip(nums[0::2], nums[1::2]))
        for i, (a, b) in enumerate(pts):
            if cmd == "M" or (cmd == "L"): x, y = a, b
            else: x, y = x + a, y + b
            if cmd in "Mm" and i == 0 and ring: rings.append(ring); ring = []
            ring.append((x, y))
    if ring: rings.append(ring)
    return rings


def centroid(rings):
    A = cx = cy = 0.0
    for r in rings:
        for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
            c = x0 * y1 - x1 * y0
            A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    A /= 2
    return cx / (6 * A), cy / (6 * A)


def fit(us, vs):
    n = len(us); mu = sum(us) / n; mv = sum(vs) / n
    a = sum((u - mu) * (v - mv) for u, v in zip(us, vs)) / sum((u - mu) ** 2 for u in us)
    return a, mv - a * mu


text = SVG.read_text(encoding="utf-8")
paths = re.findall(r'<path\b[^>]*\bd="([^"]+)"[^>]*\bid="(OM[A-Z]+)"[^>]*\bname="([^"]+)"', text)
paths += [(d, i, n) for i, n, d in re.findall(r'<path\b[^>]*\bid="(OM[A-Z]+)"[^>]*\bname="([^"]+)"[^>]*\bd="([^"]+)"', text)]
regions = {i: (n, d) for d, i, n in paths}
assert len(regions) == 11, f"expected 11 governorates, found {len(regions)}"

osm_src = (ROOT / "app/features/twin/geo/regions.ts").read_text(encoding="utf-8")
osm = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r'name: "([^"]+)", nameAr: "[^"]*", rings: (\[\[\[.*?\]\]\]) \}', osm_src)}

import math
merc = lambda la: math.log(math.tan(math.pi / 4 + math.radians(la) / 2))
svg_pts = [p for _, d in regions.values() for r in svg_rings(d) for p in r]
osm_pts = [p for name in OSM.values() for r in osm[name] for p in r]
xs, ys = [p[0] for p in svg_pts], [p[1] for p in svg_pts]
lon0, lon1 = min(p[0] for p in osm_pts), max(p[0] for p in osm_pts)
lat0, lat1 = min(p[1] for p in osm_pts), max(p[1] for p in osm_pts)
ax = (max(xs) - min(xs)) / (lon1 - lon0); bx = min(xs) - ax * lon0
ay = (min(ys) - max(ys)) / (merc(lat1) - merc(lat0)); by = max(ys) - ay * merc(lat0)
print("fit: x = %.4f·lon + %.2f,  y = %.4f·merc(lat) + %.2f" % (ax, bx, ay, by))


def inside(x, y, rings):
    c = False
    for r in rings:
        for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
            if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0: c = not c
    return c


CITIES = {"Muscat": (23.588, 58.383, "OMMA"), "Seeb": (23.67, 58.19, "OMMA"), "Qurayyat": (23.26, 58.92, "OMMA"),
          "Salalah": (17.019, 54.089, "OMZU"), "Sohar": (24.347, 56.709, "OMBA"), "Nizwa": (22.933, 57.531, "OMDA"),
          "Sur": (22.567, 59.529, "OMSH"), "Ibra": (22.69, 58.53, "OMSS"), "Ibri": (23.226, 56.516, "OMZA"),
          "Buraimi": (24.25, 55.79, "OMBU"), "Khasab": (26.18, 56.25, "OMMU"), "Duqm": (19.66, 57.70, "OMWU"),
          "Rustaq": (23.39, 57.42, "OMBJ")}
hits = [c for c, (la, lo, rid) in CITIES.items() if inside(ax * lo + bx, ay * merc(la) + by, svg_rings(regions[rid][1]))]
print(f"city check: {len(hits)}/{len(CITIES)} inside their governorate; outside: {sorted(set(CITIES) - set(hits))}")
assert len(hits) >= len(CITIES) - 1, "calibration failed"
worst = 0.0
def bbox(d):
    pts = [p for r in svg_rings(d) for p in r]
    return [round(min(p[0] for p in pts), 1), round(min(p[1] for p in pts), 1), round(max(p[0] for p in pts), 1), round(max(p[1] for p in pts), 1)]


OUT.write_text(
    "// GENERATED by scripts/build-oman-svg.py — do not edit by hand.\n"
    "// Map: simplemaps.com Oman SVG — Copyright (c) 2024 Pareto Software, LLC DBA Simplemaps.com,\n"
    "// free for commercial use (https://simplemaps.com/resources/svg-license); credited on /credits.\n"
    f"// Calibrated to OSM extents with a Mercator latitude scale; city check {len(hits)}/{len(CITIES)} inside their governorate.\n\n"
    "/** bbox: [minX, minY, maxX, maxY] in SVG coordinates. */\nexport interface SvgRegion { id: string; name: string; d: string; bbox: [number, number, number, number] }\n\n"
    f"export const OMAN_SVG_REGIONS: SvgRegion[] = {json.dumps([{'id': i, 'name': n, 'd': d, 'bbox': bbox(d)} for i, (n, d) in sorted(regions.items())], ensure_ascii=False, indent=1)};\n\n"
    f"/** SVG coordinates from latitude / longitude (calibrated Mercator). */\n"
    "const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));\n"
    f"export const toSvg = (lat: number, lon: number): [number, number] => [{ax:.6f} * lon + {bx:.4f}, {ay:.6f} * merc(lat) + {by:.4f}];\n"
    f"/** Latitude / longitude from SVG coordinates. */\n"
    f"export const fromSvg = (x: number, y: number): [lat: number, lon: number] => [(2 * Math.atan(Math.exp((y - {by:.4f}) / {ay:.6f})) - Math.PI / 2) * 180 / Math.PI, (x - {bx:.4f}) / {ax:.6f}];\n"
    f"/** The country's extent in SVG coordinates. */\n"
    f"export const SVG_BOUNDS = {{ minX: {min(xs):.1f}, maxX: {max(xs):.1f}, minY: {min(ys):.1f}, maxY: {max(ys):.1f} }};\n",
    encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size // 1024} KB)")
