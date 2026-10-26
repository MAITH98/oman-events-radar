import type { Route } from "./+types/media.logo";
import { sourceLogo } from "../features/media/logoImage.server";

/**
 * GET /media/logo?site=<domain> → that radar source's logo, live from its own site, or 404.
 * Only domains of known sources are accepted (features/events/sourceSites.ts), so this is not a proxy.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const site = new URL(request.url).searchParams.get("site");
  const img = await sourceLogo(site);
  if (!img) return new Response("No logo", { status: 404, headers: { "Cache-Control": "public, max-age=600" } });
  return new Response(img.body as BodyInit, {
    headers: {
      "Content-Type": img.contentType,
      "Content-Length": String(img.body.byteLength),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
