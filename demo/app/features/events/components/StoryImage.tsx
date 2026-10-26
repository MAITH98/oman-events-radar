import { useEffect, useRef, useState } from "react";
import { RadarMark } from "../../twin/components/RadarMark";
import { isPlaceholder, previewUrl } from "../../media/urls";

/**
 * A news story's or event's own picture (a static file from the daily build), filling its positioned parent. Until (or unless) the picture
 * arrives, a quiet engraved radar shows instead. `fallbackInset` keeps that radar clear of text laid over the picture.
 * Decorative: the headline beside or over it names it.
 */
export function StoryImage({ kind = "news", id, lazy = false, fallbackInset = "bottom-1/3", onMissing, whole = false }: {
  kind?: "news" | "event";
  id: string;
  /** show the whole picture (logos, banners), over a blurred copy that fills the frame, instead of cropping it */
  whole?: boolean;
  lazy?: boolean;
  fallbackInset?: string;
  /** told when the story has no picture (e.g. so a layout can drop the picture slot) */
  onMissing?: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");
  const src = previewUrl(kind, id);
  const img = useRef<HTMLImageElement>(null);
  // The <img> is in the server HTML, so a cached picture can finish loading before React attaches onLoad/onError
  // (they would never fire and it would stay invisible). Read its state once after hydration (a DOM API).
  useEffect(() => {
    const el = img.current;
    if (!el?.complete) return;
    if (el.naturalWidth > 0 && !isPlaceholder(el)) setState("ready");
    else {
      setState("none");
      onMissing?.();
    }
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps -- once per picture
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_0%,var(--color-raised),var(--neu-well))]" />
      {state !== "ready" && (
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 grid place-items-center ${fallbackInset}`}>
          <RadarMark engraved className="h-2/3 max-h-56 w-auto opacity-35" />
        </div>
      )}
      {whole && state === "ready" && (
        <img aria-hidden="true" src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
      )}
      {state !== "none" && (
        <img
          ref={img}
          src={src}
          alt=""
          loading={lazy ? "lazy" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            if (!isPlaceholder(e.currentTarget)) return setState("ready");
            setState("none");
            onMissing?.();
          }}
          onError={() => {
            setState("none");
            onMissing?.();
          }}
          className={`absolute inset-0 h-full w-full ${whole ? "object-contain" : "object-cover"} transition-opacity duration-500 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
