import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { SiteFooter } from "./shell/SiteFooter";
import { INTRO_GATE, IntroSplash } from "./features/twin/components/IntroSplash";
import { LogoMark } from "./features/twin/components/RadarMark";
import { PillNav } from "./shared/ui/PillNav";
import { useI18n } from "./shared/i18n";
import { PREFS_GATE, setPrefs } from "./shared/preferences";

const BASE = import.meta.env.BASE_URL; // "/oman-events-radar/" on GitHub Pages

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", sizes: "48x48", href: `${BASE}favicon-48.png` },
  { rel: "apple-touch-icon", href: `${BASE}apple-touch-icon.png` },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@200;300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, lang, theme } = useI18n();
  // the language is shown: lift the pre-paint gate (see PREFS_GATE)
  useEffect(() => document.documentElement.removeAttribute("data-prefs-pending"), [lang]);
  return (
    // suppressHydrationWarning: PREFS_GATE may already have set the stored lang/dir/theme before hydration
    <html lang={lang} dir={t.dir} data-theme={theme} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content={theme} />
        <script dangerouslySetInnerHTML={{ __html: PREFS_GATE }} />
        {/* static gate for the opening animation (see IntroSplash) */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          {t.nav.skip}
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}


function PrefsSwitches() {
  const { t, lang, theme } = useI18n();
  const btn = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 neu-raised rounded-full px-3.5 text-sm font-medium text-ink transition hover:text-brand active:shadow-[var(--neu-inset)]";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPrefs({ theme: theme === "dark" ? "light" : "dark" })} className={btn} aria-label={theme === "dark" ? t.nav.toLight : t.nav.toDark}>
          {theme === "dark" ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
      </button>
      {/* visible code (AR / EN) stays inside the accessible name; the full phrase is in the target language */}
      <button type="button" onClick={() => setPrefs({ lang: lang === "en" ? "ar" : "en" })} className={`${btn} tracking-wider`} aria-label={`${t.nav.switchLang} — ${t.nav.switchLangLabel}`} lang={lang === "en" ? "ar" : "en"}>
        <span dir="ltr">{t.nav.switchLang}</span>
      </button>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  return (
    <>
      <IntroSplash />
      <header className="sticky top-0 z-40 border-b border-[var(--glass-edge)] bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="flex min-h-11 flex-col items-center justify-center gap-0.5 justify-self-start" aria-label={t.nav.homeLink}>
            <LogoMark glow={false} className="h-12 w-auto sm:h-16" />
            <span className="whitespace-nowrap text-xs font-medium uppercase leading-none tracking-[0.18em] text-muted ltr:-me-[0.18em]">{t.nav.brand}</span>
          </Link>
          <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <PillNav
              label={t.nav.main}
              other={t.nav.menu}
              items={[
                { to: "/", label: t.nav.home },
                { to: "/calendar", label: t.nav.calendar, also: ["/events"] },
                { to: "/changes", label: t.nav.changes },
                { to: "/docs", label: t.nav.api },
              ]}
            />
          </div>
          <div className="justify-self-end">
            <PrefsSwitches />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useI18n();
  let message = t.common.error;
  let details = t.common.unexpected;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : t.common.error;
    details = error.status === 404 ? t.common.notFound : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="mt-1 text-muted">{details}</p>
      {stack && (
        <pre className="w-full whitespace-pre-wrap p-4 [overflow-wrap:anywhere]">
          <code>{stack}</code>
        </pre>
      )}
      <Link to="/calendar" className="mt-4 inline-block text-brand underline">{t.event.backHome}</Link>
    </main>
  );
}
