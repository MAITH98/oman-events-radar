import { useMemo } from "react";
import { data, isRouteErrorResponse, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { fetchChanges, fetchEvents, fetchNews, fetchSourceHealth, RadarApiError } from "../features/events/api";
import { ApiErrorState } from "../features/events/components/ApiErrorState";
import { buildSuggestions } from "../features/events/suggestions";
import { DataGathering } from "../features/twin/components/DataGathering";
import { Hero } from "../features/twin/components/Hero";
import { TwinDashboard } from "../features/twin/components/TwinDashboard";
import { todayInMuscat } from "../features/twin/stats";
import { dict, langFromMatches, useI18n } from "../shared/i18n";

export function meta({ matches }: Route.MetaArgs) {
  const t = dict(langFromMatches(matches));
  return [{ title: t.home.metaTitle }, { name: "description", content: t.home.metaDescription }];
}

export async function loader({}: Route.LoaderArgs) {
  try {
    const [events, health, news, latestSequence] = await Promise.all([
      fetchEvents(),
      fetchSourceHealth(),
      fetchNews(),
      // Optional on this page: only the latest sequence number is shown.
      fetchChanges().then((c) => c.latestSequence, () => null),
    ]);
    // Stories that contain an event first, then the newest.
    const latestNews = [...news.articles]
      .sort((a, b) => Number(!!b.event) - Number(!!a.event) || b.published.localeCompare(a.published))
      .slice(0, 5);
    const newsStats = {
      total: news.articles.length,
      withEvent: news.articles.filter((a) => a.event).length,
      en: news.articles.filter((a) => a.lang === "en").length,
      ar: news.articles.filter((a) => a.lang === "ar").length,
    };
    return { ...events, health, latestNews, newsStats, latestSequence, today: todayInMuscat() };
  } catch (err) {
    const status = err instanceof RadarApiError ? err.status : 502;
    throw data(err instanceof RadarApiError ? err.message : "Unexpected error.", { status });
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const { t, locale } = useI18n();
  const suggestions = useMemo(
    () => buildSuggestions(loaderData.events, loaderData.today, locale, t.twin.eventsCount, (c) => t.category[c] ?? c),
    [loaderData.events, loaderData.today, locale, t],
  );
  return (
    // one rhythm: every card on Home sits 16 px from the next, as inside the dashboard
    <div className="space-y-4">
      <Hero query={(params.get("q") ?? "").slice(0, 100)} suggestions={suggestions} />
      <TwinDashboard events={loaderData.events} generatedAt={loaderData.generatedAt} today={loaderData.today} health={loaderData.health}
        news={loaderData.latestNews} />
      <DataGathering events={loaderData.events} health={loaderData.health} news={loaderData.newsStats} latestSequence={loaderData.latestSequence} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t, lang } = useI18n();
  // API error texts are English; Arabic readers get the translated generic message.
  const message = isRouteErrorResponse(error) && lang === "en" ? String(error.data) : t.common.unexpected;
  return <ApiErrorState message={message} />;
}
