import { useRouteLoaderData } from "react-router";
import { DEFAULT_PREFS, type Lang, type Prefs } from "../preferences";
import { ar } from "./ar";
import { en, type Dict } from "./en";

const DICTS: Record<Lang, Dict> = { en, ar };

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Current preferences, from the root loader (set from the cookie on the server). */
export function usePrefs(): Prefs {
  const data = useRouteLoaderData("root") as { prefs?: Prefs } | undefined;
  return data?.prefs ?? DEFAULT_PREFS;
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

/** Language for meta() functions, which run outside React. */
export function langFromMatches(matches: readonly unknown[]): Lang {
  // React Router 8 passes route data as `loaderData` (older versions: `data`); read either.
  const root = matches.find((m) => (m as { id?: string } | undefined)?.id === "root") as
    | { loaderData?: { prefs?: Prefs }; data?: { prefs?: Prefs } }
    | undefined;
  return (root?.loaderData ?? root?.data)?.prefs?.lang ?? DEFAULT_PREFS.lang;
}
