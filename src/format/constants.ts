// Canonical AO2 character-format constants, transcribed from the aolib-meta
// schemas (schemas/assets/CharIni.schema.json + CameraRig.schema.json).
//
// These are the single source of truth for the enum values below. Do not
// edit them to "fix" something — if they diverge from aolib-meta, update the
// schema first.

/** Milliseconds per legacy `[soundt]` tick (TICK_MS == UPDATE_INTERVAL). */
export const TICK_MS = 60;

/** Canonical char.ini sound-delay key; legacy `sounddelay` is an import synonym. */
export const SOUND_DELAY_KEY = "sounddelayms";
export const SOUND_DELAY_LEGACY_KEY = "sounddelay";

/** `modifier` values (EmoteModifier). Numeric + symbolic forms. */
export const EMOTE_MODIFIER = {
  no_preanim: 0,
  preanim: 1,
  preanim_and_objection: 2,
  zoom: 5,
  objection_zoom: 6,
} as const;
export type EmoteModifier = (typeof EMOTE_MODIFIER)[keyof typeof EMOTE_MODIFIER];

/** `deskmod` values (DeskModifier). Numeric + symbolic forms. */
export const DESK_MODIFIER = {
  hidden: 0,
  shown: 1,
  hide_during_preanim: 2,
  show_during_preanim: 3,
  hide_and_center_during_preanim: 4,
  show_during_preanim_then_center: 5,
} as const;
export type DeskModifier = (typeof DESK_MODIFIER)[keyof typeof DESK_MODIFIER];

/** `camera.json` KeyedClip easing modes. */
export const EASING = ["linear", "easeIn", "easeOut", "easeInOut"] as const;
export type Easing = (typeof EASING)[number];
