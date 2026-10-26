import { CARD_ROWS, InputsCard, OutputsCard, ProcessLogo } from "./FlowParts";
import type { FlowInput, FlowOutput } from "./AutomationFlow";

/*
 * Workflow canvas (refs: node-graph automation UIs — glowing curved wires, fan-in / fan-out): source cards → the
 * radar logo → result cards, on the tile itself (no backdrop). Fixed geometry in a 1000-wide space; each
 * wire meets its card. The wires are one decorative SVG (mirrored in Arabic so the flow follows reading
 * direction); the cards are real HTML placed with logical insets, so they mirror too. Shown from lg up; smaller
 * screens use the stacked layout in AutomationFlow.
 */
const W = 1000;
const IN = { x: 0, w: 260 };
const OUT = { x: 740, w: 260 };
const CORE = { cx: 500, size: 170, caption: 44 };

const cardH = (n: number) => CARD_ROWS.head + n * CARD_ROWS.row;
const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${x1 + (x2 - x1) * 0.55} ${y1}, ${x2 - (x2 - x1) * 0.55} ${y2}, ${x2} ${y2}`;

export function AutomationCanvas({
  inputs,
  steps,
  outputs,
}: {
  inputs: FlowInput[];
  steps: { title: string; body: string }[];
  outputs: FlowOutput[];
}) {
  const inH = cardH(inputs.length);
  const outH = cardH(outputs.length);
  const H = Math.max(inH, outH, CORE.size + 2 * CORE.caption) + 4;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const box = (x: number, y: number, w: number, h: number) =>
    ({ insetInlineStart: pct(x, W), top: pct(y, H), width: pct(w, W), height: pct(h, H) }) as React.CSSProperties;

  const inTop = (H - inH) / 2;
  const outTop = (H - outH) / 2;
  const rowY = (top: number, i: number) => top + CARD_ROWS.head + CARD_ROWS.row * (i + 0.5);
  const r = CORE.size / 2;
  const mid = H / 2;

  const wires = [
    ...inputs.map((_, i) => ({ d: curve(IN.x + IN.w, rowY(inTop, i), CORE.cx - r, mid), out: false })),
    ...outputs.map((_, i) => ({ d: curve(CORE.cx + r, mid, OUT.x - 4, rowY(outTop, i)), out: true })),
  ];

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      {/* ---- wires (decorative) ---- */}
      <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full rtl:-scale-x-100">
        <defs>
          <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 9 5 1 9" fill="none" stroke="var(--radar-beam)" strokeWidth="1.6" />
          </marker>
        </defs>
        {wires.map((w, i) => (
          <g key={i}>
            <path d={w.d} fill="none" stroke="var(--radar-beam)" strokeOpacity="0.18" strokeWidth="6" vectorEffect="non-scaling-stroke" />
            <path d={w.d} fill="none" stroke="var(--radar-beam)" strokeOpacity="0.75" strokeWidth="1.6" vectorEffect="non-scaling-stroke"
              markerEnd={w.out ? "url(#flow-arrow)" : undefined} />
            <path d={w.d} fill="none" stroke="var(--radar-beam)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              pathLength={100} strokeDasharray="5 95" className="bento-pulse" style={{ animationDelay: `${(i % 7) * 0.35}s` }} />
          </g>
        ))}
      </svg>

      <InputsCard inputs={inputs} className="absolute" style={box(IN.x, inTop, IN.w, inH)} />

      {/* the radar logo: the disc is centred on the wires' meeting point, its caption and (!) sit below */}
      <div className="absolute" style={box(CORE.cx - r - 60, mid - r, CORE.size + 120, CORE.size + CORE.caption)}>
        <ProcessLogo steps={steps} className="aspect-square w-[58.6%]" />
      </div>

      <OutputsCard outputs={outputs} className="absolute" style={box(OUT.x, outTop, OUT.w, outH)} />
    </div>
  );
}
