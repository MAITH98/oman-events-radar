import { useMemo } from "react";
import { data, isRouteErrorResponse, Link, redirect } from "react-router";
import type { Route } from "./+types/search";
import { fetchEvents, fetchNews, RadarApiError } from "../features/events/api";
import { ApiErrorState } from "../features/events/components/ApiErrorState";
import { ResultCard } from "../features/events/components/ResultCard";
import { searchAll, type ResultKind } from "../features/events/searchResults";
import { buildSuggestions } from "../features/events/suggestions";
import { todayInMuscat } from "../features/twin/stats";
import { dict, langFromMatches, useI18n } from "../shared/i18n";
import { HeroBackdrop } from "../shared/ui/HeroBackdrop";
import { Eyebrow } from "../shared/ui/PageHeader";
import { Panel } from "../shared/ui/Panel";
import { SearchPill } from "../shared/ui/SearchPill";

export function meta({ matches, location }: Route.MetaArgs) {
  const q = new URLSearchParams(location.search).get("q") ?? "";
  return [{ title: dict(langFromMatches(matches)).search.metaTitle(q) }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  // The page only exists after a search: no query, back to the home page.
  if (!q) throw redirect("/");
  try {
    const [{ events }, { articles }] = await Promise.all([fetchEvents(), fetchNews()]);
    return { q, events, news: articles, today: todayInMuscat() };
  } catch (err) {
    const status = err instanceof RadarApiError ? err.status : 502;
    throw data(err instanceof RadarApiError ? err.message : "Unexpected error.", { status });
  }
}

const SECTIONS: { kinds: ResultKind[]; key: "events" | "news" | "places" }[] = [
  { kinds: ["event"], key: "events" },
  { kinds: ["news"], key: "news" },
  { kinds: ["venue", "organiser"], key: "places" },
];

export default function Search({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  const { q, events, news, today } = loaderData;
  const category = (c: string) => t.category[c] ?? c;
  const results = useMemo(() => searchAll(q, events, news, today, locale, t.twin.eventsCount, category), [q, events, news, today, locale, t]);
  const suggestions = useMemo(() => buildSuggestions(events, today, locale, t.twin.eventsCount, category), [events, today, locale, t]);
  const total = results.event.length + results.news.length + results.venue.length + results.organiser.length;

  return (
    // Home's rhythm: cards 16 px apart
    <div className="space-y-4">
      {/* the home hero's card, compact: what was searched, how much was found, search again */}
      <section aria-labelledby="search-title" className="relative isolate z-10 rounded-[2rem] border border-[var(--glass-edge)] px-5 py-10 sm:px-10 sm:py-12">
        <HeroBackdrop />
        <Eyebrow className="text-muted">{t.search.eyebrow}</Eyebrow>
        <h1 id="search-title" className="mt-4 text-h1 text-ink [overflow-wrap:anywhere]">
          {t.search.title} <span className="text-accent"><bdi>{t.search.quote(q)}</bdi></span>
        </h1>
        <p className="mt-3 text-lead text-muted" aria-live="polite">{t.search.summary(total)}</p>
        <div className="mt-8 max-w-xl">
          <SearchPill key={q} action="/search" label={t.hero.searchLabel} placeholder={t.hero.searchPlaceholder} button={t.hero.searchButton}
            defaultValue={q} suggestions={suggestions} suggestLabels={t.suggest} />
        </div>
      </section>

      {total === 0 ? (
        <div className="well rounded-[var(--radius-card)] p-8 text-center">
          <p className="text-h3 text-ink">{t.search.none}</p>
          <p className="measure mx-auto mt-2 text-muted">{t.search.noneHint}</p>
          <Link to="/calendar" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">{t.search.openCalendar}</Link>
        </div>
      ) : (
        SECTIONS.map(({ kinds, key }) => {
          const items = kinds.flatMap((k) => results[k]);
          if (!items.length) return null;
          return (
            <Panel key={key} title={t.search.sections[key]} sub={t.search.count(items.length)}>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((r) => (
                  <li key={r.key}>
                    <ResultCard result={r} />
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })
      )}
      {total > 0 && <p className="px-1 py-2 text-xs text-muted">{t.search.imageNote}</p>}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t, lang } = useI18n();
  const message = isRouteErrorResponse(error) && lang === "en" ? String(error.data) : t.common.unexpected;
  return <ApiErrorState message={message} />;
}
