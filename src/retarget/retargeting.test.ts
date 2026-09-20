import { describe, expect, it } from "vitest";

import { buildRetargetingMap } from "./retargeting";

describe("buildRetargetingMap", () => {
  it("maps Japanese motion bones to English model bones", () => {
    const { map, missing } = buildRetargetingMap(
      ["センター", "左腕", "右腕"],
      ["Center", "Left Arm", "Right Arm"],
    );
    expect(map).toEqual({ Center: "センター", "Left Arm": "左腕", "Right Arm": "右腕" });
    expect(missing).toEqual([]);
  });

  it("maps English motion bones to Japanese model bones", () => {
    const { map, missing } = buildRetargetingMap(["Left Arm", "Right Arm"], ["左腕", "右腕"]);
    expect(map).toEqual({ 左腕: "Left Arm", 右腕: "Right Arm" });
    expect(missing).toEqual([]);
  });

  it("retargets fingers across the UmaViewer off-by-one", () => {
    const { map } = buildRetargetingMap(
      ["左親指１", "左人指１", "左中指２"],
      ["Thumb_02_L", "Index_01_L", "Middle_02_L"],
    );
    expect(map).toEqual({ Thumb_02_L: "左親指１", Index_01_L: "左人指１", Middle_02_L: "左中指２" });
  });

  it("leaves exact-name matches out of the map", () => {
    const { map, missing } = buildRetargetingMap(["左腕", "センター"], ["左腕", "センター"]);
    expect(map).toEqual({});
    expect(missing).toEqual([]);
  });

  it("reports bones that cannot bind", () => {
    const { map, missing } = buildRetargetingMap(
      ["センター", "左腕", "left_finger_unknown"],
      ["Center", "Left Arm"],
    );
    expect(map).toEqual({ Center: "センター", "Left Arm": "左腕" });
    expect(missing).toEqual(["left_finger_unknown"]);
  });

  it("warns when a motion's fingers have no matching model bones", () => {
    const { map, missing } = buildRetargetingMap(
      ["左親指１", "左人指１", "左小指１"],
      ["Thumb_02_L"],
    );
    expect(map).toEqual({ Thumb_02_L: "左親指１" });
    expect(missing).toEqual(["左人指１", "左小指１"]);
  });
});
