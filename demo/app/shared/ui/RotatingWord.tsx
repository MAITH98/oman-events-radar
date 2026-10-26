import RotatingText from "./reactbits/RotatingText";
import { usePrefersStill } from "./motion";

/** A word that cycles through options (React Bits RotatingText). Animated per word, never per letter,
 *  so Arabic letters stay joined. Screen readers hear the full list once. */
export function RotatingWord({ words, className = "" }: { words: string[]; className?: string }) {
  const still = usePrefersStill();
  return (
    <span className={className}>
      <span className="sr-only">{words.join(", ")}</span>
      <span aria-hidden="true">
        {still ? (
          words[0]
        ) : (
          <RotatingText texts={words} rotationInterval={2600} effect="slide" splitBy="words" staggerDuration={0.04} mainClassName="inline-flex overflow-hidden" />
        )}
      </span>
    </span>
  );
}
