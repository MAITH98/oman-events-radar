import { getPrefs, usePreferences, type Lang, type Prefs } from "../preferences";
import { ar } from "./ar";
import { en, type Dict } from "./en";

const DICTS: Record<Lang, Dict> = { en, ar };

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Current preferences (the visitor's stored choice; defaults while the page hydrates). */
export function usePrefs(): Prefs {
  return usePreferences();
}

export function useI18n() {
  const prefs = usePrefs();
  const t = DICTS[prefs.lang];
  return { t, lang: prefs.lang, theme: prefs.theme, locale: t.locale, dir: t.dir };
}

/** Pick per-language content kept next to the component that uses it. */
export function pick<T>(lang: Lang, copy: Record<Lang, T>): T {
  return copy[lang];
}

/** Language for meta() functions, which run outside React (pre-rendered titles use the default language). */
export function langFromMatches(_matches: readonly unknown[]): Lang {
  return getPrefs().lang;
}
