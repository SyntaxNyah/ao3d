import type { Easing } from "./constants";

/** A camera framing, normalized to character height (all fields optional). */
export interface Pose {
  targetY?: number;
  distance?: number;
  yaw?: number;
  pitch?: number;
  fov?: number;
}

/** A Pose at a normalized time `t` (0..1 across the phase's driving motion). */
export interface Keyframe {
  t: number;
  targetY?: number;
  distance?: number;
  yaw?: number;
  pitch?: number;
  fov?: number;
}

/** An animated camera: poses interpolated over the phase. */
export interface KeyedClip {
  keys: Keyframe[];
  easing?: Easing;
}

/** A static Pose or an animated KeyedClip. */
export type Clip = Pose | KeyedClip;

/** Camera for one emote: a `loop` shot and/or a `preanim` one-shot. */
export interface EmoteCamera {
  loop?: Clip;
  preanim?: Clip;
}

/** Parsed shape of a character's camera.json (3D characters only). */
export interface CameraRig {
  default?: Clip;
  emotes?: Record<string, EmoteCamera>;
}

/** A Clip with a `keys` array is a KeyedClip; otherwise it is a bare Pose. */
export function isKeyedClip(clip: Clip): clip is KeyedClip {
  return "keys" in clip;
}

/**
 * Serialize a camera rig to canonical camera.json. Poses are height-normalized
 * (targetY as a fraction of height, distance in character-heights, yaw/pitch/fov
 * in degrees). Auto-closing a loop's first/last keyframes is the authoring UI's
 * job (Phase 6), not the writer's.
 */
export function writeCameraJson(rig: CameraRig): string {
  return JSON.stringify(rig, null, 2) + "\n";
}
