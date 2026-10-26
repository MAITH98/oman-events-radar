import { Form, useSearchParams, useSubmit } from "react-router";
import type { Route } from "./+types/news";
import { fetchNews } from "../features/events/api";
import { NewsFront } from "../features/events/components/NewsFront";
import { todayInMuscat } from "../features/twin/stats";
import { dict, langFromMatches, useI18n } from "../shared/i18n";
import { PageHeader } from "../shared/ui/PageHeader";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: dict(langFromMatches(matches)).news.metaTitle }];
}

export async function loader({}: Route.LoaderArgs) {
  // today (Muscat) comes from the server, so the masthead date is the same in server and browser renders
  return { ...(await fetchNews()), today: todayInMuscat() };
}

const control = "neu-inset min-h-11 w-full rounded-[var(--radius-control)] px-3 text-base text-ink sm:text-sm";

export default function News({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const submit = useSubmit();
  const lang = params.get("lang") === "en" || params.get("lang") === "ar" ? params.get("lang") : "";
  const onlyEvents = params.get("show") === "events";
  const shown = loaderData.articles.filter((a) => (!lang || a.lang === lang) && (!onlyEvents || a.event));

  return (
    // Home's edges and rhythm: full container width, cards 16 px apart
    <div className="space-y-4">
      <PageHeader eyebrow={t.news.eyebrow} title={t.news.title} lead={t.news.intro} />

      <Form key={params.toString()} method="get" className="hud-panel grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t.news.language}
          <select name="lang" defaultValue={lang ?? ""} onChange={(e) => submit(e.currentTarget.form, { replace: true })} className={control}>
            <option value="">{t.news.all}</option>
            <option value="en">{t.news.english}</option>
            <option value="ar">{t.news.arabic}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t.news.show}
          <select name="show" defaultValue={onlyEvents ? "events" : ""} onChange={(e) => submit(e.currentTarget.form, { replace: true })} className={control}>
            <option value="">{t.news.everything}</option>
            <option value="events">{t.news.withEvent}</option>
          </select>
        </label>
      </Form>

      {loaderData.articles.length === 0 ? (
        <p className="hud-panel p-8 text-center text-muted">{t.news.unavailable}</p>
      ) : shown.length === 0 ? (
        <p className="well rounded-[var(--radius-card)] p-8 text-center text-muted">{t.news.empty}</p>
      ) : (
        <NewsFront articles={shown} today={loaderData.today} />
      )}
    </div>
  );
}
