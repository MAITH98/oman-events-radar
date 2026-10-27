import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import type { ResultKind, SearchResult } from "../searchResults";
import { isPlaceholder, previewUrl } from "../../media/urls";

const ICONS: Record<ResultKind, React.ReactNode> = {
  event: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  news: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" /></>,
  venue: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  organiser: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
};

/**
 * The item's preview picture (a static file from the daily build), lazy-loaded. Until it arrives — or when the page has none —
 * a quiet engraved icon stands in, so a missing picture never looks broken.
 */
function Preview({ result }: { result: SearchResult }) {
  const [state, setState] = useState<"loading" | "ready" | "none">(result.preview ? "loading" : "none");
  const img = useRef<HTMLImageElement>(null);

  // An image that failed before hydration never fires onError for React: check it once on mount (DOM sync).
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth > 0 && !isPlaceholder(el) ? "ready" : "none");
  }, []);

  return (
    // no picture: a slim strip on phones instead of a large empty frame
    <div className={`well relative overflow-hidden rounded-[var(--radius-control)] ${state === "none" ? "aspect-[4/1] sm:aspect-[16/9]" : "aspect-[16/9]"}`}>
      <span aria-hidden="true" className={`absolute inset-0 grid place-items-center text-muted transition-opacity ${state === "ready" ? "opacity-0" : "opacity-60"}`}>
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">{ICONS[result.kind]}</svg>
      </span>
      {result.preview && state !== "none" && (
        <img
          ref={img}
          src={previewUrl(result.preview.kind, result.preview.id)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => setState(isPlaceholder(e.currentTarget) ? "none" : "ready")}
          onError={() => setState("none")}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

/** One search result: preview image, kind, title (2 lines), details, source site. The whole card is the link. */
export function ResultCard({ result }: { result: SearchResult }) {
  const { t } = useI18n();
  const title = (
    <bdi lang={result.lang}>{result.title}</bdi>
  );
  const linkClass = "after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] focus-visible:outline-none";
  return (
    <article className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] group relative flex h-full flex-col gap-3 p-3 transition hover:-translate-y-0.5 focus-within:[outline:2px_solid_var(--color-accent)] focus-within:[outline-offset:2px]">
      <Preview result={result} />
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-1 pb-1">
        <span className="text-xs font-medium text-accent">{t.suggest.kinds[result.kind]}</span>
        <h3 className="line-clamp-2 text-h3 leading-snug text-ink">
          {result.external ? (
            <a href={result.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{title}<span className="sr-only"> {t.search.opensNewTab}</span></a>
          ) : (
            <Link to={result.href} className={linkClass}>{title}</Link>
          )}
        </h3>
        <p className="line-clamp-1 text-sm text-muted"><bdi>{result.meta}</bdi></p>
        {result.host && <p className="mt-auto pt-1 text-xs text-muted">{t.search.via} <bdi>{result.host}</bdi></p>}
      </div>
    </article>
  );
}
