import { AutomationCanvas } from "./AutomationCanvas";
import { InputsCard, OutputsCard, ProcessLogo } from "./FlowParts";
import type { SourceKind } from "../../events/api";

export interface FlowInput {
  kind: SourceKind;
  label: string;
  count: number;
  /** This type's sources, for their logos. */
  sources: { name: string; site?: string }[];
}
export interface FlowOutput {
  key: string;
  icon: React.ReactNode;
  title: string;
  value: string;
}

/** Animated connector between columns: dots travel toward the next column (down on phones, sideways from lg). */
function Stream() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center py-1 lg:px-1 lg:py-0">
      <div className="flow-stream relative h-10 w-0.5 overflow-hidden rounded-full bg-line lg:h-0.5 lg:w-14">
        <span className="flow-dot" />
        <span className="flow-dot" style={{ animationDelay: "0.6s" }} />
        <span className="flow-dot" style={{ animationDelay: "1.2s" }} />
      </div>
    </div>
  );
}

/**
 * The automation, told for general users: what the radar reads (its sources' logos) → the radar logo, which stands
 * for the work it does → what you get. Items are static cards; each part's (!) popup holds the details.
 * All movement is CSS (app.css "Automation") and stops under reduced motion.
 */
export function AutomationFlow({
  inputs,
  steps,
  outputs,
}: {
  inputs: FlowInput[];
  steps: { title: string; body: string }[];
  outputs: FlowOutput[];
}) {
  return (
    <>
    {/* lg+: the workflow canvas; below lg these stacked columns (only one is ever displayed, so screen readers get one) */}
    <div className="hidden lg:block">
      <AutomationCanvas inputs={inputs} steps={steps} outputs={outputs} />
    </div>
    <div className="grid grid-cols-1 items-stretch lg:hidden">
      <InputsCard inputs={inputs} />
      <Stream />
      <ProcessLogo steps={steps} className="h-32 w-32" />
      <Stream />
      <OutputsCard outputs={outputs} />
    </div>
    </>
  );
}
