import { MUSCAT, OMAN } from "../geo/basemap";
import { useI18n } from "../../../shared/i18n";
import { formatCoords, placeDistrict, placeName, type Place } from "../places";
import { toPlane } from "../projection";

/** Square "where is it" tile: real roads around the venue, a glowing pin, name and coordinates. */
export function LocationTile({ place, count }: { place: Place; count: number }) {
  const { t, lang } = useI18n();
  const inMuscat = place.scope === "muscat";
  const plane = inMuscat ? MUSCAT : OMAN;
  const [x, y] = toPlane(plane, place.lat, place.lon);
  const half = inMuscat ? 70 : 90;

  return (
    <figure className="well overflow-hidden rounded-[var(--radius-control)]">
      <div className="relative aspect-[16/9] bg-[var(--tile-bg)]">
      <svg viewBox={`${x - half} ${y - half} ${half * 2} ${half * 2}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {inMuscat ? (
          <>
            <path d={MUSCAT.roadsMinor} fill="none" stroke="var(--tile-road)" strokeWidth={2.6} strokeLinecap="round" />
            <path d={MUSCAT.roadsMajor} fill="none" stroke="var(--tile-road-major)" strokeWidth={4.5} strokeLinecap="round" />
            <path d={MUSCAT.coast} fill="none" stroke="var(--tile-coast)" strokeWidth={1.4} />
          </>
        ) : (
          OMAN.outline.map((d, i) => <path key={i} d={d} fill="var(--tile-land)" stroke="var(--tile-road-major)" strokeWidth={1.2} />)
        )}
        <circle cx={x} cy={y} r={half * 0.07} fill="var(--tile-pin)" stroke="var(--map-pin-core)" strokeWidth={half * 0.025} />
      </svg>
      </div>
      <figcaption className="border-t border-line px-4 py-3">
        <p className="text-lg font-semibold text-ink [overflow-wrap:anywhere]">{placeName(place, lang)}</p>
        <p className="tabular-nums text-sm text-ink" dir="ltr">{formatCoords(place.lat, place.lon)}</p>
        <p className="mt-0.5 text-xs text-muted">
          {placeDistrict(place, lang)} · {t.twin.eventsCount(count)}
        </p>
      </figcaption>
    </figure>
  );
}
