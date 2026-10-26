import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { usePrefersStill } from "../../../shared/ui/motion";
import { formatDay, formatRange } from "../filters";
import type { NewsArticle } from "../types";
import { StoryImage } from "./StoryImage";

const ADVANCE_MS = 6000;

/**
 * Latest event news as an auto-playing feature accordion (reference: Shareframe "orchestration layer" riff):
 * numbered stories on one side — the active one opens with its event details — and the story's picture as a large
 * card with the headline over it. Advances every 6 s with a progress line; pauses on hover or keyboard focus,
 * and never moves under reduced motion. The list is a real tablist (←/→ or ↑/↓, Home/End).
 */
export function NewsShowcase({ articles }: { articles: NewsArticle[] }) {
  const { t, locale, lang } = useI18n();
  const still = usePrefersStill();
  const id = useId();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const items = articles.slice(0, 5);
  const current = items[active] ?? items[0];
  const playing = !still && !paused && items.length > 1;

  // Timer is an external system: advance while playing, restart when the active story changes.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % items.length), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [playing, active, items.length]);

  if (!current) return null;

  function onKey(e: React.KeyboardEvent) {
    const n = items.length;
    const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let to = next !== undefined ? (active + next + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    if (document.documentElement.dir === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) to = (active - (next ?? 0) + n) % n;
    e.preventDefault();
    setActive(to);
    document.getElementById(`${id}-tab-${to}`)?.focus();
  }

  const ev = current.event;
  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setPaused(false)}
    >
      {/* ---- numbered list (tabs) ---- */}
      <div role="tablist" aria-orientation="vertical" aria-label={t.news.latest} onKeyDown={onKey} className="flex flex-col gap-1">
        {items.map((a, i) => {
          const on = i === active;
          return (
            <div key={a.id} className={`rounded-[var(--radius-card)] transition-colors ${on ? "neu-raised" : "border border-transparent"}`}>
              <button
                id={`${id}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`${id}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className="flex min-h-11 w-full items-start gap-3 px-4 pt-3 pb-3 text-start"
              >
                <span className={`pt-0.5 text-xs tabular-nums ${on ? "text-accent" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block leading-snug ${on ? "text-h3 text-ink" : "line-clamp-1 text-sm text-muted"}`} lang={a.lang}>
                    <bdi>{a.title}</bdi>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    <bdi>{a.source}</bdi> · {formatDay(a.published, locale)}
                  </span>
                </span>
              </button>
              {/* progress line for the story on screen */}
              {on && (
                <div aria-hidden="true" className="mx-4 mb-3 h-0.5 overflow-hidden rounded-full bg-line">
                  {playing && (
                    <motion.div
                      key={`${a.id}-${active}`}
                      className="h-full origin-left rounded-full bg-accent rtl:origin-right"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: ADVANCE_MS / 1000, ease: "linear" }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <Link to="/news" className="mt-auto inline-flex min-h-11 items-center px-4 pt-2 text-sm font-medium text-accent underline-offset-4 hover:underline">
          {t.news.seeAll}
        </Link>
      </div>

      {/* ---- the story card ---- */}
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="well relative min-h-80 overflow-hidden rounded-[var(--radius-card)] lg:min-h-0">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.article
            key={current.id}
            className="absolute inset-0"
            initial={still ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={still ? undefined : { opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <StoryImage id={current.id} />
            {/* scrim keeps the overlaid text readable (≥ 4.5:1) on any picture */}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7" lang={current.lang}>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80 rtl:tracking-normal"><bdi>{current.source}</bdi></p>
              <h3 className="mt-2 line-clamp-3 text-h2 font-normal text-white [text-wrap:balance]">
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  <bdi>{current.title}</bdi>
                  <span className="sr-only" lang={lang}> {t.search.opensNewTab}</span>
                </a>
              </h3>
              {ev && (
                <p className="mt-2 text-sm text-white/85">
                  {formatRange(ev.start, ev.end, locale)}
                  {ev.venue && <> · <bdi>{ev.venue}</bdi></>}
                </p>
              )}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </div>
  );
}
