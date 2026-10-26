import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { usePrefersStill } from "./motion";

export interface NavItem {
  to: string;
  label: string;
  /** Other path prefixes that belong to this item (e.g. detail pages). */
  also?: string[];
}

function isActive(pathname: string, item: NavItem) {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return item.to === "/" ? pathname === "/" : under(item.to) || (item.also ?? []).some(under);
}

/**
 * Main navigation.
 * ≥ sm: a pill with a sliding highlight under the current page (reference: segmented pill tabs).
 * < sm: a full-width menu button that opens the same links as a vertical list (no sideways rows on phones).
 */
export function PillNav({ items, label }: { items: NavItem[]; label: string }) {
  const { pathname } = useLocation();
  const still = usePrefersStill();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = items.find((i) => isActive(pathname, i)) ?? items[0];

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <nav aria-label={label}>
      {/* phones */}
      <div ref={wrap} className="relative sm:hidden">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="neu-raised flex min-h-11 w-full items-center justify-between gap-2 rounded-full px-4 text-sm font-medium"
        >
          {current.label}
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}>
            <path d="M5 7l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        {open && (
          <ul id={listId} className="hud-panel absolute inset-x-0 top-full z-30 mt-2 rounded-2xl p-1.5">
            {items.map((i) => (
              <li key={i.to}>
                <Link
                  to={i.to}
                  aria-current={isActive(pathname, i) ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-sm ${
                    isActive(pathname, i) ? "bg-raised font-semibold text-ink" : "text-muted hover:bg-raised hover:text-ink"
                  }`}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* tablets and up */}
      <ul className="neu-inset hidden items-center gap-1 rounded-full p-1 sm:flex">
        {items.map((i) => {
          const on = isActive(pathname, i);
          return (
            <li key={i.to}>
              <Link
                to={i.to}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-10 items-center rounded-full px-4 text-sm font-medium ${on ? "text-brand-ink" : "text-muted hover:text-ink"}`}
              >
                {on && (
                  <motion.span
                    layoutId={still ? undefined : "main-nav-pill"}
                    transition={{ type: "spring", stiffness: 500, damping: 42 }}
                    className="btn-primary absolute inset-0 rounded-full"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">{i.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
