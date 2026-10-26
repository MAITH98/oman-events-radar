import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { formatMonth } from "../filters";
import { monthGrid, weekdayNames } from "../calendar";
import type { RadarEvent } from "../types";

function dotClass(e: RadarEvent) {
  if (e.status === "Cancelled") return "bg-ember";
  if (e.relevance === "High") return "bg-accent";
  return "bg-[var(--logo-line)] opacity-70";
}

/**
 * Month view. Seven fixed columns that always fit (≥ 38 px at 320 px wide): phones see day numbers and
 * dots, wider screens see linked event chips. The agenda below the grid lists the same events for phones.
 */
export function MonthGrid({
  month,
  events,
  today,
  prevHref,
  nextHref,
}: {
  month: string;
  events: RadarEvent[];
  today: string;
  prevHref: string;
  nextHref: string;
}) {
  const { t, locale } = useI18n();
  const cells = monthGrid(month, events);
  const title = formatMonth(`${month}-01`, locale);
  const navBtn = "neu-raised grid h-11 w-11 place-items-center rounded-full text-ink transition hover:text-brand active:shadow-[var(--neu-inset)]";

  return (
    <section className="hud-panel p-3 sm:p-5" aria-labelledby="month-title">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link to={prevHref} className={navBtn} aria-label={t.calendar.prev} preventScrollReset>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 rtl:rotate-180"><path d="M12 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
        <h2 id="month-title" className="text-h3" aria-live="polite">{title}</h2>
        <Link to={nextHref} className={navBtn} aria-label={t.calendar.next} preventScrollReset>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 rtl:rotate-180"><path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
      </header>

      <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium uppercase tracking-wide text-muted sm:gap-1.5">
        {weekdayNames(locale).map((d) => <span key={d}>{d}</span>)}
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((c, i) =>
          c === null ? (
            <li key={`pad-${i}`} aria-hidden="true" className="min-h-12 sm:min-h-28" />
          ) : (
            <li
              key={c.iso}
              className={`flex min-h-12 min-w-0 flex-col rounded-lg border p-1 sm:min-h-28 sm:rounded-xl sm:p-1.5 ${
                c.iso === today ? "border-brand bg-raised" : c.events.length ? "border-line bg-raised/60" : "border-line/60"
              }`}
            >
              <span className={`text-xs tabular-nums sm:text-sm ${c.iso === today ? "font-semibold text-brand" : "text-muted"}`}>
                <span aria-hidden="true">{c.day}</span>
                <span className="sr-only">
                  {new Date(`${c.iso}T00:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                  {c.iso === today ? `, ${t.calendar.today}` : ""}, {t.twin.eventsCount(c.events.length)}
                </span>
              </span>
              {/* phones: dots only (decorative; the agenda below is the accessible list) */}
              {c.events.length > 0 && (
                <span aria-hidden="true" className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                  {c.events.slice(0, 3).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${dotClass(e)}`} />)}
                </span>
              )}
              <ul className="mt-1 hidden min-w-0 space-y-1 sm:block">
                {c.events.slice(0, 2).map((e) => (
                  <li key={e.id}>
                    <Link to={`/events/${e.id}`} className="flex min-h-6 min-w-0 items-center gap-1 rounded-md bg-surface px-1.5 py-1 text-xs leading-tight text-ink hover:ring-1 hover:ring-brand" dir="auto">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(e)}`} />
                      <span className="truncate">{e.title}</span>
                    </Link>
                  </li>
                ))}
                {c.events.length > 2 && <li className="px-1.5 text-xs text-muted">{t.calendar.more(c.events.length - 2)}</li>}
              </ul>
            </li>
          ),
        )}
      </ol>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />{t.calendar.legendHigh}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--logo-line)] opacity-70" />{t.calendar.legendOther}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-ember" />{t.calendar.legendCancelled}</span>
      </p>
    </section>
  );
}
