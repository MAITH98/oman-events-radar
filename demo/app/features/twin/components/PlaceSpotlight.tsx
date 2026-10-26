import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { usePrefersStill } from "../../../shared/ui/motion";
import { formatRange } from "../../events/filters";
import type { RadarEvent } from "../../events/types";
import { formatCoords, placeDistrict, placeName, type PlaceGroup } from "../places";
import { daysUntil } from "../stats";
import { LocationTile } from "./LocationTile";
import { isPlaceholder, previewUrl } from "../../media/urls";

/** The event's own picture (a static file from the daily build); falls back to the place's mini map when there is none. */
function Picture({ event, group }: { event: RadarEvent | null; group: PlaceGroup }) {
  const [failed, setFailed] = useState<string | null>(null);
  const id = event?.url ? event.id : null;
  if (!id || failed === id) {
    return (
      <div className="absolute inset-0 [&_figure]:h-full [&_figure]:rounded-none [&_figure]:border-0 [&_figure>div]:aspect-auto [&_figure>div]:h-full [&_figcaption]:hidden">
        <LocationTile place={group.place} count={group.events.length} />
      </div>
    );
  }
  return (
    <img
      key={id}
      src={previewUrl("event", id)}
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => isPlaceholder(e.currentTarget) && setFailed(id)}
      onError={() => setFailed(id)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/**
 * The picture side of the venue map card: the chosen venue (shown through its next event's picture) or the chosen
 * event, as a large image with its name over it, then its details. Venues list their next events — picking one
 * switches the map to the events layer on that event.
 */
export function PlaceSpotlight({
  layer,
  group,
  event,
  today,
  onPickEvent,
}: {
  layer: "venues" | "events";
  group: PlaceGroup;
  event: RadarEvent | null;
  today: string;
  onPickEvent: (id: string) => void;
}) {
  const { t, lang, locale } = useI18n();
  const still = usePrefersStill();
  const upcoming = [...group.events].sort((a, b) => a.start.localeCompare(b.start));
  const shown = layer === "events" && event ? event : upcoming.find((e) => e.url) ?? upcoming[0] ?? null;
  const title = layer === "events" && event ? event.title : placeName(group.place, lang);
  const key = `${layer}:${layer === "events" ? event?.id : group.place.key}`;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="well relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={key}
            className="absolute inset-0"
            initial={still ? false : { opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={still ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Picture event={shown} group={group} />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
              <p className="text-xs text-white/80">
                {layer === "events" && event ? <bdi>{[event.venue, event.city].filter(Boolean).join(" · ") || placeName(group.place, lang)}</bdi> : placeDistrict(group.place, lang)}
              </p>
              <h3 className="mt-1 line-clamp-2 text-h3 text-white"><bdi>{title}</bdi></h3>
              <p className="mt-1 text-xs text-white/80" dir="ltr">
                {layer === "events" && event ? formatRange(event.start, event.end, locale) : formatCoords(group.place.lat, group.place.lon)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {layer === "events" && event ? (
        <div className="space-y-2 px-1">
          <p className="text-sm text-muted">
            {t.category[event.category] ?? event.category} · {t.twin.inDays(daysUntil(event.start, today))}
          </p>
          <Link to={`/events/${event.id}`} className="btn-primary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">
            {t.twin.openEvent}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.slice(0, 3).map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onPickEvent(e.id)} className="block min-h-11 w-full rounded-lg px-2 py-2 text-start hover:bg-raised">
                <span dir="auto" className="block truncate text-start text-sm text-ink">{e.title}</span>
                <span className="text-xs text-muted">{formatRange(e.start, e.end, locale)} · {t.twin.inDays(daysUntil(e.start, today))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
