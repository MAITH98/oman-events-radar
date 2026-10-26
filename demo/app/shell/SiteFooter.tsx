import { Link } from "react-router";
import { LogoMark } from "../features/twin/components/RadarMark";
import { useI18n } from "../shared/i18n";
import { OWNER_LINKS } from "../shared/site";

// App-shell composition (like the header in root.tsx): may use features and shared code.

const ICONS = {
  // GitHub and LinkedIn marks (Simple Icons, CC0); portfolio: a generic briefcase.
  github: (
    <path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.4-2.3 1.2-3.1-.1-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.2 4.7 18.2 5 18.2 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
  ),
  linkedin: (
    <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  ),
  portfolio: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
    </g>
  ),
} as const;

/** Site footer, mirroring the header: logo + brand · page links · Credits + the owner's profiles as round icon buttons. */
export function SiteFooter() {
  const { t } = useI18n();
  const f = t.footer;
  const profiles = (["github", "linkedin", "portfolio"] as const).filter((k) => OWNER_LINKS[k]);
  const pages = [
    { to: "/", label: t.nav.home },
    { to: "/calendar", label: t.nav.calendar },
    { to: "/changes", label: t.nav.changes },
    { to: "/docs", label: t.nav.api },
  ];

  return (
    <footer className="border-t border-[var(--glass-edge)] bg-canvas/70 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center justify-items-center gap-6 px-4 py-8 sm:grid-cols-[1fr_auto_1fr] sm:justify-items-stretch">
        <Link to="/" className="flex min-h-11 flex-col items-center justify-center gap-0.5 sm:justify-self-start" aria-label={t.nav.homeLink}>
          <LogoMark glow={false} className="h-10 w-auto" />
          <span className="whitespace-nowrap text-xs font-medium uppercase leading-none tracking-[0.18em] text-muted ltr:-me-[0.18em] rtl:tracking-normal">{t.nav.brand}</span>
        </Link>

        <nav aria-label={f.pages}>
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
            {pages.map((p) => (
              <li key={p.to}>
                <Link to={p.to} className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-muted underline-offset-4 hover:text-ink hover:underline">{p.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:justify-self-end">
          <Link to="/credits" className="neu-raised inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink transition hover:text-brand active:shadow-[var(--neu-inset)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M7 9h10M8.5 12h7M10 15h4" />
            </svg>
            {f.credits}
          </Link>
          {profiles.length > 0 && (
            <ul className="flex items-center gap-2" aria-label={f.profiles}>
              {profiles.map((k) => (
                <li key={k}>
                  <a
                    href={OWNER_LINKS[k]}
                    target="_blank"
                    rel="me noopener noreferrer"
                    aria-label={f.links[k]}
                    title={f.links[k]}
                    className="neu-raised grid h-11 w-11 place-items-center rounded-full text-ink transition hover:text-brand active:shadow-[var(--neu-inset)]"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">{ICONS[k]}</svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
