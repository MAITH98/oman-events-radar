export type Lang = "en" | "ar";
export type Theme = "dark" | "light";

export interface Prefs {
  lang: Lang;
  theme: Theme;
}

export const DEFAULT_PREFS: Prefs = { lang: "en", theme: "dark" };
const COOKIE = "oe_prefs";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "ar";
}
export function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "light";
}

/** Reads "oe_prefs=<lang>.<theme>"; anything unexpected falls back to the defaults. */
export function readPrefs(cookieHeader: string | null): Prefs {
  const raw = cookieHeader
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [lang, theme] = (raw ?? "").split(".");
  return { lang: isLang(lang) ? lang : DEFAULT_PREFS.lang, theme: isTheme(theme) ? theme : DEFAULT_PREFS.theme };
}

export function prefsCookie(p: Prefs, secure: boolean) {
  // Not sensitive (UI preference only); readable by the page is fine, but keep it same-site.
  return `${COOKIE}=${p.lang}.${p.theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}

const LOCAL = "http://local.invalid";

/**
 * Only same-site paths are accepted as a return address (no open redirects). The value is resolved the way a
 * browser would resolve it: browsers drop tabs and newlines, so "/<TAB>/evil.example" would become "//evil.example".
 * Control characters and backslashes are refused outright; anything that resolves off-site falls back to "/".
 */
export function safeReturnPath(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(v)) return "/";
  try {
    const u = new URL(v, LOCAL);
    return u.origin === LOCAL ? `${u.pathname}${u.search}${u.hash}` : "/";
  } catch {
    return "/";
  }
}

/**
 * True when a form post comes from another site (CSRF). Uses Fetch Metadata where the browser sends it,
 * else compares the Origin host with the Host header (scheme-agnostic, so a TLS-terminating proxy is fine).
 */
export function isCrossSitePost(headers: Headers): boolean {
  const site = headers.get("Sec-Fetch-Site");
  if (site) return site === "cross-site";
  const origin = headers.get("Origin");
  if (!origin) return false; // no Origin: not a browser form post from another page
  if (origin === "null") return true; // opaque origin (sandboxed frame, data: URL)
  try {
    return new URL(origin).host !== headers.get("Host");
  } catch {
    return true;
  }
}
