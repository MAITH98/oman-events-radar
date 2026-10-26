import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { matchRank } from "../search";

export interface Suggestion {
  id: string;
  kind: string;
  label: string;
  meta?: string;
  /** Extra text that can match (e.g. an event's venue), but is not shown or highlighted. */
  keywords?: string;
  /** Opens this page when picked; without it the label is searched for. */
  href?: string;
  /** Tie-break inside a rank (e.g. upcoming events first); lower comes first. */
  order?: number;
}

export interface SuggestLabels {
  list: string;
  none: string;
  count: (n: number) => string;
  kinds: Record<string, string>;
}

const MAX = 8;

/** Bold the first plain-text occurrence of the query (only when it appears literally; normalised matches stay plain). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-accent">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Search field with live suggestions (WAI-ARIA combobox, list autocomplete). Renders the <input> and its listbox;
 * the parent must be `relative` — the list spans the parent's width, directly under it.
 *
 * Keyboard: ↓/↑ move through suggestions · Enter opens the highlighted one (or submits the form) · Esc closes ·
 * Tab leaves. Picking a suggestion with `href` opens it; otherwise its label is put in the field and the form submits.
 */
export function SuggestInput({
  id,
  name,
  defaultValue = "",
  placeholder,
  className,
  suggestions,
  labels,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className: string;
  suggestions: Suggestion[];
  labels: SuggestLabels;
}) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-opt-${i}`;
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(() => {
    if (!value.trim()) return [];
    const ranked: { s: Suggestion; rank: number }[] = [];
    for (const s of suggestions) {
      const rank = matchRank(s.label, value, s.keywords);
      if (rank !== null) ranked.push({ s, rank });
    }
    ranked.sort((a, b) => a.rank - b.rank || (a.s.order ?? 0) - (b.s.order ?? 0) || a.s.label.localeCompare(b.s.label));
    return ranked.slice(0, MAX).map((r) => r.s);
  }, [suggestions, value]);

  const showList = open && value.trim().length > 0;

  // Keep the highlighted option visible inside the scrollable list (DOM sync).
  useEffect(() => {
    if (active >= 0) list.current?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(s: Suggestion) {
    setOpen(false);
    setActive(-1);
    if (s.href) {
      navigate(s.href);
      return;
    }
    flushSync(() => setValue(s.label)); // the field must hold the label before the form reads it
    input.current?.form?.requestSubmit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // Arabic and other IMEs use Enter/arrows while composing
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      setOpen(true);
      const n = results.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter" && showList && active >= 0 && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault(); // close the list first; a second Esc clears the field as usual
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        id={inputId}
        name={name}
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList && results.length > 0}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={className}
      />

      {/* the listbox stays in the DOM (aria-controls must point at it); it is only shown while there are results */}
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label={labels.list}
        hidden={!showList || results.length === 0}
        className="hud-panel absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto p-1.5 text-start"
      >
        {results.map((s, i) => (
          <li
            key={s.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // keep focus in the field, so the click lands before blur closes the list
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(s)}
            onMouseEnter={() => setActive(i)}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${i === active ? "neu-raised" : "border-transparent"}`}
          >
            <span className="min-w-0 flex-1">
              {/* <bdi>: each line keeps its own text direction but aligns with the page (both right in Arabic) */}
              <span className="line-clamp-2 text-sm leading-snug text-ink"><bdi><Highlight text={s.label} query={value} /></bdi></span>
              {s.meta && <span dir="auto" className="block truncate text-xs text-muted text-start">{s.meta}</span>}
            </span>
            <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-xs text-muted">{labels.kinds[s.kind] ?? s.kind}</span>
          </li>
        ))}
      </ul>

      {showList && results.length === 0 && (
        <p className="hud-panel absolute inset-x-0 top-full z-30 mt-2 px-4 py-3 text-start text-sm text-muted">{labels.none}</p>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {showList ? (results.length ? labels.count(results.length) : labels.none) : ""}
      </span>
    </>
  );
}
