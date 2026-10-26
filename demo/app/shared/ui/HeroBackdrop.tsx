import { useI18n } from "../i18n";

/**
 * Soft logo-palette glow behind the hero: teal depth, a mint light from the top corner and a faint amber
 * radar warmth. Plain CSS gradients: works without WebGL, costs no GPU, never covers the text, nothing moves.
 * (React Bits Aurora was tried and dropped: its WebGL canvas painted an opaque wash over the hero.)
 */
export function HeroBackdrop() {
  const { theme } = useI18n();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-surface">
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(55% 80% at 100% 0%, rgb(143 190 186 / 0.35), transparent 70%), radial-gradient(45% 60% at 78% 45%, rgb(242 165 74 / 0.10), transparent 70%), linear-gradient(135deg, #0f3133 0%, #12393b 55%, #164245 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f1f6f5 100%)", // light: flat, no glows
        }}
      />
    </div>
  );
}
