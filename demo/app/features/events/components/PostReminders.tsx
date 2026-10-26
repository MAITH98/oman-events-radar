import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { InfoPopup } from "../../../shared/ui/InfoPopup";
import { daysUntil } from "../../twin/stats";
import { formatDay } from "../filters";
import type { RadarEvent } from "../types";

const WINDOW_DAYS = 14;
const ACTIVE = new Set(["Upcoming", "Ongoing", "Rescheduled"]);

/** Every post deadline (content-plan step) due from today to `days` ahead, soonest first. */
export function dueSteps(events: RadarEvent[], today: string, days = WINDOW_DAYS) {
  const due: { event: RadarEvent; step: string; date: string; inDays: number }[] = [];
  for (const e of events) {
    if (!ACTIVE.has(e.status)) continue;
    for (const [step, date] of Object.entries(e.workflow)) {
      const n = daysUntil(date, today);
      if (n >= 0 && n <= days) due.push({ event: e, step, date, inDays: n });
    }
  }
  return due.sort((a, b) => a.date.localeCompare(b.date) || a.event.title.localeCompare(b.event.title));
}

/**
 * "Posts to prepare" reminder on the calendar: the hero's popup style, opened by itself once per browser session
 * and reopened from its button. Lists each post that must be ready in the next two weeks, grouped by day.
 */
export function PostReminders({ events, today }: { events: RadarEvent[]; today: string }) {
  const { t, locale } = useI18n();
  const r = t.calendar.reminders;
  const due = dueSteps(events, today);
  const days = [...new Set(due.map((d) => d.date))];

  return (
    <InfoPopup
      label={r.button(due.length)}
      title={r.title}
      body={due.length ? r.lead(WINDOW_DAYS) : r.none(WINDOW_DAYS)}
      close={t.hero.infoClose}
      autoOpenOnce="oer-post-reminders"
      wide
      className="neu-raised inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink transition hover:text-brand"
      trigger={
        <>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {r.button(due.length)}
        </>
      }
    >
      {due.length > 0 && (
        // Home's language: each day is a small chip, each post one of the automation's item cards
        <div className="space-y-4 p-1">
          {days.map((date) => {
            const n = daysUntil(date, today);
            return (
              <section key={date} aria-label={formatDay(date, locale)}>
                <p className="mb-2 inline-flex rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-accent">
                  {n === 0 ? r.today : n === 1 ? r.tomorrow : t.twin.inDays(n)} · {formatDay(date, locale)}
                </p>
                <ul className="space-y-2">
                  {due.filter((d) => d.date === date).map((d) => (
                    <li key={`${d.event.id}-${d.step}`} className="min-w-0">
                      <Link to={`/events/${d.event.id}`}
                        className="group block h-full rounded-xl border border-[var(--glass-edge)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--neu-raised-sm)] transition hover:border-brand">
                        <span className="block text-sm font-medium text-ink">{t.step[d.step] ?? d.step}</span>
                        {/* the title keeps its own direction (bdi) but lines up with the page; wraps, never cut mid-word */}
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted group-hover:underline"><bdi>{d.event.title}</bdi></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </InfoPopup>
  );
}
