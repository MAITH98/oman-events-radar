import type { RadarEvent } from "../events/types";

/**
 * Venue gazetteer. Coordinates were looked up once on OpenStreetMap (Nominatim)
 * and are fixed here; the site never geocodes at runtime. Matching is by rule
 * (regular expressions on venue/city/title), like the radar itself — no AI.
 */
export interface Place {
  key: string;
  name: string;
  district: string;
  nameAr: string;
  districtAr: string;
  lat: number;
  lon: number;
  scope: "muscat" | "oman";
}

const VENUES: (Place & { match: RegExp })[] = [
  { key: "ocec", name: "Oman Convention & Exhibition Centre", district: "Madinat Al Irfan", nameAr: "مركز عُمان للمؤتمرات والمعارض", districtAr: "مدينة العرفان", lat: 23.5668, lon: 58.3257, scope: "muscat",
    match: /\bocec\b|convention\s*(&|and)\s*exhibition|مركز عمان للمؤتمرات/i },
  { key: "omantel", name: "Omantel HQ", district: "Al Khuwair", nameAr: "المقر الرئيسي لعمانتل", districtAr: "الخوير", lat: 23.5915, lon: 58.4297, scope: "muscat", match: /omantel/i },
  { key: "grand-millennium", name: "Grand Millennium Muscat", district: "Al Khuwair", nameAr: "فندق جراند ميلينيوم مسقط", districtAr: "الخوير", lat: 23.5916, lon: 58.4128, scope: "muscat", match: /grand millennium/i },
  { key: "movenpick-ghala", name: "Mövenpick Ghala", district: "Ghala", nameAr: "موفنبيك غلا", districtAr: "غلا", lat: 23.5884, lon: 58.3594, scope: "muscat", match: /m[oö]venpick/i },
  { key: "sheraton", name: "Sheraton Oman", district: "Ruwi", nameAr: "شيراتون عُمان", districtAr: "روي", lat: 23.5974, lon: 58.5525, scope: "muscat", match: /sheraton/i },
  { key: "bayt-al-falaj", name: "Bayt Al Falaj", district: "Ruwi", nameAr: "بيت الفلج", districtAr: "روي", lat: 23.6035, lon: 58.5413, scope: "muscat", match: /ba[iy]t al[- ]falaj/i },
  { key: "muttrah", name: "Muttrah", district: "Muttrah", nameAr: "مطرح", districtAr: "مطرح", lat: 23.6234, lon: 58.5589, scope: "muscat", match: /muttrah|mutrah|مطرح/i },
  { key: "al-hail", name: "Al Hail South", district: "Seeb", nameAr: "الحيل الجنوبية", districtAr: "السيب", lat: 23.6291, lon: 58.2242, scope: "muscat", match: /al[- ]hail|الحيل/i },
  { key: "kom", name: "Knowledge Oasis Muscat", district: "Rusayl", nameAr: "واحة المعرفة مسقط", districtAr: "الرسيل", lat: 23.566, lon: 58.1691, scope: "muscat", match: /knowledge oasis|\bkom\b/i },
  { key: "rohm", name: "Royal Opera House Muscat", district: "Shatti Al Qurum", nameAr: "دار الأوبرا السلطانية مسقط", districtAr: "شاطئ القرم", lat: 23.6143, lon: 58.4686, scope: "muscat", match: /opera house/i },
];

const CITIES: (Place & { match: RegExp })[] = [
  { key: "salalah", name: "Salalah", district: "Dhofar", nameAr: "صلالة", districtAr: "ظفار", lat: 17.0175, lon: 54.1011, scope: "oman", match: /salalah|صلالة/i },
  { key: "sohar", name: "Sohar", district: "North Al Batinah", nameAr: "صحار", districtAr: "شمال الباطنة", lat: 24.342, lon: 56.7298, scope: "oman", match: /sohar|صحار/i },
  { key: "duqm", name: "Duqm", district: "Al Wusta", nameAr: "الدقم", districtAr: "الوسطى", lat: 19.623, lon: 57.634, scope: "oman", match: /duqm|الدقم/i },
  { key: "nizwa", name: "Nizwa", district: "Ad Dakhiliyah", nameAr: "نزوى", districtAr: "الداخلية", lat: 22.9324, lon: 57.5311, scope: "oman", match: /nizwa|نزوى/i },
  { key: "sur", name: "Sur", district: "South Ash Sharqiyah", nameAr: "صور", districtAr: "جنوب الشرقية", lat: 22.5693, lon: 59.5296, scope: "oman", match: /\bsur\b|صور/i },
];

/** Muscat's position on the country view (governorate centre), used to group all Muscat venues there. */
export const MUSCAT_HUB: Place = { key: "muscat", name: "Muscat", district: "Muscat Governorate", nameAr: "مسقط", districtAr: "محافظة مسقط", lat: 23.588, lon: 58.3829, scope: "oman" };

export type Located =
  | { kind: "venue"; place: Place }
  | { kind: "city-only" } // in Muscat or Oman, venue not specified
  | { kind: "abroad" }; // GCC or elsewhere

export function locate(e: RadarEvent): Located {
  const text = `${e.venue} ${e.city}`;
  for (const v of VENUES) if (v.match.test(text)) return { kind: "venue", place: v };
  for (const c of CITIES) if (c.match.test(text) || c.match.test(e.title)) return { kind: "venue", place: c };
  if (e.region === "GCC" || e.region === "Other") return { kind: "abroad" };
  return { kind: "city-only" };
}

export interface PlaceGroup {
  place: Place;
  events: RadarEvent[];
  /** How many of the events are confirmed (team calendar); the rest wait for review. */
  confirmed: number;
}

const CONFIRMED = new Set(["Upcoming", "Ongoing", "Rescheduled"]);

/** Group events by mapped place, busiest first. */
export function groupByPlace(events: RadarEvent[]) {
  const groups = new Map<string, PlaceGroup>();
  let unspecified = 0;
  let abroad = 0;
  for (const e of events) {
    const loc = locate(e);
    if (loc.kind === "venue") {
      const g = groups.get(loc.place.key) ?? { place: loc.place, events: [], confirmed: 0 };
      g.events.push(e);
      if (CONFIRMED.has(e.status)) g.confirmed++;
      groups.set(loc.place.key, g);
    } else if (loc.kind === "abroad") abroad++;
    else unspecified++;
  }
  return {
    places: [...groups.values()].sort((a, b) => b.events.length - a.events.length || a.place.name.localeCompare(b.place.name)),
    unspecified,
    abroad,
  };
}

export function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}

export function placeName(p: Place, lang: "en" | "ar") {
  return lang === "ar" ? p.nameAr : p.name;
}
export function placeDistrict(p: Place, lang: "en" | "ar") {
  return lang === "ar" ? p.districtAr : p.district;
}
