import { useDocsI18n } from "../i18n";
import type { Field } from "../reference";

/** A table from sm up; stacked cards on phones so nothing scrolls sideways. */
export function FieldTable({ fields, caption, typeHeader }: { fields: Field[]; caption: string; typeHeader?: string }) {
  const { d, lang } = useDocsI18n();
  return (
    <>
      <div className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] hidden overflow-hidden sm:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-start text-muted">
            <th scope="col" className="px-3 py-2 text-start font-medium">{d.field}</th>
            <th scope="col" className="px-3 py-2 text-start font-medium">{typeHeader ?? d.type}</th>
            <th scope="col" className="px-3 py-2 text-start font-medium">{d.description}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-b border-line align-top last:border-0">
              <th scope="row" className="px-3 py-2 text-start font-mono text-[13px] font-medium">{f.name}</th>
              <td className="px-3 py-2 font-mono text-[13px] text-muted [overflow-wrap:anywhere]">{f.type}</td>
              <td className="px-3 py-2 leading-relaxed">{f.description[lang]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <ul className="space-y-2 sm:hidden" aria-label={caption}>
        {fields.map((f) => (
          <li key={f.name} className="rounded-2xl border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--neu-raised-sm)] p-4 text-sm">
            <p className="font-mono text-[13px] font-medium [overflow-wrap:anywhere]">{f.name}</p>
            <p className="font-mono text-xs text-muted [overflow-wrap:anywhere]">{f.type}</p>
            <p className="mt-1">{f.description[lang]}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
