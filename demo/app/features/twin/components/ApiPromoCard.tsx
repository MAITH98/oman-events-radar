import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../../shared/i18n";
import { usePrefersStill } from "../../../shared/ui/motion";
import { RadarMark } from "./RadarMark";

const KEY = "oer-api-promo-dismissed";

/**
 * Dismissible call to action (reference: "making dismissing things more fun" riff). The ✕ sends the card spinning
 * into an amber–teal swirl that collapses and fades; with reduced motion it simply fades. Dismissal is remembered
 * for the browser session (a convenience — the card holds nothing else).
 */
export function ApiPromoCard({ className = "", onGone }: { className?: string; onGone?: () => void }) {
  const { t } = useI18n();
  const p = t.gather.promo;
  const still = usePrefersStill();
  const [visible, setVisible] = useState(true);
  const [swirl, setSwirl] = useState(false);

  // Session storage is an external system: read the earlier dismissal after hydration.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) {
        setVisible(false);
        onGone?.();
      }
    } catch {
      // storage blocked: the card just shows
    }
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // storage blocked: dismissed for this view only
    }
    if (!still) {
      setSwirl(true);
      setTimeout(() => setSwirl(false), 900);
    }
    setVisible(false);
    // keyboard focus must not fall to <body>: hand it to the section heading
    document.getElementById("gather-title")?.focus();
  }

  return (
    <div className={`relative ${className}`}>
      {/* the vortex the card falls into */}
      <AnimatePresence>
        {swirl && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "conic-gradient(from 0deg, transparent, var(--radar-beam), var(--color-mint-200), transparent 70%)", filter: "blur(18px)" }}
            initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.1, 0.2], rotate: 540 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence onExitComplete={onGone}>
        {visible && (
          <motion.aside
            aria-labelledby="api-promo-title"
            className="hud-panel relative flex h-full flex-col overflow-hidden p-5"
            exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.05, rotate: 220, skewX: 12, filter: "blur(6px)" }}
            transition={{ duration: still ? 0.2 : 0.75, ease: [0.6, 0, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label={p.dismiss}
              className="neu-raised absolute end-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-muted transition hover:text-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
            {/* the picture only where the card has room; beside the gauges (lg) the card stays as short as they are */}
            <div className="well mb-4 grid aspect-[16/9] place-items-center rounded-[var(--radius-control)] lg:hidden">
              <RadarMark className="h-24 w-auto" sweep />
            </div>
            <h3 id="api-promo-title" className="text-h3 text-ink lg:pe-12">{p.title}</h3>
            <p className="mt-1 text-sm text-muted lg:pe-12">{p.body}</p>
            <div className="mt-auto pt-4">
              <Link to="/docs" className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold">
                {p.cta}
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
