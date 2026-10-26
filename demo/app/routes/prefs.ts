import { redirect } from "react-router";
import type { Route } from "./+types/prefs";
import { isCrossSitePost, isLang, isTheme, prefsCookie, readPrefs, safeReturnPath } from "../shared/preferences";

// POST /prefs  (lang=en|ar and/or theme=dark|light, returnTo=/current/path)
export async function action({ request }: Route.ActionArgs) {
  // Another site may not change a visitor's preferences (or use this route to bounce them elsewhere).
  if (isCrossSitePost(request.headers)) return new Response("Cross-site request refused.", { status: 403 });
  const form = await request.formData();
  const current = readPrefs(request.headers.get("Cookie"));
  const lang = form.get("lang");
  const theme = form.get("theme");
  const next = { lang: isLang(lang) ? lang : current.lang, theme: isTheme(theme) ? theme : current.theme };
  const secure = new URL(request.url).protocol === "https:";
  return redirect(safeReturnPath(form.get("returnTo")), { headers: { "Set-Cookie": prefsCookie(next, secure) } });
}

// A GET just goes home.
export function loader() {
  return redirect("/");
}
