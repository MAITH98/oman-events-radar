/**
 * Search text normalisation shared by suggestions and filtering, so "what you see suggested" and "what the search
 * finds" always agree. Case-, accent- and Arabic-variant-insensitive:
 *   Latin: lower case, accents removed (é → e)
 *   Arabic: harakat and tatweel removed; أ إ آ ٱ → ا · ة → ه · ى → ي · ؤ → و · ئ → ي
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * How well `query` matches (every query word must be found somewhere):
 *   0 label starts with it · 1 a word in the label starts with it · 2 label contains it, or all its words in any order
 *   3 some words only in the extra keywords · null no match
 */
export function matchRank(label: string, query: string, keywords = ""): number | null {
  const q = normalizeForSearch(query);
  if (!q) return null;
  const l = normalizeForSearch(label);
  const all = `${l} ${normalizeForSearch(keywords)}`;
  const words = q.split(" ");
  if (!words.every((word) => all.includes(word))) return null;
  if (l.startsWith(q)) return 0;
  if (l.split(/[\s\-–—·,()/&]+/).some((w) => w.startsWith(q))) return 1;
  if (l.includes(q) || words.every((word) => l.includes(word))) return 2; // all words in the label, any order
  return 3;
}
