import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { formatRange } from "../filters";
import type { RadarEvent } from "../types";
import { Badge, CategoryBadge, RelevanceBadge, StatusBadge } from "./Badges";

export function EventCard({ event }: { event: RadarEvent }) {
  const { t, locale } = useI18n();
  const start = new Date(`${event.start}T00:00:00Z`);
  const place = [event.venue || event.city, event.organizer].filter(Boolean).join(" · ");

  return (
    // Home's item card (as in the automation). Fixed structure, so every card in the agenda is the same height:
    // title (exactly 2 lines' height) → dates → place (1 reserved line, cut with …) → badges pinned to the bottom.
    <article className="relative flex h-full gap-4 rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] p-4 shadow-[var(--neu-raised-sm)] transition hover:-translate-y-0.5 hover:border-brand">
      <div aria-hidden="true" className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-raised py-1.5">
        <span className="tabular-nums text-2xl font-semibold leading-tight">{start.getUTCDate()}</span>
        <span className="text-xs text-muted">{start.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className={`line-clamp-2 h-[2lh] font-semibold [overflow-wrap:anywhere] ${event.status === "Removed" ? "line-through" : ""}`} title={event.title}>
          {/* Stretched link: the whole card is clickable, the heading stays the accessible name. */}
          <Link to={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-['']">
            <bdi>{event.title}</bdi>
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">{formatRange(event.start, event.end, locale)}</p>
        <p className="min-h-[1lh] truncate text-sm text-muted" title={place || undefined}>{place && <bdi>{place}</bdi>}</p>
        {/* one line of badges at every width (equal card heights); relevance never shortens, a long category does */}
        <div className="mt-auto flex gap-1.5 overflow-hidden pt-2 [&>*:first-child]:shrink-0">
          <RelevanceBadge relevance={event.relevance} />
          <CategoryBadge category={event.category} />
          {event.region && event.region !== "Oman" && <Badge>{t.region[event.region] ?? event.region}</Badge>}
          <StatusBadge status={event.status} />
        </div>
      </div>
    </article>
  );
}
