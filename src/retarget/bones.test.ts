import { describe, expect, it } from "vitest";

import { canonicalizeBoneName } from "./bones";

describe("canonicalizeBoneName", () => {
  it("normalizes Japanese body bones", () => {
    expect(canonicalizeBoneName("センター")).toBe("center");
    expect(canonicalizeBoneName("グルーブ")).toBe("groove");
    expect(canonicalizeBoneName("腰")).toBe("hips");
    expect(canonicalizeBoneName("上半身")).toBe("spine");
    expect(canonicalizeBoneName("上半身2")).toBe("chest");
    expect(canonicalizeBoneName("首")).toBe("neck");
    expect(canonicalizeBoneName("頭")).toBe("head");
    expect(canonicalizeBoneName("両目")).toBe("eyes");
    expect(canonicalizeBoneName("全ての親")).toBe("root");
  });

  it("normalizes Japanese sided bones", () => {
    expect(canonicalizeBoneName("左肩")).toBe("shoulder.L");
    expect(canonicalizeBoneName("右腕")).toBe("upperArm.R");
    expect(canonicalizeBoneName("左ひじ")).toBe("forearm.L");
    expect(canonicalizeBoneName("右手首")).toBe("wrist.R");
    expect(canonicalizeBoneName("左足")).toBe("thigh.L");
    expect(canonicalizeBoneName("右ひざ")).toBe("knee.R");
    expect(canonicalizeBoneName("左足首")).toBe("ankle.L");
    expect(canonicalizeBoneName("右つま先")).toBe("toe.R");
  });

  it("normalizes English body bones across casing and separators", () => {
    expect(canonicalizeBoneName("Center")).toBe("center");
    expect(canonicalizeBoneName("Waist")).toBe("hips");
    expect(canonicalizeBoneName("Upper Body")).toBe("spine");
    expect(canonicalizeBoneName("Upper Body 2")).toBe("chest");
    expect(canonicalizeBoneName("Neck")).toBe("neck");
    expect(canonicalizeBoneName("Head")).toBe("head");
    expect(canonicalizeBoneName("Eyes")).toBe("eyes");
    expect(canonicalizeBoneName("Root")).toBe("root");
  });

  it("normalizes English sided bones with prefix/suffix sides", () => {
    expect(canonicalizeBoneName("Left Shoulder")).toBe("shoulder.L");
    expect(canonicalizeBoneName("Right Arm")).toBe("upperArm.R");
    expect(canonicalizeBoneName("left_elbow")).toBe("forearm.L");
    expect(canonicalizeBoneName("RightWrist")).toBe("wrist.R");
    expect(canonicalizeBoneName("L_Thigh")).toBe("thigh.L");
    expect(canonicalizeBoneName("Knee_R")).toBe("knee.R");
    expect(canonicalizeBoneName("left ankle")).toBe("ankle.L");
    expect(canonicalizeBoneName("RightToe")).toBe("toe.R");
  });

  it("canonicalizes Japanese fingers (thumb 0-based, others 1-based)", () => {
    expect(canonicalizeBoneName("左親指０")).toBe("thumb.L.0");
    expect(canonicalizeBoneName("左親指１")).toBe("thumb.L.1");
    expect(canonicalizeBoneName("左親指２")).toBe("thumb.L.2");
    expect(canonicalizeBoneName("左人指１")).toBe("index.L.0");
    expect(canonicalizeBoneName("左人指２")).toBe("index.L.1");
    expect(canonicalizeBoneName("左人指３")).toBe("index.L.2");
    expect(canonicalizeBoneName("左中指１")).toBe("middle.L.0");
    expect(canonicalizeBoneName("左薬指１")).toBe("ring.L.0");
    expect(canonicalizeBoneName("左小指１")).toBe("pinky.L.0");
    expect(canonicalizeBoneName("右親指１")).toBe("thumb.R.1");
  });

  it("canonicalizes UmaViewer-style English fingers (1-based)", () => {
    expect(canonicalizeBoneName("Thumb_01_L")).toBe("thumb.L.0");
    expect(canonicalizeBoneName("Thumb_02_L")).toBe("thumb.L.1");
    expect(canonicalizeBoneName("Thumb_03_L")).toBe("thumb.L.2");
    expect(canonicalizeBoneName("Index_01_R")).toBe("index.R.0");
    expect(canonicalizeBoneName("Middle_02_R")).toBe("middle.R.1");
    expect(canonicalizeBoneName("Ring_03_L")).toBe("ring.L.2");
    expect(canonicalizeBoneName("Pinky_01_R")).toBe("pinky.R.0");
  });

  it("canonicalizes mmd_tools-style English fingers (thumb 0-based)", () => {
    expect(canonicalizeBoneName("Left Thumb 0")).toBe("thumb.L.0");
    expect(canonicalizeBoneName("Left Thumb 1")).toBe("thumb.L.1");
    expect(canonicalizeBoneName("Left Index 1")).toBe("index.L.0");
    expect(canonicalizeBoneName("Right Middle 2")).toBe("middle.R.1");
  });

  it("resolves the UmaViewer off-by-one (親指１ == Thumb_02)", () => {
    expect(canonicalizeBoneName("左親指１")).toBe("thumb.L.1");
    expect(canonicalizeBoneName("Thumb_02_L")).toBe("thumb.L.1");
  });

  it("accepts full-width Japanese digits", () => {
    expect(canonicalizeBoneName("左親指１")).toBe("thumb.L.1");
    expect(canonicalizeBoneName("左人指１")).toBe("index.L.0");
    expect(canonicalizeBoneName("上半身２")).toBe("chest");
  });

  it("returns null for unrecognized or ambiguous names", () => {
    expect(canonicalizeBoneName("")).toBeNull();
    expect(canonicalizeBoneName("not a bone")).toBeNull();
    expect(canonicalizeBoneName("Arm")).toBeNull(); // no side
  });
});
