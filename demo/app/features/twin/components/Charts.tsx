import { useState } from "react";
import { useI18n } from "../../../shared/i18n";

export interface Datum {
  label: string;
  value: number;
}

/**
 * Single-series column chart (one validated hue, no legend: the panel title names it).
 * 4px rounded tops anchored to the baseline, 2px gaps, hover/focus tooltip, table fallback.
 */
export function ColumnChart({ data, unit }: { data: Datum[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 300;
  const H = 120;
  const slot = W / data.length;
  const barW = slot - 8;

  return (
    <div>
      <div className="relative">
        {/* Time runs left to right in both languages. */}
        <svg viewBox={`0 0 ${W} ${H + 22}`} className="block h-auto w-full" role="img" direction="ltr"
          aria-label={data.map((d) => `${d.label}: ${d.value} ${unit}`).join(", ")}>
          {[0.5, 1].map((t) => (
            <line key={t} x1={0} x2={W} y1={H - H * t} y2={H - H * t} stroke="var(--color-line)" strokeWidth={1} />
          ))}
          <line x1={0} x2={W} y1={H} y2={H} stroke="var(--color-muted)" strokeWidth={1} />
          {data.map((d, i) => {
            const h = (d.value / max) * (H - 6);
            const x = i * slot + 4;
            const y = H - h;
            const r = Math.min(4, h, barW / 2);
            return (
              <g key={d.label}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
                aria-label={`${d.label}: ${d.value} ${unit}`} className="outline-none">
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x} ${H} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + barW - r} Q${x + barW} ${y} ${x + barW} ${y + r} V${H} Z`}
                    fill="var(--color-chart)"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={12} fill="var(--color-muted)" fontFamily="var(--font-sans)">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div role="status" className="pointer-events-none absolute -top-1 rounded-md border border-line bg-raised px-2 py-1 text-xs shadow-lg"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: "translate(-50%, -100%)" }}>
            <span className="text-muted">{data[hover].label}</span> <span className="font-semibold text-ink">{data[hover].value}</span>
          </div>
        )}
      </div>
      <TableFallback data={data} unit={unit} />
    </div>
  );
}

/** Horizontal bars with direct labels: category name and value in ink, the bar carries the magnitude. */
export function BarList({ data, unit }: { data: Datum[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.label} title={`${d.label}: ${d.value} ${unit}`}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-ink">{d.label}</span>
              <span className="tabular-nums text-sm font-semibold tabular-nums text-ink">{d.value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-line" aria-hidden="true">
              <div className="h-1.5 rounded-full bg-chart" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <TableFallback data={data} unit={unit} />
    </div>
  );
}

function TableFallback({ data, unit }: { data: Datum[]; unit: string }) {
  const { t } = useI18n();
  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="inline-flex min-h-11 cursor-pointer items-center hover:text-ink">{t.twin.showTable}</summary>
      <table className="mt-2 w-full">
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-line">
              <th scope="row" className="py-1 text-start font-normal">{d.label}</th>
              <td className="py-1 text-end tabular-nums text-ink">{d.value} {unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
