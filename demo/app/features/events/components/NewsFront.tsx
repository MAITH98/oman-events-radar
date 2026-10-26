import { useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { formatDay, formatRange } from "../filters";
import type { NewsArticle } from "../types";
import { StoryImage } from "./StoryImage";

/*
 * The news as a newspaper front page, inside one of Home's cards: a masthead over a double rule, the lead story
 * large with its picture, five compact side stories, then the rest in ruled columns — each with its own picture
 * (a static file from the daily build). A story without a picture runs as text only; the lead keeps the engraved radar. Headlines and summaries keep their own language
 * and direction (`lang` + `bdi`) but line up with the page. Pictures below the fold load lazily.
 */

const SIDE = 5;

/** Source · date line above a headline (a newspaper "kicker"). */
function Kicker({ article }: { article: NewsArticle }) {
  const { locale } = useI18n();
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
      <span className="font-semibold uppercase tracking-[0.12em] text-accent rtl:tracking-normal"><bdi>{article.source}</bdi></span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.published}>{formatDay(article.published, locale)}</time>
    </p>
  );
}

/** The headline, linking to the story on its newspaper's site. */
function Headline({ article, className }: { article: NewsArticle; className: string }) {
  const { t, lang } = useI18n();
  return (
    <h3 className={`[overflow-wrap:anywhere] [text-wrap:balance] ${className}`} lang={article.lang}>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block min-h-6 underline-offset-4 hover:underline">
        <bdi>{article.title}</bdi>
        <span className="sr-only" lang={lang}> {t.search.opensNewTab}</span>
      </a>
    </h3>
  );
}

/** Other papers' stories about the same event (the radar folds them into this one). */
function AlsoIn({ article }: { article: NewsArticle }) {
  const { t, lang } = useI18n();
  if (!article.also.length) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
      <span>{t.news.alsoIn}</span>
      {article.also.map((a) => (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" title={a.title}
          className="inline-flex min-h-6 items-center font-medium text-accent underline-offset-4 hover:underline">
          <bdi>{a.source}</bdi>
          <span className="sr-only" lang={lang}> {t.search.opensNewTab}</span>
        </a>
      ))}
    </p>
  );
}

/** When the radar found an event in the story: its extracted details. */
function EventBox({ article }: { article: NewsArticle }) {
  const { t, locale } = useI18n();
  const ev = article.event;
  if (!ev) return null;
  return (
    <div className="well mt-3 rounded-[var(--radius-control)] p-3 text-sm">
      <p className="text-xs text-accent">{t.news.found}</p>
      <p className="mt-0.5 font-medium [overflow-wrap:anywhere]" lang={article.lang}><bdi>{ev.name}</bdi></p>
      <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted">{t.news.when}</dt>
        <dd>{formatRange(ev.start, ev.end, locale)}</dd>
        {ev.venue && (
          <>
            <dt className="text-muted">{t.news.where}</dt>
            <dd><bdi>{ev.venue}</bdi></dd>
          </>
        )}
      </dl>
      {ev.matchedEventId && (
        <Link to={`/events/${ev.matchedEventId}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-accent underline-offset-4 hover:underline">
          {t.news.openEvent}
        </Link>
      )}
    </div>
  );
}

/** The story's picture slot; with `dropIfMissing`, a story that has no picture gives the space back to its text. */
function Picture({ article, className, lazy, dropIfMissing = false }: { article: NewsArticle; className: string; lazy: boolean; dropIfMissing?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing && dropIfMissing) return null;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ${className}`}>
      <StoryImage id={article.id} lazy={lazy} fallbackInset="bottom-0" onMissing={() => setMissing(true)} />
    </div>
  );
}

export function NewsFront({ articles, today }: { articles: NewsArticle[]; today: string }) {
  const { t, locale } = useI18n();
  const [lead, ...others] = articles;
  if (!lead) return null;
  const side = others.slice(0, SIDE);
  const rest = others.slice(SIDE);
  const dateline = new Date(`${today}T00:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <section aria-labelledby="front-title" className="hud-panel p-5 sm:p-8">
      {/* ---- masthead ---- */}
      <header className="text-center">
        <h2 id="front-title" className="text-h1 text-ink">{t.news.latest}</h2>
        <p className="mt-2 text-sm text-muted">
          {dateline} · <span aria-live="polite">{t.news.count(articles.length)}</span>
        </p>
      </header>
      <hr aria-hidden="true" className="mt-5 border-0 border-t-[3px] border-double border-line" />

      {/* ---- lead story | side stories ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-8">
          <Picture article={lead} className="aspect-[16/9]" lazy={false} />
          <div className="mt-4">
            <Kicker article={lead} />
            <Headline article={lead} className="mt-2 text-h1 text-ink" />
            {lead.summary && <p className="mt-3 text-lead text-muted [overflow-wrap:anywhere]" lang={lead.lang}><bdi>{lead.summary}</bdi></p>}
            <AlsoIn article={lead} />
            <EventBox article={lead} />
          </div>
        </article>

        {side.length > 0 && (
          <div className="min-w-0 space-y-5 border-line lg:col-span-4 lg:border-s lg:ps-6">
            {side.map((a, i) => (
              // compact: a small picture beside the headline
              <article key={a.id} className={`flex items-start gap-4 ${i > 0 ? "border-t border-line pt-5" : ""}`}>
                <Picture article={a} className="aspect-[4/3] w-28" lazy={false} dropIfMissing />
                <div className="min-w-0 flex-1">
                  <Kicker article={a} />
                  <Headline article={a} className="mt-1.5 text-base font-semibold leading-snug text-ink" />
                  <AlsoIn article={a} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ---- the rest, in ruled columns ---- */}
      {rest.length > 0 && (
        <>
          <hr aria-hidden="true" className="mt-8 border-0 border-t-[3px] border-double border-line" />
          <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {rest.map((a) => (
              <li key={a.id} className="min-w-0 border-t border-line pt-4">
                <article>
                  <Picture article={a} className="mb-3 aspect-[4/3]" lazy dropIfMissing />
                  <div>
                    <Kicker article={a} />
                    <Headline article={a} className="mt-1.5 text-base font-semibold leading-snug text-ink" />
                    {a.summary && <p className="mt-2 line-clamp-3 text-sm text-muted [overflow-wrap:anywhere]" lang={a.lang}><bdi>{a.summary}</bdi></p>}
                    <AlsoIn article={a} />
                    <EventBox article={a} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
