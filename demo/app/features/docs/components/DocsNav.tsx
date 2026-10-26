import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useDocsI18n } from "../i18n";
import { DOCS_PAGES } from "../reference";

function isCurrent(pathname: string, to: string) {
  return to === "/docs" ? pathname === "/docs" || pathname === "/docs/" : pathname.startsWith(to);
}

/** Sidebar from sm up; a full-width dropdown on phones (see mobile-layout rule). */
export function DocsNav() {
  const { pathname } = useLocation();
  const { d, lang } = useDocsI18n();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = DOCS_PAGES.find((p) => isCurrent(pathname, p.to)) ?? DOCS_PAGES[0];

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Esc and outside presses close the list (subscription to document events while open).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onPointer(e: PointerEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const link = (p: (typeof DOCS_PAGES)[number], mobile: boolean) => (
    <NavLink
      to={p.to}
      end={p.to === "/docs"}
      aria-current={isCurrent(pathname, p.to) ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${
        isCurrent(pathname, p.to) ? "neu-raised font-semibold text-ink" : "text-muted hover:text-ink"
      } ${mobile ? "w-full" : ""}`}
    >
      {p.label[lang]}
    </NavLink>
  );

  return (
    <>
      <div ref={wrapper} className="relative sm:hidden">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="neu-raised flex min-h-11 w-full items-center justify-between rounded-full px-4 text-sm font-medium"
        >
          <span>
            <span className="text-muted">{d.docs}: </span>
            {current.label[lang]}
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}>
            <path d="M5 7l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        {open && (
          <nav id={listId} aria-label={d.documentation} className="hud-panel absolute inset-x-0 top-full z-20 mt-2 rounded-2xl p-1 shadow-lg">
            <ul>{DOCS_PAGES.map((p) => <li key={p.to}>{link(p, true)}</li>)}</ul>
          </nav>
        )}
      </div>

      <nav aria-label={d.documentation} className="sticky top-6 hidden sm:block">
        <ul className="space-y-0.5">{DOCS_PAGES.map((p) => <li key={p.to}>{link(p, false)}</li>)}</ul>
      </nav>
    </>
  );
}
