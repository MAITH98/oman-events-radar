import { motion } from "motion/react";
import { useId } from "react";
import { usePrefersStill } from "./motion";

/**
 * Pill segmented control with a sliding indicator (2–3 short options, so it stays one row on phones).
 * Keyboard: native buttons in a radiogroup; the indicator only animates when motion is allowed.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  const still = usePrefersStill();
  return (
    <div role="radiogroup" aria-label={label} className="neu-inset inline-flex rounded-full p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`relative min-h-9 rounded-full px-4 text-sm font-medium ${on ? "text-brand-ink" : "text-muted hover:text-ink"}`}
          >
            {on && (
              <motion.span
                layoutId={still ? undefined : `seg-${id}`}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="btn-primary absolute inset-0 rounded-full"
                aria-hidden="true"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
