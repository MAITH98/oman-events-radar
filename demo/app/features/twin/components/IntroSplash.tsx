import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { LogoMark } from "./RadarMark";

export const INTRO_KEY = "oer-intro-seen";

/**
 * Inline <head> script: hides the intro before first paint when it was already seen this session or the reader
 * prefers reduced motion, so repeat visits never flash it. Static string — no data is interpolated.
 */
export const INTRO_GATE = `try{if(sessionStorage.getItem("${INTRO_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){var s=document.createElement("style");s.textContent="#oer-intro{display:none!important}";document.head.appendChild(s)}}catch(e){}`;

/**
 * Opening animation, once per browser session: the large ØER logo draws itself in the centre of the screen
 * (ring with the dot leading the pen → Oman, beam and Muscat → E → R → amber light, radar ping, caption),
 * then fades away to reveal the page. The whole timeline is CSS (app.css, "Intro" section), including the
 * fade-out, so the page is revealed even if scripts fail. "Skip" ends it at once.
 */
export function IntroSplash() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  // Already seen this session, or reduced motion: the gate script has hidden it; drop it from the tree too.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_KEY) || matchMedia("(prefers-reduced-motion: reduce)").matches) setDone(true);
    } catch {
      // storage blocked: the intro simply plays
    }
  }, []);

  // While it plays, the page behind can't scroll or take focus (it is covered); undone when it ends.
  useEffect(() => {
    const el = overlay.current;
    if (done || !el) return;
    const behind = [...document.body.children].filter((n): n is HTMLElement => n instanceof HTMLElement && n !== el && n.tagName !== "SCRIPT");
    behind.forEach((n) => n.setAttribute("inert", ""));
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      behind.forEach((n) => n.removeAttribute("inert"));
      html.style.overflow = overflow;
    };
  }, [done]);

  // Marked as seen only once it has finished or been skipped (safe under React's double-run of effects in dev).
  function finish() {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // storage blocked: it may play again next load, nothing else depends on it
    }
    setDone(true);
  }

  if (done) return null;
  return (
    <div
      id="oer-intro"
      ref={overlay}
      className="fixed inset-0 z-[100] grid place-items-center px-4"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div className="i-stage flex w-full flex-col items-center gap-6">
        <LogoMark intro className="h-auto w-[min(86vw,46rem)]" />
        <p className="i-caption text-center text-xs font-medium uppercase tracking-[0.45em] text-ink sm:text-sm rtl:tracking-normal ltr:-me-[0.45em]" aria-hidden="true">
          {t.nav.brand}
        </p>
      </div>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 end-6 neu-raised min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink"
      >
        {t.nav.skipIntro}
      </button>
    </div>
  );
}
