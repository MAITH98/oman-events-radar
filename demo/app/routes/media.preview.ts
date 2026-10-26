import type { Route } from "./+types/media.preview";
import { previewImage, type PreviewKind } from "../features/media/previewImage.server";

const KINDS = new Set<PreviewKind>(["event", "news"]);
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * GET /media/preview?kind=event|news&id=<radar id> → the item's live preview image, or 404.
 * Takes an id (never a URL), so it can only ever read pages the radar itself links to.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind") as PreviewKind;
  const id = q.get("id") ?? "";
  if (!KINDS.has(kind) || !ID.test(id)) return new Response("Bad request", { status: 400 });

  const img = await previewImage(kind, id);
  if (!img) return new Response("No preview image", { status: 404, headers: { "Cache-Control": "public, max-age=600" } });

  return new Response(img.body as BodyInit, {
    headers: {
      "Content-Type": img.contentType,
      "Content-Length": String(img.body.byteLength),
      // the browser may keep the picture; this server stores nothing
      "Cache-Control": "public, max-age=3600",
      // third-party bytes on our origin: never sniffed, never scripted, never framed
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Image-Source": img.source,
    },
  });
}
