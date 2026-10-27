import { useSyncExternalStore } from "react";

/*
 * True when the visitor asked the OS to reduce motion. Every animated component falls back to still content.
 * Pages are pre-rendered (no preference known), so hydration uses `false` and the real answer applies right after —
 * reading it during the first render would make the HTML and the first client render differ (React error #418).
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersStill(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
