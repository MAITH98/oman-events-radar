import { useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { matchRank } from "../../../shared/search";
import type { RadarEvent } from "../../events/types";
import { placeDistrict, placeName, type PlaceGroup } from "../places";
import { distanceKm } from "../projection";
import type { Layer, MapPin } from "./TwinMap";

type Filter = "all" | "confirmed" | "review" | "high";
const CONFIRMED = new Set(["Upcoming", "Ongoing", "Rescheduled"]);

/**
 * The list inside the venue map card (venues or upcoming events, following the map's layer), with its own mini
 * search and filter. They narrow the list only — the map keeps every pin. Search uses the site-wide matching
 * (case, accents and Arabic letter variants ignored); the filter is a dropdown so it never needs a sideways row.
 * With a pin on the map (dropped or "locate me"), both lists sort by distance from it and show it in km.
 */
export function MapList({
  id,
  layer,
  places,
  events,
  selectedKey,
  selectedEventId,
  notOnMap,
  pin,
  onClearPin,
  onSelectPlace,
  onSelectEvent,
}: {
  id: string;
  layer: Layer;
  places: PlaceGroup[];
  events: RadarEvent[];
  selectedKey: string | null;
  selectedEventId: string | null;
  notOnMap: string | null;
  pin: MapPin | null;
  onClearPin: () => void;
  onSelectPlace: (g: PlaceGroup) => void;
  onSelectEvent: (id: string) => void;
}) {
  const { t, lang, locale } = useI18n();
  const l = t.twin.mapList;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const has = (text: string, extra = "") => !q.trim() || matchRank(text, q, extra) !== null;

  const placeOf = new Map(places.flatMap((p) => p.events.map((e) => [e.id, p] as const)));
  const km = (lat: number, lon: number) => (pin ? distanceKm(pin.lat, pin.lon, lat, lon) : 0);
  const kmOfPlace = (p: PlaceGroup) => km(p.place.lat, p.place.lon);
  const kmOfEvent = (e: RadarEvent) => { const p = placeOf.get(e.id); return p ? kmOfPlace(p) : Infinity; };
  const fmtKm = (d: number) => l.km(d < 10 ? d.toFixed(1) : Math.round(d).toString());

  const venuesAll = places.filter((p) => {
    if (filter === "confirmed" && p.confirmed === 0) return false;
    if (filter === "review" && p.confirmed === p.events.length) return false;
    return has(`${p.place.name} ${p.place.nameAr}`, `${p.place.district} ${p.place.districtAr}`);
  });
  const venues = pin ? [...venuesAll].sort((a, b) => kmOfPlace(a) - kmOfPlace(b)) : venuesAll;
  const eventsAll = events.filter((e) => {
    if (filter === "confirmed" && !CONFIRMED.has(e.status)) return false;
    if (filter === "review" && CONFIRMED.has(e.status)) return false;
    if (filter === "high" && e.relevance !== "High") return false;
    return has(e.title, [e.venue, e.city, e.organizer, e.category, t.category[e.category] ?? ""].join(" "));
  });
  const shownEvents = pin ? [...eventsAll].sort((a, b) => kmOfEvent(a) - kmOfEvent(b) || a.start.localeCompare(b.start)) : eventsAll;
  const count = layer === "venues" ? venues.length : shownEvents.length;
  const total = layer === "venues" ? places.length : events.length;
  const field = "neu-inset min-h-11 rounded-[var(--radius-control)] px-3 text-sm text-ink";

  return (
    <div id={id} className="hud-panel mt-3 flex max-h-[26rem] flex-col p-2 sm:absolute sm:inset-y-2 sm:start-2 sm:mt-0 sm:max-h-none sm:w-80">
      {/* mini search + filter (list only) */}
      <div role="search" className="grid grid-cols-1 gap-2 p-1 min-[380px]:grid-cols-[minmax(0,1fr)_auto]">
        <label className="sr-only" htmlFor={`${id}-q`}>{l.search}</label>
        <input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={layer === "venues" ? l.placeholderVenues : l.placeholderEvents}
          autoComplete="off" className={`${field} min-w-0`} />
        <label className="sr-only" htmlFor={`${id}-f`}>{l.filter}</label>
        <select id={`${id}-f`} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={`${field} min-[380px]:max-w-[9.5rem]`}>
          <option value="all">{l.all}</option>
          <option value="confirmed">{l.confirmed}</option>
          <option value="review">{l.review}</option>
          {layer === "events" && <option value="high">{l.high}</option>}
        </select>
      </div>
      <p className="px-2 pb-1 pt-1 text-xs text-muted" aria-live="polite">{l.count(count, total)}{pin ? ` · ${pin.source === "me" ? l.byDistanceMe : l.byDistance}` : ""}</p>
      {pin && (
        <button type="button" onClick={onClearPin} className="mx-1 mb-1 inline-flex min-h-9 items-center gap-1.5 self-start rounded-full px-2 text-xs text-accent hover:underline">
          <span aria-hidden="true">×</span> {l.clearSort}
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {count === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">{l.none}</p>
        ) : layer === "venues" ? (
          <ol aria-label={t.twin.venues} className="space-y-1">
            {venues.map((p) => {
              const isSel = p.place.key === selectedKey;
              const rank = places.indexOf(p) + 1; // the venue's place in the full ranking, not the filtered one
              return (
                <li key={p.place.key}>
                  <button type="button" aria-pressed={isSel} onClick={() => onSelectPlace(p)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-start text-sm ${isSel ? "bg-raised ring-1 ring-brand" : "hover:bg-raised"}`}>
                    <span className={`w-5 shrink-0 tabular-nums text-xs ${isSel ? "text-ink" : "text-accent"}`}>{String(rank).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{placeName(p.place, lang)}</span>
                      <span className="block truncate text-xs text-muted">{placeDistrict(p.place, lang)}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      {pin && <span className="block text-xs tabular-nums text-accent" dir="ltr">{fmtKm(kmOfPlace(p))}</span>}
                      <span className="block font-semibold leading-none tabular-nums text-ink">{p.events.length}</span>
                      {p.confirmed < p.events.length && <span className="block text-xs text-accent">{t.twin.inReview(p.events.length - p.confirmed)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <ol aria-label={t.twin.nextUp} className="space-y-1">
            {shownEvents.map((e) => {
              const d = new Date(`${e.start}T00:00:00Z`);
              const isSel = e.id === selectedEventId;
              return (
                <li key={e.id}>
                  <button type="button" aria-pressed={isSel} onClick={() => onSelectEvent(e.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start ${isSel ? "bg-raised ring-1 ring-brand" : "hover:bg-raised"}`}>
                    <span className="neu-raised grid h-10 w-10 shrink-0 place-content-center rounded-lg text-center leading-none">
                      <span className="text-sm font-semibold tabular-nums text-ink">{d.toLocaleDateString(locale, { day: "2-digit", timeZone: "UTC" })}</span>
                      <span className="mt-0.5 text-xs uppercase text-muted">{d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-start text-sm text-ink">{e.title}</span>
                      <span dir="auto" className="block truncate text-start text-xs text-muted">{[e.venue, e.city].filter(Boolean).join(" · ")}</span>
                    </span>
                    {pin && Number.isFinite(kmOfEvent(e)) && <span className="shrink-0 text-xs tabular-nums text-accent" dir="ltr">{fmtKm(kmOfEvent(e))}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t border-line px-2 pt-1">
        {layer === "venues"
          ? notOnMap && <p className="py-2 text-xs text-muted">{notOnMap}</p>
          : <Link to="/calendar" className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">{t.twin.viewCalendar}</Link>}
      </div>
    </div>
  );
}
