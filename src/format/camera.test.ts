import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import { isKeyedClip, writeCameraJson, type CameraRig } from "./camera";
// Vendored verbatim from aolib-meta `schemas/assets/CameraRig.schema.json`.
import cameraRigSchema from "./schemas/CameraRig.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
const validateCameraRig = ajv.compile(cameraRigSchema);

describe("writeCameraJson", () => {
  it("serializes a camera rig and round-trips", () => {
    const rig: CameraRig = {
      default: { targetY: 0.9, distance: 2.5, yaw: 0, pitch: 0, fov: 30 },
      emotes: {
        objection: {
          loop: { distance: 2.2 },
          preanim: {
            keys: [
              { t: 0, distance: 2.2 },
              { t: 1, distance: 1.4 },
            ],
            easing: "easeInOut",
          },
        },
      },
    };
    expect(JSON.parse(writeCameraJson(rig))).toEqual(rig);
  });

  it("produces output that validates against CameraRig.schema.json", () => {
    const rig: CameraRig = {
      default: { targetY: 0.9, distance: 2.5, fov: 30 },
      emotes: {
        objection: {
          loop: { distance: 2.2 },
          preanim: {
            keys: [
              { t: 0, distance: 2.2 },
              { t: 1, distance: 1.4 },
            ],
            easing: "easeInOut",
          },
        },
      },
    };
    expect(validateCameraRig(JSON.parse(writeCameraJson(rig)))).toBe(true);
  });
});

describe("isKeyedClip", () => {
  it("distinguishes KeyedClip from bare Pose", () => {
    expect(isKeyedClip({ distance: 2 })).toBe(false);
    expect(isKeyedClip({ keys: [{ t: 0 }] })).toBe(true);
  });
});
