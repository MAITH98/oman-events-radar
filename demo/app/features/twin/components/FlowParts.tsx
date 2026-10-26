import { useI18n } from "../../../shared/i18n";
import { InfoPopup } from "../../../shared/ui/InfoPopup";
import { logoSize, useTrimmedLogos } from "../logos";
import { RadarMark } from "./RadarMark";
import { KIND_ICONS } from "./kindIcons";
import type { FlowInput, FlowOutput } from "./AutomationFlow";

/*
 * The automation's three parts, shared by the canvas (lg+) and the stacked layout: the inputs, the radar logo, the
 * outputs. Items are small static cards; the only controls are the hero's round (!) buttons, whose popups hold the
 * details. Lists are a grid of `fr` rows (header, one row per item) so the canvas can aim its wires at each card.
 */
export const CARD_ROWS = { head: 36, row: 50 };
const SHOWN = 4;

const Icon = ({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

/** The source type's face: its first sources' logos on a small white strip, then "+n"; its icon when none has a logo. */
function InputLogos({ input }: { input: FlowInput }) {
  const sites = input.sources.flatMap((s) => (s.site ? [s.site] : []));
  const logos = useTrimmedLogos(sites);
  const ready = sites.filter((s) => logos[s]).slice(0, SHOWN);
  const rest = input.count - ready.length;
  if (!ready.length) {
    return <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-raised text-accent"><Icon>{KIND_ICONS[input.kind]}</Icon></span>;
  }
  return (
    <span aria-hidden="true" className="flex min-w-0 items-center gap-2.5 rounded-lg bg-white px-2 py-0.5">
      {ready.map((s) => (
        <img key={s} src={logos[s]!.src} alt="" style={logoSize(logos[s]!.aspect, 480, 24, 54)} className="block shrink-0" />
      ))}
      {rest > 0 && <span dir="ltr" className="shrink-0 text-xs font-semibold tabular-nums text-[#3e5d5e]">+{rest}</span>}
    </span>
  );
}

const headCls = "flex items-center justify-between gap-2 px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted rtl:tracking-normal";
// each item is its own small card (static: only the (!) buttons are interactive)
const itemCls = "flex h-full min-h-10 min-w-0 items-center gap-2 rounded-xl border border-[var(--glass-edge)] bg-[var(--color-surface)] px-2 shadow-[var(--neu-raised-sm)]";
const rows = (n: number) => ({ display: "grid", gridTemplateRows: `${CARD_ROWS.head}fr repeat(${n}, ${CARD_ROWS.row}fr)` });

/** What it reads: a small card of logos per source type; its (!) popup names every source of each type. */
export function InputsCard({ inputs, className = "", style }: { inputs: FlowInput[]; className?: string; style?: React.CSSProperties }) {
  const { t } = useI18n();
  const f = t.gather.flow;
  return (
    <section aria-label={f.reads} className={`min-w-0 ${className}`} style={{ ...rows(inputs.length), ...style }}>
      <div className={headCls}>
        <span>{f.reads}</span>
        <InfoPopup label={f.readsMore} title={f.reads} body={f.readsHint} close={t.hero.infoClose}>
          <ul className="divide-y divide-line">
            {inputs.map((i) => (
              <li key={i.kind} className="py-2">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Icon className="h-4 w-4 text-accent">{KIND_ICONS[i.kind]}</Icon>
                  <span className="min-w-0 flex-1">{i.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{i.count}</span>
                </span>
                {/* names keep their own direction (English names in Arabic) */}
                <span className="mt-0.5 block ps-6 text-xs text-muted">
                  {i.sources.map((s, n) => (<span key={s.name}>{n > 0 && " · "}<bdi>{s.name}</bdi></span>))}
                </span>
              </li>
            ))}
          </ul>
        </InfoPopup>
      </div>
      {/* the list is decorative (logos only); the (!) popup is its accessible version */}
      {inputs.map((i) => (
        <div key={i.kind} aria-hidden="true" className="min-h-0 py-1" title={`${i.label} (${i.count})`}>
          <div className={itemCls}>
            <InputLogos input={i} />
            <span className="ms-auto shrink-0 rounded-full bg-raised px-1.5 text-xs tabular-nums text-muted">{i.count}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/** What you get: a small card per result; the live numbers are in its (!) popup. */
export function OutputsCard({ outputs, className = "", style }: { outputs: FlowOutput[]; className?: string; style?: React.CSSProperties }) {
  const { t } = useI18n();
  const f = t.gather.flow;
  return (
    <section aria-label={f.gets} className={`min-w-0 ${className}`} style={{ ...rows(outputs.length), ...style }}>
      <div className={headCls}>
        <span>{f.gets}</span>
        <InfoPopup label={f.getsMore} title={f.gets} close={t.hero.infoClose}>
          <ul className="divide-y divide-line">
            {outputs.map((o) => (
              <li key={o.key} className="flex items-start gap-2.5 py-1.5">
                <Icon className="mt-0.5 h-4 w-4 text-accent">{o.icon}</Icon>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{o.title}</span>
                  <span className="block text-xs text-muted">{o.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </InfoPopup>
      </div>
      {outputs.map((o) => (
        <div key={o.key} className="min-h-0 py-1">
          <div className={`${itemCls} text-sm text-ink`}>
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-raised text-accent"><Icon>{o.icon}</Icon></span>
            <span className="min-w-0 truncate">{o.title}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/** The radar logo, which stands for the work it does; its (!) popup lists every step of the process. */
export function ProcessLogo({ steps, className = "" }: { steps: { title: string; body: string }[]; className?: string }) {
  const { t } = useI18n();
  const f = t.gather.flow;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div aria-hidden="true" className={`relative grid place-items-center rounded-full border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] ${className}`}>
        <span className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(242_165_74/0.22),transparent)]" />
        <RadarMark className="relative h-[78%] w-[78%]" sweep />
      </div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted rtl:tracking-normal">
        <span>{f.works}</span>
        <InfoPopup label={f.worksMore} title={f.works} body={f.worksHint} close={t.hero.infoClose}>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand text-xs font-semibold tabular-nums text-brand">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{s.title}</span>
                  <span className="block text-xs text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </InfoPopup>
      </div>
    </div>
  );
}
