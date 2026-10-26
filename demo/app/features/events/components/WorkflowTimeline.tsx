import { useI18n } from "../../../shared/i18n";
import { formatDay } from "../filters";

export function WorkflowTimeline({ workflow, today }: { workflow: Record<string, string>; today: string }) {
  const { t, locale } = useI18n();
  const steps = Object.entries(workflow).sort(([, a], [, b]) => a.localeCompare(b));
  if (steps.length === 0) {
    // fills its card, so an empty plan reads as a deliberate state, not a gap
    return <p className="well grid flex-1 place-items-center rounded-[var(--radius-control)] p-6 text-center text-sm text-muted">{t.event.noPlan}</p>;
  }
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {steps.map(([step, date]) => {
        const done = date < today;
        return (
          // Home's item card; a passed step is dimmed and ticked
          <li key={step} className={`flex items-start gap-2.5 rounded-xl border border-[var(--glass-edge)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--neu-raised-sm)] ${done ? "opacity-60" : ""}`}>
            <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${done ? "border-brand bg-brand text-brand-ink" : "border-line text-transparent"}`}>✓</span>
            <span className="min-w-0">
            <span className="block text-xs text-muted">{t.step[step] ?? step}</span>
            <span className="tabular-nums text-base font-semibold">
              {formatDay(date, locale)}
              {done && <span className="sr-only"> {t.event.passed}</span>}
            </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
