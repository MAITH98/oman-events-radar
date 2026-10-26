import { useState } from "react";
import { useDocsI18n } from "../i18n";

/**
 * Code wraps instead of scrolling sideways, so no page or frame ever pans
 * horizontally on phones. The copy button copies the exact code.
 */
export function CodeBlock({ code, language, filename }: { code: string; language: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const { d } = useDocsI18n();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.trimEnd());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="well overflow-hidden rounded-[var(--radius-control)]" dir="ltr">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5 text-xs text-muted">
        <span className="min-w-0 truncate font-mono">{filename ?? language}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-9 shrink-0 items-center rounded-md px-2 font-medium text-brand hover:bg-surface"
        >
          <span aria-live="polite">{copied ? d.copied : d.copy}</span>
          <span className="sr-only"> {filename ?? language} {d.code}</span>
        </button>
      </figcaption>
      <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-ink [overflow-wrap:anywhere]">
        <code>{code.trimEnd()}</code>
      </pre>
    </figure>
  );
}
