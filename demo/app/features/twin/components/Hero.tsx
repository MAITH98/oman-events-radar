import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { HeroBackdrop } from "../../../shared/ui/HeroBackdrop";
import { InfoPopup } from "../../../shared/ui/InfoPopup";
import { RotatingWord } from "../../../shared/ui/RotatingWord";
import { SearchPill } from "../../../shared/ui/SearchPill";
import type { Suggestion } from "../../../shared/ui/SuggestInput";
import { RadarMark } from "./RadarMark";
import { Eyebrow } from "../../../shared/ui/PageHeader";

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 rtl:rotate-180"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
);

/**
 * Home hero (reference: the ØER control-room mock): eyebrow, thin display headline with the last word in radar amber,
 * search, one secondary action (Use the API) — and Oman under a slowly sweeping radar on the right (still under reduced motion).
 * Height follows content, never the viewport, so phones in landscape keep the search field on screen.
 */
export function Hero({ query, suggestions }: { query: string; suggestions: Suggestion[] }) {
  const { t } = useI18n();
  const [lead, last] = t.hero.headlineParts;
  return (
    <section aria-labelledby="hero-title" className="relative isolate z-10 rounded-[2rem] border border-[var(--glass-edge)] px-5 py-10 sm:px-10 sm:py-14 lg:py-16">
      <HeroBackdrop />
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* Three zones: header (eyebrow) pinned to the top, footer (Use the API) pinned to the bottom,
            body (title → 24 → subline → 48 → search) centred between them, at least 48 px from each. */}
        <div className="flex min-w-0 flex-col gap-8 sm:gap-12">
          <header className="flex items-center gap-3">
            <Eyebrow className="text-muted">{t.hero.eyebrow}</Eyebrow>
            <InfoPopup label={t.hero.infoLabel} title={t.hero.infoTitle} body={t.hero.sub} close={t.hero.infoClose} />
          </header>

          <div className="my-auto">
            <h1 id="hero-title" className="text-display uppercase text-ink rtl:tracking-normal">
              {lead} <span className="font-normal text-accent">{last}</span>
            </h1>
            <p className="mt-6 text-title text-muted">
              {t.hero.planFor} <RotatingWord words={t.hero.words} className="font-normal text-ink" />
            </p>
            <div className="mt-8 max-w-xl sm:mt-12">
              <SearchPill action="/search" label={t.hero.searchLabel} placeholder={t.hero.searchPlaceholder} button={t.hero.searchButton} defaultValue={query}
                suggestions={suggestions} suggestLabels={t.suggest} />
            </div>
          </div>

          <footer>
            <Link
              to="/docs"
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              {t.hero.docs}
              <span className="transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"><Arrow /></span>
            </Link>
          </footer>
        </div>
        {/* decorative: left out on phones, where it only made the hero taller */}
        <div className="relative mx-auto hidden w-full self-center sm:block sm:max-w-xs lg:max-w-sm">
          <RadarMark className="hero-radar h-auto w-full" sweep engraved />
        </div>
      </div>
    </section>
  );
}
