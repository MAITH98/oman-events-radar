import { useId, useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { formatRange } from "../../events/filters";
import { NewsShowcase } from "../../events/components/NewsShowcase";
import type { SourceHealth } from "../../events/api";
import type { NewsArticle, RadarEvent } from "../../events/types";
import { AREAS } from "../geo/areas";
import { groupByPlace } from "../places";
import { categoryCounts, daysUntil, liveEvents, monthCounts, upcomingIncludingReview } from "../stats";
import { BarList, ColumnChart } from "./Charts";
import { Segmented } from "../../../shared/ui/Segmented";
import { Panel } from "../../../shared/ui/Panel";
import { LogoLoop } from "./LogoLoop";
import { MapList } from "./MapList";
import { PlaceSpotlight } from "./PlaceSpotlight";
import { TwinMap, type Layer, type MapPin } from "./TwinMap";

interface Props {
  events: RadarEvent[];
  generatedAt: string;
  today: string;
  health: SourceHealth | null;
  news: NewsArticle[];
}

/**
 * Layout (reference: ØER control-room mock): status line · KPI strip · one map card (map with its own venues /
 * events list | picture of the chosen venue or event) · news | trends. The hero above holds the h1.
 * Selection (venue / event), map layer, list and pin are local UI state of this dashboard; zoom lives in the map.
 */
export function TwinDashboard({ events, generatedAt, today, health, news }: Props) {
  const { t, lang, locale } = useI18n();
  const live = liveEvents(events);
  const { places, unspecified, abroad } = groupByPlace(upcomingIncludingReview(events));
  // a dropped pin or "locate me" position: kept in this page only, used to sort the list by distance
  const [pin, setPin] = useState<MapPin | null>(null);
  const [area, setArea] = useState<{ key: string; n: number } | null>(null);
  const areaId = useId();
  const [layer, setLayer] = useState<Layer>("venues");
  const [listOpen, setListOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(places[0]?.place.key ?? null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selected = places.find((p) => p.place.key === selectedKey) ?? places[0];
  const mapped = places.flatMap((p) => p.events.map((e) => ({ e, key: p.place.key })));
  const selectedEvent = mapped.find((m) => m.e.id === selectedEventId)?.e ?? null;

  /** Choose one event: the map switches to the events layer (and flies to it) and the picture shows it. */
  function selectEvent(id: string) {
    const hit = mapped.find((m) => m.e.id === id);
    if (!hit) return;
    setSelectedKey(hit.key);
    setSelectedEventId(id);
    setLayer("events");
  }
  const upcomingMapped = [...mapped].sort((a, b) => a.e.start.localeCompare(b.e.start));

  const next = live.filter((e) => e.start >= today).sort((a, b) => a.start.localeCompare(b.start));

  const listId = useId();
  /*
   * One 12-column grid, so every gutter lines up row to row:
   *   KPIs 3·3·3·3  ·  map card 12 (map 8 | picture 4 inside)  ·  news 8 | trends 4.
   * Every card fills its cell (equal bottoms per row); "see more" links sit on the card's bottom edge.
   * Below lg the cards stack in reading order; KPIs stay a 2 × 2 block.
   */
  return (
    <div className="space-y-4">
      {/* ---- the sources, as a logo loop (replaces the status line and number tiles) ---- */}
      <LogoLoop sources={health?.sources ?? []} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ---- row 2: one connected card — map (with its own venues / events list) | picture ---- */}
        <Panel id="map" className="scroll-mt-28 lg:col-span-12" title={t.twin.map} hideTitle>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Segmented label={t.twin.layerLabel} value={layer} onChange={(v) => { setLayer(v); setListOpen(false); }}
                  options={[{ value: "venues", label: t.twin.layerVenues }, { value: "events", label: t.twin.layerEvents }]} />
                <div className="flex flex-wrap items-center gap-2">
                  {/* go to a governorate or one of its cities */}
                  <label className="sr-only" htmlFor={areaId}>{t.twin.goTo}</label>
                  <select id={areaId} value="" onChange={(e) => { if (e.target.value) setArea({ key: e.target.value, n: Date.now() }); }}
                    className="neu-inset min-h-11 max-w-[13rem] rounded-full px-4 text-sm text-ink">
                    <option value="">{t.twin.goTo}</option>
                    {AREAS.map((g) => (
                      <optgroup key={g.id} label={lang === "ar" ? g.nameAr : g.name}>
                        <option value={g.id}>{t.twin.wholeGov(lang === "ar" ? g.nameAr : g.name)}</option>
                        {g.cities.map((ct) => <option key={ct.key} value={ct.key}>{lang === "ar" ? ct.nameAr : ct.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" aria-expanded={listOpen} aria-controls={listId} onClick={() => setListOpen((o) => !o)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${listOpen ? "btn-primary" : "neu-raised text-ink hover:text-brand"}`}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01" /></svg>
                    {t.twin.list}
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl">
                <TwinMap layer={layer} groups={places} selectedKey={selectedKey} selectedEventId={layer === "events" ? selectedEventId : null}
                  pin={pin} area={area} onPin={setPin} onSelect={setSelectedKey} onSelectEvent={(id) => selectEvent(id)} />

                {/* the list: floats over the map's end edge from sm up; sits under the map on phones */}
                {listOpen && (
                  // key={layer}: switching Venues / Events starts the list's search afresh
                  <MapList key={layer} id={listId} layer={layer} places={places} events={upcomingMapped.map((m) => m.e)}
                    selectedKey={selected?.place.key ?? null} selectedEventId={selectedEventId}
                    notOnMap={unspecified > 0 || abroad > 0 ? t.twin.notOnMap(unspecified, abroad) : null}
                    pin={pin} onClearPin={() => setPin(null)}
                    onSelectPlace={(p) => setSelectedKey(p.place.key)}
                    onSelectEvent={selectEvent} />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="h-2.5 w-2.5 bg-[var(--map-event)]" /> {layer === "venues" ? t.twin.legendVenueCount : t.twin.legendEvent}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="h-2.5 w-2.5 border-2 border-[var(--map-event)]" /> {t.twin.legendReview}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="h-2.5 w-2.5 bg-[var(--map-event)] outline outline-2 outline-[var(--map-tag-ink)]" /> {t.twin.legendSelected}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[var(--map-pin)] ring-1 ring-[var(--map-border)]" /> {t.twin.legendPin}</span>
                </span>
                <span>
                  {t.twin.attribution}{" "}
                  <a className="underline hover:text-ink" href="https://simplemaps.com" target="_blank" rel="noopener noreferrer">simplemaps</a>{" · "}
                  <a className="underline hover:text-ink" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>{" "}
                  {t.twin.contributors}
                </span>
              </div>
            </div>

            {selected && (
              <PlaceSpotlight layer={layer} group={selected} event={layer === "events" ? selectedEvent : null} today={today} onPickEvent={selectEvent} />
            )}
          </div>
        </Panel>

        {/* ---- row 4: news | trends ---- */}
        {news.length > 0 && (
          <Panel className="lg:col-span-8" title={t.news.latest}>
            <NewsShowcase articles={news} />
          </Panel>
        )}
        <div className={`grid gap-4 ${news.length > 0 ? "lg:col-span-4" : "sm:grid-cols-2 lg:col-span-12"}`}>
          <Panel title={t.twin.perMonth} sub={t.twin.next6}>
            <ColumnChart data={monthCounts(live, today, locale)} unit={t.twin.unit} />
          </Panel>
          <Panel title={t.twin.categoryMix} sub={t.twin.liveEvents}>
            <BarList data={categoryCounts(live).map((d) => ({ ...d, label: t.category[d.label] ?? d.label }))} unit={t.twin.unit} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
