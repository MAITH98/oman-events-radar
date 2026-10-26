import { Link, useLocation } from "react-router";
import { useDocsI18n } from "../i18n";
import { DOCS_PAGES } from "../reference";
import { PageHeader } from "../../../shared/ui/PageHeader";

export function DocPage({ title, lead, children }: { title: string; lead: React.ReactNode; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { d, lang } = useDocsI18n();
  const i = DOCS_PAGES.findIndex((p) => p.to === pathname.replace(/\/$/, ""));
  const prev = i > 0 ? DOCS_PAGES[i - 1] : undefined;
  const next = i >= 0 && i < DOCS_PAGES.length - 1 ? DOCS_PAGES[i + 1] : undefined;

  return (
    // reading measure: running text in docs never exceeds ~65 characters per line; each section is one of Home's
    // cards, 16 px apart
    <article className="min-w-0 space-y-4 [&_li]:max-w-[var(--measure)] [&_p]:max-w-[var(--measure)] [&>section]:hud-panel [&>section]:p-5 sm:[&>section]:p-6">
      <PageHeader eyebrow={d.eyebrow} title={title} lead={lead} />
      {children}
      <nav aria-label={d.prevNext} className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        {prev ? (
          <Link to={prev.to} className="neu-raised min-h-11 rounded-[var(--radius-control)] px-4 py-2 text-sm hover:text-brand">
            <span className="block text-xs text-muted">{d.previous}</span>
            <span className="rtl:hidden">← </span>{prev.label[lang]}<span className="ltr:hidden"> →</span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={next.to} className="neu-raised min-h-11 rounded-[var(--radius-control)] px-4 py-2 text-end text-sm hover:text-brand">
            <span className="block text-xs text-muted">{d.next}</span>
            {next.label[lang]} <span className="rtl:hidden">→</span><span className="ltr:hidden">←</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-h2">
      {children}
    </h2>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-code px-1.5 py-0.5 font-mono text-[13px] [overflow-wrap:anywhere]">{children}</code>;
}
