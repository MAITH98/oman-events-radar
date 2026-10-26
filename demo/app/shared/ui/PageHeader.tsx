import { HeroBackdrop } from "./HeroBackdrop";

/** Small uppercase label above a title (hero, page and section headers share it). Letter spacing is off in Arabic. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-medium uppercase tracking-[0.3em] text-accent rtl:tracking-normal ${className}`}>{children}</p>
  );
}

/**
 * The one page header, in Home's language: a card like the hero (same backdrop, edge and radius) holding the
 * eyebrow → H1 → lead, using the card's full width; `children` (page actions) sit at its end edge, below on phones.
 * Every route except Home starts with it, so titles, intros and spacing match site-wide.
 */
export function PageHeader({ eyebrow, title, lead, children }: { eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="relative isolate rounded-[2rem] border border-[var(--glass-edge)] px-5 py-8 sm:px-10 sm:py-10">
      <HeroBackdrop />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1 basis-[28rem]">
          {eyebrow && <Eyebrow className="mb-3 text-muted">{eyebrow}</Eyebrow>}
          <h1 className="text-h1 text-ink [overflow-wrap:anywhere]">{title}</h1>
          {lead && <p className="mt-3 text-lead text-muted">{lead}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </header>
  );
}
