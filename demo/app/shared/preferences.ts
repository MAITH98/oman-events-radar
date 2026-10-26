import { useSyncExternalStore } from "react";

/*
 * Language and theme. The site is static (pre-rendered for GitHub Pages), so the choice lives in the visitor's own
 * browser (localStorage — a per-viewer convenience; nothing is sent anywhere). Pages are rendered with the defaults;
 * PREFS_GATE applies a stored choice to <html> before the first paint, and React re-renders with it right after
 * hydration (useSyncExternalStore's server snapshot is the default, so hydration always matches the HTML).
 */
export type Lang = "en" | "ar";
export type Theme = "dark" | "light";

export interface Prefs {
  lang: Lang;
  theme: Theme;
}

export const DEFAULT_PREFS: Prefs = { lang: "en", theme: "dark" };
export const PREFS_KEY = "oer-prefs";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "ar";
}
export function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "light";
}

/** "ar.light" → { lang: "ar", theme: "light" }; anything unexpected falls back to the defaults. */
export function parsePrefs(raw: string | null | undefined): Prefs {
  const [lang, theme] = (raw ?? "").split(".");
  return { lang: isLang(lang) ? lang : DEFAULT_PREFS.lang, theme: isTheme(theme) ? theme : DEFAULT_PREFS.theme };
}

let current: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (current) return current;
  try {
    current = parsePrefs(localStorage.getItem(PREFS_KEY));
  } catch {
    current = DEFAULT_PREFS; // storage blocked (private mode): defaults, still switchable for this visit
  }
  return current;
}

/** The current choice, outside React (meta functions). */
export function getPrefs(): Prefs {
  return typeof window === "undefined" ? DEFAULT_PREFS : read();
}

export function setPrefs(next: Partial<Prefs>) {
  current = { ...read(), ...next };
  try {
    localStorage.setItem(PREFS_KEY, `${current.lang}.${current.theme}`);
  } catch {
    // storage blocked: the switch still applies to this visit
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences(): Prefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}

/**
 * Inline <head> script: applies a stored choice to <html> before the first paint. When the language differs from
 * the pre-rendered default, the page stays hidden until React has re-rendered it in that language (at most 1.5 s).
 */
export const PREFS_GATE = `(function(){try{var p=(localStorage.getItem("${PREFS_KEY}")||"").split(".");var d=document.documentElement;
if(p[1]==="light"||p[1]==="dark"){d.setAttribute("data-theme",p[1]);}
if(p[0]==="ar"){d.setAttribute("lang","ar");d.setAttribute("dir","rtl");d.setAttribute("data-prefs-pending","");setTimeout(function(){d.removeAttribute("data-prefs-pending")},1500);}}catch(e){}})();`;
