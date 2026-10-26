import { useState } from "react";
import { API_BASE } from "../reference";
import { useDocsI18n } from "../i18n";
import { CodeBlock } from "./CodeBlock";

const OPTIONS = [
  { path: "events.json", list: "events" },
  { path: "changes.json", list: "changes" },
  { path: "leads.json", list: "leads" },
  { path: "news.json", list: "articles" },
  { path: "watchlist.json", list: "entities" },
] as const;

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; status: number; ms: number; count: number; sample: string };

/** Live request from the visitor's browser (the API allows any origin). */
export function ApiExplorer() {
  const [choice, setChoice] = useState(0);
  const { d } = useDocsI18n();
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const option = OPTIONS[choice];
  const url = `${API_BASE}/${option.path}`;

  async function send() {
    setResult({ kind: "loading" });
    const t0 = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-cache" });
      const body = (await res.json()) as Record<string, unknown>;
      const items = Array.isArray(body[option.list]) ? (body[option.list] as unknown[]) : [];
      // Show the envelope plus the first item only, so the output stays readable.
      const preview = { ...body, [option.list]: items.slice(0, 1).concat(items.length > 1 ? [`… ${items.length - 1} more`] : []) };
      setResult({
        kind: "ok",
        status: res.status,
        ms: Math.round(performance.now() - t0),
        count: items.length,
        sample: JSON.stringify(preview, null, 2),
      });
    } catch {
      setResult({ kind: "error", message: d.failed });
    }
  }

  return (
    <section aria-labelledby="explorer" className="hud-panel space-y-3 p-5">
      <h2 id="explorer" className="text-h3">{d.tryIt}</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          {d.endpoint}
          <select
            value={choice}
            onChange={(e) => {
              setChoice(Number(e.target.value));
              setResult({ kind: "idle" });
            }}
            className="neu-inset min-h-11 w-full rounded-[var(--radius-control)] px-3 font-mono text-base text-ink sm:text-sm"
          >
            {OPTIONS.map((o, i) => (
              <option key={o.path} value={i}>
                GET /{o.path}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={send}
          disabled={result.kind === "loading"}
          className="btn-primary min-h-11 self-end rounded-[var(--radius-control)] px-5 text-sm font-medium disabled:opacity-60 max-sm:w-full"
        >
          {result.kind === "loading" ? d.sending : d.send}
        </button>
      </div>
      <p className="font-mono text-xs text-muted [overflow-wrap:anywhere]" dir="ltr">GET {url}</p>

      <div aria-live="polite">
        {result.kind === "error" && <p className="text-sm text-alert">{result.message}</p>}
        {result.kind === "ok" && (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold text-high">{result.status} OK</span>
              <span className="text-muted"> · {result.ms} ms · {result.count} {d.items}</span>
            </p>
            <CodeBlock code={result.sample} language="json" filename={`${d.response} · ${option.path}`} />
          </div>
        )}
      </div>
    </section>
  );
}
