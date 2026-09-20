// Mouth-morph detection: identify which morphs on a model drive the five
// talking vowels, so the maker can show (and correct) the mouth mapping without
// baking any mouth animation into the base motion.

export type Vowel = "a" | "i" | "u" | "e" | "o";

/** The detected morph name for each vowel, or null when not found. */
export type MouthMorphs = Record<Vowel, string | null>;

const VOWELS: Vowel[] = ["a", "i", "u", "e", "o"];
const KANA: Record<Vowel, string> = { a: "あ", i: "い", u: "う", e: "え", o: "お" };

/** Fold case/full-width digits and drop separators ("Talk_A_L" → "talkal"). */
function normalize(name: string): string {
  return name
    .trim()
    .replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "");
}

/**
 * Detect the model's mouth morphs and map each vowel to its morph name.
 *
 * Recognizes Japanese kana (あいうえお), bare English letters (a/i/u/e/o), and
 * the `Talk*` / `mouth*` / `vowel*` conventions with optional `_L`/`_R` side
 * markers (e.g. `Talk_あ_L`, `TalkA`, `mouth_a`).
 */
export function detectMouthMorphs(morphNames: readonly string[]): MouthMorphs {
  const result: MouthMorphs = { a: null, i: null, u: null, e: null, o: null };

  for (const raw of morphNames) {
    const name = raw.trim();
    if (!name) continue;
    const norm = normalize(name);

    for (const vowel of VOWELS) {
      if (result[vowel] !== null) continue;
      const kana = KANA[vowel];

      if (norm === kana || norm === vowel) {
        result[vowel] = name;
        continue;
      }

      const match = /^(?:talk|mouth|vowel)(.+)$/.exec(norm);
      if (match) {
        const rest = match[1];
        if (rest === vowel || rest === kana || rest.startsWith(vowel) || rest.startsWith(kana)) {
          result[vowel] = name;
        }
      }
    }
  }

  return result;
}
