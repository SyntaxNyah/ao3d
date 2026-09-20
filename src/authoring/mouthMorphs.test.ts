import { describe, expect, it } from "vitest";

import { detectMouthMorphs } from "./mouthMorphs";

describe("detectMouthMorphs", () => {
  it("detects Japanese kana mouth morphs", () => {
    expect(detectMouthMorphs(["あ", "い", "う", "え", "お"])).toEqual({
      a: "あ",
      i: "い",
      u: "う",
      e: "え",
      o: "お",
    });
  });

  it("detects bare English vowel letters", () => {
    expect(detectMouthMorphs(["A", "i", "U", "e", "O"])).toEqual({
      a: "A",
      i: "i",
      u: "U",
      e: "e",
      o: "O",
    });
  });

  it("detects Talk* / mouth* / vowel* conventions", () => {
    expect(detectMouthMorphs(["Talk_あ_L", "Talk_I", "mouth_u", "vowel_e", "TalkO_L"])).toEqual({
      a: "Talk_あ_L",
      i: "Talk_I",
      u: "mouth_u",
      e: "vowel_e",
      o: "TalkO_L",
    });
  });

  it("leaves vowels null when no mouth morph is present", () => {
    expect(detectMouthMorphs(["まばたき", "笑い", "口閉じ", "smile"])).toEqual({
      a: null,
      i: null,
      u: null,
      e: null,
      o: null,
    });
  });

  it("ignores non-vowel mouth morphs (open/close)", () => {
    expect(detectMouthMorphs(["あ", "口開き", "口閉じ"])).toEqual({
      a: "あ",
      i: null,
      u: null,
      e: null,
      o: null,
    });
  });
});
