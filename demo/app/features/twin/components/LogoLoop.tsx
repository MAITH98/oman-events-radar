import { useI18n } from "../../../shared/i18n";
import type { SourceRow } from "../../events/api";
import { logoSize, useTrimmedLogos } from "../logos";

/**
 * "Read daily from" logo loop: every source's logo, normalised to equal visual size (see `../logos`) with one fixed
 * gap, scrolling in one endless strip inside a card like the rest of Home (in dark theme, dark wordmarks turn a
 * light tone). Logos that fail or are blank drop out. Two copies of the row hide the seam; the second is aria-hidden.
 * Pauses on hover and keyboard focus; still and wrapped under reduced motion.
 */
export function LogoLoop({ sources }: { sources: SourceRow[] }) {
  const { t } = useI18n();
  const seen = new Set<string>();
  const items = sources.filter((s) => s.site && (seen.has(s.site) ? false : (seen.add(s.site), true)));
  const logos = useTrimmedLogos(items.map((s) => s.site!));
  if (!items.length) return null;
  const ready = items.filter((s) => logos[s.site!]);

  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="logo-loop-row flex shrink-0 items-center gap-16 pe-16">
      {ready.map((s) => {
        const logo = logos[s.site!]!;
        return (
          <li key={s.site} title={s.name} className="flex h-12 shrink-0 items-center">
            {/* dark theme: dark wordmarks turn a light tone so they stay visible; coloured badges keep their colours */}
            <img src={logo.src} alt="" style={logoSize(logo.aspect, 2400, 48, 140)}
              className={`block ${logo.darkInk ? "dark:opacity-90 dark:brightness-0 dark:invert" : ""}`} />
            <span className="sr-only">{s.name}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    // the same card as the rest of Home; the strip fades out at both edges (a mask, so it works on the glass)
    <section aria-label={t.twin.loopLabel} className="logo-loop hud-panel group relative min-h-20 overflow-hidden px-2 py-4" tabIndex={0}>
      {ready.length > 0 && (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)]">
          <div className="logo-loop-track flex w-max">
            {row(false)}
            {row(true)}
          </div>
        </div>
      )}
    </section>
  );
}
