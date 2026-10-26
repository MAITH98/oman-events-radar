import { useI18n } from "../../../shared/i18n";
import { HeroBackdrop } from "../../../shared/ui/HeroBackdrop";
import { Eyebrow } from "../../../shared/ui/PageHeader";
import { KIND_ICONS } from "../../twin/components/kindIcons";
import { Panel } from "../../../shared/ui/Panel";
import { SourceLogo } from "../../twin/components/SourceLogo";
import type { SourceKind } from "../api";

export interface CreditSource {
  kind: SourceKind;
  name: string;
  site?: string;
  events?: number;
}

const KIND_ORDER: SourceKind[] = ["venue", "organiser", "site", "aggregator", "news", "team"];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span aria-hidden="true" className="neu-raised grid h-10 w-10 shrink-0 place-items-center rounded-xl text-accent">
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  </span>
);

/**
 * The credits page, in the site's own system (glass hero card · bento of glass cards): every source the radar
 * reads, grouped by type, each with its live logo; then what the site is built with — map data, pictures,
 * typefaces, software. Source names keep their own direction (<bdi>).
 */
export function SourceCredits({ sources }: { sources: CreditSource[] }) {
  const { t } = useI18n();
  const c = t.credits;
  const groups = KIND_ORDER.map((kind) => ({ kind, items: sources.filter((s) => s.kind === kind) })).filter((g) => g.items.length);

  const built: { icon: React.ReactNode; title: string; body: React.ReactNode }[] = [
    {
      icon: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></>,
      title: c.map,
      body: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink" dir="ltr">© OpenStreetMap contributors · ODbL</a>,
    },
    { icon: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></>, title: c.pictures, body: c.picturesNote },
    { icon: <><path d="M5 19 10 5h1l5 14M7 14h7.5" /><path d="M17.5 19v-6.5" /></>, title: c.type, body: "IBM Plex Sans Arabic · IBM Plex Mono — IBM, SIL OFL 1.1" },
    { icon: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></>, title: c.softwareCard, body: "React · React Router · Tailwind CSS · Vite · Motion (MIT) · React Bits (MIT + Commons Clause)" },
  ];

  return (
    // Home's rhythm: cards 16 px apart
    <div className="space-y-4">
      {/* header: the site's hero card, compact */}
      <section aria-labelledby="credits-title" className="relative isolate rounded-[2rem] border border-[var(--glass-edge)] px-5 py-10 sm:px-10 sm:py-12">
        <HeroBackdrop />
        <Eyebrow className="text-muted">{c.eyebrow}</Eyebrow>
        <h1 id="credits-title" className="mt-4 text-h1 text-ink">{c.title}</h1>
        <p className="mt-3 text-lead text-muted">{c.lead}</p>
        <p className="mt-6 text-sm text-muted">{c.summary(sources.length, groups.length)}</p>
      </section>

      {/* sources by type */}
      <Panel title={c.sourcesTitle} sub={String(sources.length)}>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.kind} className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] flex flex-col p-4">
              <div className="mb-4 flex items-center gap-3">
                <Icon>{KIND_ICONS[g.kind]}</Icon>
                <h3 className="min-w-0 flex-1 text-base font-semibold text-ink">{t.gather.kind[g.kind]}</h3>
                <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-muted">{g.items.length}</span>
              </div>
              <ul className="divide-y divide-line">
                {g.items.map((s) => (
                  <li key={s.name} className="flex min-h-14 items-center gap-3 py-2">
                    <SourceLogo name={s.name} site={s.site} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink [overflow-wrap:anywhere]"><bdi>{s.name}</bdi></span>
                      {s.site && <span className="block text-xs text-muted" dir="ltr">{s.site.replace(/^www\./, "")}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>

      {/* what the site is built with */}
      <Panel title={c.builtTitle}>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {built.map((b) => (
            <li key={b.title} className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] flex h-full flex-col gap-3 p-4">
              <Icon>{b.icon}</Icon>
              <h3 className="text-base font-semibold text-ink">{b.title}</h3>
              <p className="text-sm text-muted [overflow-wrap:anywhere]">{b.body}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="py-2 text-center text-sm text-muted">
        {c.closing}{" "}
        <a className="text-accent underline-offset-4 hover:underline" href="https://github.com/MAITH98/oman-events-radar" lang="en">Oman Events Radar</a>
      </p>
    </div>
  );
}
