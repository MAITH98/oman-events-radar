import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/event";
import { describeSource, fetchChanges, fetchEvents, RadarApiError, safeUrl } from "../features/events/api";
import { ApiErrorState } from "../features/events/components/ApiErrorState";
import { CategoryBadge, RelevanceBadge, StatusBadge } from "../features/events/components/Badges";
import { StoryImage } from "../features/events/components/StoryImage";
import { WorkflowTimeline } from "../features/events/components/WorkflowTimeline";
import { SourceLogo } from "../features/twin/components/SourceLogo";
import { formatDay, formatLongRange } from "../features/events/filters";
import { dict, langFromMatches, useI18n } from "../shared/i18n";
import { PAGE_HEADERS } from "../shared/http";
import { HeroBackdrop } from "../shared/ui/HeroBackdrop";
import { Panel } from "../shared/ui/Panel";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const t = dict(langFromMatches(matches));
  return [{ title: loaderData ? `${loaderData.event.title} — ${t.nav.brand}` : t.event.metaFallback }];
}

// Preference-dependent HTML: never shared, always revalidated (see shared/http.ts).
export function headers() {
  return PAGE_HEADERS;
}

export async function loader({ params }: Route.LoaderArgs) {
  try {
    // Two API calls in parallel: the event list and its change history.
    const [{ events }, { changes }] = await Promise.all([fetchEvents(), fetchChanges()]);
    const event = events.find((e) => e.id === params.id);
    if (!event) throw data("not-found", { status: 404 });
    const history = changes.filter((c) => c.eventId === event.id);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
    return { event, history, today };
  } catch (err) {
    if (err instanceof RadarApiError) throw data(err.message, { status: err.status });
    throw err;
  }
}

export default function EventPage({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  const { event, history, today } = loaderData;
  const link = safeUrl(event.url);
  const place = [event.venue, event.city].filter(Boolean).join(", ");
  // the published time, when the source gives one (Muscat time)
  const time = event.start_time ? (event.end_time ? `${event.start_time}–${event.end_time}` : event.start_time) : "";
  const when = time ? `${formatLongRange(event.start, event.end, locale)} · ${time}` : formatLongRange(event.start, event.end, locale);
  // the radar's source ids ("news:omandaily") shown by name, each once
  const sources = [...new Map(event.sources.map((s) => { const d = describeSource(s); return [d.name, d] as const; })).values()];
  const rows: [string, React.ReactNode][] = [
    [t.event.dates, when],
    [t.event.venue, place],
    [t.event.organiser, event.organizer],
    [t.event.tickets, event.ticket_price],
    [t.event.region, event.region ? t.region[event.region] ?? event.region : ""],
    [t.event.confidence, `${event.confidence} / 100`],
  ];

  return (
    // Home's edges and rhythm: full container width, cards 16 px apart
    <article className="space-y-4">
      {/* ---- header: a hero-style card — the event's facts | its picture ---- */}
      <header className="relative isolate grid gap-8 rounded-[2rem] border border-[var(--glass-edge)] p-5 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
        <HeroBackdrop />
        <div className="min-w-0">
          <Link to="/calendar" className="inline-flex min-h-11 items-center text-xs font-medium uppercase tracking-[0.2em] text-muted underline-offset-4 hover:text-ink hover:underline rtl:tracking-normal">
            {t.event.back}
          </Link>
          <h1 className="mt-2 text-h1 text-ink [overflow-wrap:anywhere] [text-wrap:balance]"><bdi>{event.title}</bdi></h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <RelevanceBadge relevance={event.relevance} />
            <CategoryBadge category={event.category} />
            <StatusBadge status={event.status} />
          </div>
          {event.previous_start && <p className="mt-2 text-sm text-alert">{t.event.rescheduledFrom(formatDay(event.previous_start, locale))}</p>}
          <p className="mt-5 text-lead text-ink"><bdi>{when}</bdi></p>
          {place && <p className="mt-1 text-sm text-muted"><bdi>{place}</bdi></p>}
          {event.description && <p className="mt-4 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]"><bdi>{event.description}</bdi></p>}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="btn-primary mt-6 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">
              {t.event.official}
            </a>
          )}
        </div>
        <figure className="well relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]">
          <StoryImage kind="event" id={event.id} fallbackInset="bottom-0" whole />
          <figcaption className="sr-only">{t.event.picture}</figcaption>
        </figure>
      </header>

      {/* ---- details | content plan ---- */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title={t.event.details} className="lg:col-span-5">
          <dl className="divide-y divide-line">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink [overflow-wrap:anywhere]"><bdi>{v}</bdi></dd>
              </div>
            ))}
            {sources.length > 0 && (
              <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
                <dt className="text-muted">{t.event.sources}</dt>
                <dd className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-2 rounded-full bg-raised py-0.5 pe-2.5 ps-0.5">
                      <SourceLogo name={s.name} site={s.site} className="h-6 w-6" />
                      <bdi>{s.name}</bdi>
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Panel>

        <Panel title={t.event.contentPlan} className="lg:col-span-7">
          <WorkflowTimeline workflow={event.workflow} today={today} />
        </Panel>
      </div>

      {/* ---- hashtags | change history ---- */}
      <div className="grid gap-4 lg:grid-cols-12">
        {event.hashtags.length > 0 && (
          <Panel title={t.event.hashtags} className="lg:col-span-5">
            <ul className="flex flex-wrap gap-2">
              {event.hashtags.map((h) => (
                <li key={h} className="rounded-full bg-raised px-3 py-1 text-sm text-ink"><bdi>{h}</bdi></li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title={t.event.history} className={event.hashtags.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}>
          {history.length === 0 ? (
            <p className="well grid flex-1 place-items-center rounded-[var(--radius-control)] p-6 text-center text-sm text-muted">{t.event.noHistory}</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {history.map((c) => (
                <li key={c.sequence} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="w-14 tabular-nums text-muted"><bdi>#{c.sequence}</bdi></span>
                  <span className="text-ink">{t.changeType[c.type] ?? c.type}</span>
                  <span className="ms-auto text-muted">{formatDay(c.occurredAt.slice(0, 10), locale)} · v{c.eventVersion}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </article>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t, lang } = useI18n();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="hud-panel mx-auto max-w-xl p-6 text-center">
        <h1 className="text-xl font-semibold">{t.event.notFoundTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.event.notFoundText}</p>
        <Link to="/calendar" className="mt-4 inline-block text-brand underline">{t.event.backHome}</Link>
      </div>
    );
  }
  const message = isRouteErrorResponse(error) && lang === "en" ? String(error.data) : t.common.unexpected;
  return <ApiErrorState message={message} />;
}
