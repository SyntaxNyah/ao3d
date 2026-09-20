/**
 * Bidirectional Japanese ↔ English MMD bone-name normalization.
 *
 * Every bone name — Japanese or English — is reduced to a single canonical key
 * so a motion made for one naming scheme can bind to a model using another.
 *
 * Canonical key forms:
 *   side-neutral:  "root" | "center" | "groove" | "hips" | "spine" | "chest" |
 *                  "neck" | "head" | "eyes"
 *   sided:         "<base>.<L|R>" for base ∈ eye, shoulder, upperArm, forearm,
 *                  wrist, thigh, knee, ankle, toe
 *   finger:        "<thumb|index|middle|ring|pinky>.<L|R>.<0|1|2>"
 *
 * Finger canonicalization: every finger has three bones indexed 0..2. Japanese
 * 0-bases the thumb (親指０..親指２) but 1-bases the other fingers (人指１..人指３);
 * UmaViewer-style English 1-bases every finger (Thumb_01..Thumb_03). That is the
 * "UmaViewer off-by-one": 親指１ == Thumb_02, not Thumb_01.
 */

export type Side = "L" | "R";
export type Finger = "thumb" | "index" | "middle" | "ring" | "pinky";

const FINGERS: Record<Finger, { jp: string; en: string }> = {
  thumb: { jp: "親指", en: "thumb" },
  index: { jp: "人指", en: "index" },
  middle: { jp: "中指", en: "middle" },
  ring: { jp: "薬指", en: "ring" },
  pinky: { jp: "小指", en: "pinky" },
};
const FINGER_LIST = Object.keys(FINGERS) as Finger[];

const JP_SIDE: Record<Side, string> = { L: "左", R: "右" };

// Hiragana, katakana, CJK ideographs, half-width katakana.
const JAPANESE_CHAR = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;

function toHalfWidthDigits(s: string): string {
  return s.replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** Fold full-width digits/spaces to half-width; keep Japanese text intact. */
function normalizeJapanese(name: string): string {
  return toHalfWidthDigits(name.trim()).replace(/\u3000/g, " ");
}

/** Lowercase and drop every separator so "Left Arm", "left_arm", "L.Arm" match. */
function normalizeEnglish(name: string): string {
  return toHalfWidthDigits(name.trim())
    .replace(/\u3000/g, " ")
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "");
}

function buildJapaneseMap(): Map<string, string> {
  const map = new Map<string, string>();

  const neutral: Array<[string, string]> = [
    ["全ての親", "root"],
    ["センター", "center"],
    ["グルーブ", "groove"],
    ["腰", "hips"],
    ["上半身", "spine"],
    ["上半身2", "chest"],
    ["首", "neck"],
    ["頭", "head"],
    ["両目", "eyes"],
  ];
  for (const [jp, canonical] of neutral) map.set(jp, canonical);

  const sided: Array<[string, string]> = [
    ["目", "eye"],
    ["肩", "shoulder"],
    ["腕", "upperArm"],
    ["ひじ", "forearm"],
    ["手首", "wrist"],
    ["足", "thigh"],
    ["ひざ", "knee"],
    ["足首", "ankle"],
    ["つま先", "toe"],
  ];
  for (const side of ["L", "R"] as const) {
    for (const [jpSuffix, base] of sided) map.set(`${JP_SIDE[side]}${jpSuffix}`, `${base}.${side}`);
  }

  for (const side of ["L", "R"] as const) {
    const prefix = JP_SIDE[side];
    for (const finger of FINGER_LIST) {
      const { jp } = FINGERS[finger];
      const start = finger === "thumb" ? 0 : 1; // thumb 0-based, others 1-based
      for (let i = 0; i < 3; i++) map.set(`${prefix}${jp}${start + i}`, `${finger}.${side}.${i}`);
    }
  }

  return map;
}
function buildEnglishMap(): Map<string, string> {
  const map = new Map<string, string>();

  const neutral: Array<[string[], string]> = [
    [["center"], "center"],
    [["groove"], "groove"],
    [["waist", "hip", "hips", "pelvis", "lowerbody", "hiplower"], "hips"],
    [["upperbody", "spine", "spine1", "abdomen", "torso"], "spine"],
    [["upperbody2", "chest", "spine2", "breast"], "chest"],
    [["neck"], "neck"],
    [["head"], "head"],
    [["eyes", "botheyes", "eyeboth"], "eyes"],
    [["root", "allparents", "allparent", "master"], "root"],
  ];
  for (const [aliases, canonical] of neutral) for (const a of aliases) map.set(a, canonical);

  const sided: Array<[string[], string]> = [
    [["eye"], "eye"],
    [["shoulder", "clavicle"], "shoulder"],
    [["arm", "upperarm", "bicep"], "upperArm"],
    [["elbow", "forearm", "lowerarm"], "forearm"],
    [["wrist", "hand"], "wrist"],
    [["leg", "thigh", "upleg", "upperleg"], "thigh"],
    [["knee"], "knee"],
    [["ankle", "foot"], "ankle"],
    [["toe", "toes", "foottip"], "toe"],
  ];
  for (const side of ["L", "R"] as const) {
    const prefixes = side === "L" ? ["left", "l"] : ["right", "r"];
    const suffix = side.toLowerCase();
    for (const [aliases, base] of sided) {
      const canonical = `${base}.${side}`;
      for (const stem of aliases) {
        for (const prefix of prefixes) {
          map.set(`${prefix}${stem}`, canonical);
          map.set(`${stem}${prefix}`, canonical);
        }
        map.set(`${stem}${suffix}`, canonical);
      }
    }
  }

  for (const side of ["L", "R"] as const) {
    const prefixes = side === "L" ? ["left", "l"] : ["right", "r"];
    const suffix = side.toLowerCase();
    for (const finger of FINGER_LIST) {
      const { en } = FINGERS[finger];
      for (let i = 0; i < 3; i++) {
        const canonical = `${finger}.${side}.${i}`;
        const umaViewer = ("0" + (i + 1)).slice(-2); // 1-based, two digits
        const mmdTools = finger === "thumb" ? String(i) : String(i + 1); // thumb 0-based
        for (const n of new Set([umaViewer, mmdTools])) {
          for (const prefix of prefixes) {
            map.set(`${prefix}${en}${n}`, canonical);
            map.set(`${en}${n}${prefix}`, canonical);
            map.set(`${en}${n}${suffix}`, canonical);
          }
        }
      }
    }
  }

  return map;
}

const JAPANESE = buildJapaneseMap();
const ENGLISH = buildEnglishMap();

/** Reduce a Japanese or English bone name to a canonical key, or `null`. */
export function canonicalizeBoneName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (JAPANESE_CHAR.test(trimmed)) return JAPANESE.get(normalizeJapanese(trimmed)) ?? null;
  return ENGLISH.get(normalizeEnglish(trimmed)) ?? null;
}

