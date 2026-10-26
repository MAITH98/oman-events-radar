import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/changes";
import { fetchChanges, RadarApiError } from "../features/events/api";
import { ApiErrorState } from "../features/events/components/ApiErrorState";
import { Badge } from "../features/events/components/Badges";
import { formatDay } from "../features/events/filters";
import { dict, langFromMatches, useI18n } from "../shared/i18n";
import { PageHeader } from "../shared/ui/PageHeader";
import { Panel } from "../shared/ui/Panel";
import { PAGE_HEADERS } from "../shared/http";

const TYPE_STYLE: Record<string, string> = {
  "event.created": "bg-high-bg text-high",
  "event.updated": "bg-low-bg text-low",
  "event.rescheduled": "bg-medium-bg text-medium",
  "event.cancelled": "bg-alert-bg text-alert",
  "event.removed": "bg-alert-bg text-alert",
};

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: dict(langFromMatches(matches)).changes.metaTitle }];
}

// Preference-dependent HTML: never shared, always revalidated (see shared/http.ts).
export function headers() {
  return PAGE_HEADERS;
}

export async function loader({}: Route.LoaderArgs) {
  try {
    const feed = await fetchChanges();
    return { latestSequence: feed.latestSequence, total: feed.changes.length, changes: feed.changes.slice(0, 50) };
  } catch (err) {
    if (err instanceof RadarApiError) throw data(err.message, { status: err.status });
    throw err;
  }
}

export default function Changes({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  return (
    // Home's rhythm: cards 16 px apart
    <div className="space-y-4">
      <PageHeader eyebrow={t.nav.changes} title={t.changes.title} lead={t.changes.intro(loaderData.latestSequence, loaderData.changes.length, loaderData.total)} />
      <Panel title={t.changes.listTitle} sub={t.changes.latest(loaderData.latestSequence)}>
        <ol className="divide-y divide-line">
          {loaderData.changes.map((c) => (
            <li key={c.sequence} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[4rem_7rem_minmax(0,1fr)_auto]">
              <span className="text-sm tabular-nums text-muted"><bdi>#{c.sequence}</bdi></span>
              <span><Badge className={TYPE_STYLE[c.type] ?? undefined}>{t.changeType[c.type] ?? c.type}</Badge></span>
              <Link to={`/events/${c.eventId}`} className="col-span-2 min-w-0 font-medium [overflow-wrap:anywhere] hover:underline sm:col-span-1">
                <bdi>{c.title}</bdi>
              </Link>
              <span className="col-span-2 text-sm text-muted sm:col-span-1">
                {formatDay(c.start, locale)} · v{c.eventVersion}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t, lang } = useI18n();
  const message = isRouteErrorResponse(error) && lang === "en" ? String(error.data) : t.common.unexpected;
  return <ApiErrorState message={message} />;
}
