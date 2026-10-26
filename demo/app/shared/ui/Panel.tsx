
/** Home's card (also on Calendar, Changes and the docs). Fills its grid cell; the body is a flex column, so a footer with `mt-auto` sits on the bottom edge. */
export function Panel({ title, sub, children, className = "", id, hideTitle = false }: {
  title: string;
  /** a chip beside the title (text or a small live status) */
  sub?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Keep the title as the card's accessible name but don't show it (the card speaks for itself visually). */
  hideTitle?: boolean;
}) {
  return (
    <section id={id} className={`hud-panel flex h-full min-w-0 flex-col p-5 ${className}`} aria-label={title}>
      {/* a hidden title stays a real heading, so the page outline has no gaps */}
      {hideTitle ? <h2 className="sr-only">{title}</h2> : <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-h3 text-ink">{title}</h2>
        {sub && <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted">{sub}</span>}
      </header>}
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
