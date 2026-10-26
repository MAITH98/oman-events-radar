import { useMemo } from "react";
import { data, isRouteErrorResponse, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/calendar";
import { fetchEvents, RadarApiError } from "../features/events/api";
import { readMonth, shiftMonth } from "../features/events/calendar";
import { ApiErrorState } from "../features/events/components/ApiErrorState";
import { EventCard } from "../features/events/components/EventCard";
import { EventFiltersBar } from "../features/events/components/EventFiltersBar";
import { MonthGrid } from "../features/events/components/MonthGrid";
import { PostReminders } from "../features/events/components/PostReminders";
import { categoriesOf, filterEvents, groupByMonth, readFilters } from "../features/events/filters";
import { buildSuggestions } from "../features/events/suggestions";
import { todayInMuscat } from "../features/twin/stats";
import { dict, langFromMatches, useI18n } from "../shared/i18n";
import { PageHeader } from "../shared/ui/PageHeader";
import { Panel } from "../shared/ui/Panel";

export function meta({ matches }: Route.MetaArgs) {
  const t = dict(langFromMatches(matches));
  return [{ title: t.calendar.metaTitle }];
}

export async function loader({}: Route.LoaderArgs) {
  try {
    return { ...(await fetchEvents()), today: todayInMuscat() };
  } catch (err) {
    const status = err instanceof RadarApiError ? err.status : 502;
    throw data(err instanceof RadarApiError ? err.message : "Unexpected error.", { status });
  }
}

export default function Calendar({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const filters = readFilters(params);
  const month = readMonth(params, loaderData.today);
  const shown = filterEvents(loaderData.events, filters);
  const groups = groupByMonth(shown, locale);
  const suggestions = useMemo(
    () => buildSuggestions(loaderData.events, loaderData.today, locale, t.twin.eventsCount, (c) => t.category[c] ?? c),
    [loaderData.events, loaderData.today, locale, t],
  );

  const hrefFor = (m: string) => {
    const next = new URLSearchParams(params);
    next.set("month", m);
    return `?${next}`;
  };

  return (
    // Home's rhythm: cards 16 px apart
    <div className="space-y-4">
      <PageHeader eyebrow={t.calendar.eyebrow} title={t.calendar.title} lead={t.home.intro(loaderData.events.length)}>
        <PostReminders events={loaderData.events} today={loaderData.today} />
      </PageHeader>

      {/* key resets the uncontrolled fields when the URL changes (back/forward buttons) */}
      <EventFiltersBar key={params.toString()} filters={filters} categories={categoriesOf(loaderData.events)}
        keep={params.has("month") ? { month } : {}} suggestions={suggestions} />

      <MonthGrid month={month} events={shown} today={loaderData.today} prevHref={hrefFor(shiftMonth(month, -1))} nextHref={hrefFor(shiftMonth(month, 1))} />

      <Panel title={t.calendar.agenda}
        sub={<span aria-live="polite">{navigation.state === "loading" ? t.home.updating : t.home.count(shown.length)}</span>}>
        {groups.length === 0 ? (
          <p className="well rounded-[var(--radius-card)] p-8 text-center text-muted">{t.home.noMatch}</p>
        ) : (
          <div className="space-y-6">
            {groups.map((g, i) => (
              <section key={g.month} aria-labelledby={`month-${i}`}>
                <h3 id={`month-${i}`} className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted rtl:tracking-normal">{g.month}</h3>
                <ul className="grid auto-rows-fr gap-3 lg:grid-cols-2">
                  {g.events.map((e) => (
                    <li key={e.id} className="min-w-0">
                      <EventCard event={e} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t, lang } = useI18n();
  const message = isRouteErrorResponse(error) && lang === "en" ? String(error.data) : t.common.unexpected;
  return <ApiErrorState message={message} />;
}
