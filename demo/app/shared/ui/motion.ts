import { useReducedMotion } from "motion/react";

/** True when the visitor asked the OS to reduce motion. Every animated component falls back to still content. */
export function usePrefersStill(): boolean {
  return useReducedMotion() ?? false;
}
