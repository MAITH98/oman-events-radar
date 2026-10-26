import { useId, useRef, useState } from "react";
import type { Snippet } from "../examples";
import { useDocsI18n } from "../i18n";
import { CodeBlock } from "./CodeBlock";

/**
 * Language switcher: a dropdown on phones (no sideways-scrolling rows),
 * an accessible tab list from the sm breakpoint up (arrow keys move between tabs).
 */
export function CodeTabs({ snippets }: { snippets: Snippet[] }) {
  const [active, setActive] = useState(0);
  const { d } = useDocsI18n();
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = snippets[active];

  function onKey(e: React.KeyboardEvent, i: number) {
    const last = snippets.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1 text-sm text-muted sm:hidden">
        {d.language}
        <select
          value={active}
          onChange={(e) => setActive(Number(e.target.value))}
          className="neu-inset min-h-11 w-full rounded-[var(--radius-control)] px-3 text-base text-ink"
        >
          {snippets.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div role="tablist" aria-label={d.language} className="hidden flex-wrap gap-1 sm:flex">
        {snippets.map((s, i) => (
          <button
            key={s.label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${id}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
              i === active ? "btn-primary" : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="space-y-2">
        <CodeBlock code={current.code} language={current.language} filename={current.filename} />
        {current.run && (
          <p className="text-sm text-muted">
            {d.run} <code dir="ltr" className="rounded bg-code px-1.5 py-0.5 font-mono text-[13px] text-ink [overflow-wrap:anywhere]">{current.run}</code>
          </p>
        )}
      </div>
    </div>
  );
}
