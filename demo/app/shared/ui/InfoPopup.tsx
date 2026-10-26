import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { usePrefersStill } from "./motion";

/**
 * Round "!" button that opens an iOS-style alert: frosted glass, large radius, centred, one action.
 * Built on the native <dialog> (modal): focus is kept inside, Esc closes, focus returns to the button,
 * a click on the dimmed backdrop closes it. The spring animation is skipped for reduced motion.
 * Content: a `body` sentence, and/or `children` for richer content (e.g. a list), shown start-aligned.
 * `trigger` replaces the round "!" with a labelled button; `autoOpenOnce` opens it by itself the first time the page
 * is shown in this browser session (that key is remembered in sessionStorage).
 */
export function InfoPopup({ label, title, body, close, children, className = "", trigger, autoOpenOnce, wide = false }: {
  label: string;
  title: string;
  body?: string;
  close: string;
  children?: React.ReactNode;
  className?: string;
  trigger?: React.ReactNode;
  autoOpenOnce?: string;
  /** a roomier dialog for list content (e.g. the calendar's post reminders) */
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const still = usePrefersStill();

  // First visit this session: open by itself once (sessionStorage is an external browser API).
  useEffect(() => {
    if (!autoOpenOnce) return;
    try {
      if (sessionStorage.getItem(autoOpenOnce)) return;
      sessionStorage.setItem(autoOpenOnce, "1");
    } catch {
      return; // storage blocked: don't risk opening on every visit
    }
    setOpen(true);
  }, [autoOpenOnce]);

  // Sync React state with the native dialog (external DOM API).
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={trigger ? undefined : label} // a visible trigger names itself
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={trigger ? className : `group -m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full ${className}`}
      >
        {trigger ?? (
          // 28 px visible circle, sized to sit with small caps text; the button keeps a 44 px target
          <span aria-hidden="true" className="neu-raised grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-ink transition group-hover:border-brand group-hover:bg-raised">!</span>
        )}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        onClose={() => {
          setOpen(false);
          button.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false); // backdrop click
        }}
        className={`m-auto ${wide ? "w-[min(92vw,40rem)]" : "w-[min(92vw,22rem)]"} overflow-visible bg-transparent p-0 text-ink backdrop:bg-black/35 backdrop:backdrop-blur-[2px]`}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={still ? false : { opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={still ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="overflow-hidden rounded-[2rem] border border-line bg-surface/85 text-center shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150"
            >
              <div className="px-6 pb-5 pt-6">
                <p aria-hidden="true" className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand text-lg font-bold text-brand-ink">!</p>
                <h2 id={titleId} className="text-[17px] font-semibold leading-snug">{title}</h2>
                {body && <p id={bodyId} className="mt-2 text-[15px] leading-relaxed text-ink">{body}</p>}
                {/* tabIndex -1: the scroller is not the first stop — focus starts on the close button; links inside stay reachable */}
                {children && <div tabIndex={-1} className="mt-4 max-h-[55vh] overflow-y-auto text-start outline-none">{children}</div>}
              </div>
              <form method="dialog" className="border-t border-line">
                <button type="submit" autoFocus className="min-h-12 w-full text-[17px] font-semibold text-accent hover:bg-raised">
                  {close}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </>
  );
}
