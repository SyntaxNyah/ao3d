import type { CharacterArchive } from "../export";
import type { CameraRig, Clip, EmoteCamera, Pose } from "../format/camera";
import type { CharEmote, CharIni, CharIniOptions } from "../format/charIni";
import { writeCameraJson, writeCharIni } from "../format";

export interface ProjectModel {
  name: string;
  data: Uint8Array;
}

export interface ProjectMotion {
  name: string;
  data: Uint8Array;
}

export interface ProjectTexture {
  name: string;
  data: Uint8Array;
}

export interface ProjectEmote {
  /** Emote button name; also the char.ini block name and camera.json key. */
  key: string;
  /** Base-loop motion filename (or null when not assigned yet). */
  anim: string | null;
  /** Optional one-shot pre-animation motion filename. */
  preanim: string | null;
  /** AO emote modifier (EmoteModifier number). */
  modifier: number;
  /** Desk modifier, or null for the consumer default (shown). */
  deskMod: number | null;
  /** Camera shot for the idle/talking loop. */
  loop: Clip;
  /** Camera shot for the preanim phase, or null. */
  preanimCamera: Clip | null;
}

/** Sensible resting shot so a whole character can be rigged without tuning. */
export const DEFAULT_POSE: Pose = { targetY: 0.9, distance: 2.5, yaw: 0, pitch: 0, fov:30 };

/** The mutable authoring state for one character. */
export class CharacterProject {
  options: CharIniOptions;
  model: ProjectModel | null = null;
  readonly motions: ProjectMotion[] = [];
  readonly textures: ProjectTexture[] = [];
  readonly emotes: ProjectEmote[] = [];

  constructor(options?: CharIniOptions) {
    this.options =
      options ?? { name: "", showname: "", side: "", gender: "", blips: "", chat: "", category: "", model: "" };
  }

  setModel(model: ProjectModel): void {
    this.model = model;
    this.options.model = model.name;
  }

  addMotion(motion: ProjectMotion): void {
    this.motions.push(motion);
  }

  addTexture(texture: ProjectTexture): void {
    this.textures.push(texture);
  }

  addEmote(key: string): ProjectEmote {
    const emote: ProjectEmote = {
      key,
      anim: null,
      preanim: null,
      modifier: 0,
      deskMod: null,
      loop: { ...DEFAULT_POSE },
      preanimCamera: null,
    };
    this.emotes.push(emote);
    return emote;
  }

  removeEmote(key: string): void {
    const i = this.emotes.findIndex((e) => e.key === key);
    if (i !== -1) this.emotes.splice(i, 1);
  }

  /** Clear all authoring state (for loading a new character). */
  reset(): void {
    this.model = null;
    this.motions.length = 0;
    this.textures.length = 0;
    this.emotes.length = 0;
    this.options = { name: "", showname: "", side: "", gender: "", blips: "", chat: "", category: "", model: "" };
  }

  motion(name: string): ProjectMotion | undefined {
    return this.motions.find((m) => m.name === name);
  }

  /** Build the normalized char.ini. Throws if the project is incomplete. */
  buildCharIni(): CharIni {
    if (!this.model) throw new Error("No model assigned");
    const emotes: CharEmote[] = this.emotes.map((emote, index) => {
      if (!emote.anim) throw new Error(`Emote "${emote.key}" has no base motion`);
      return {
        id: index + 1,
        key: emote.key,
        name: emote.key,
        anim: emote.anim,
        preanim: emote.preanim,
        modifier: emote.modifier,
        deskMod: emote.deskMod,
        sound: null,
        soundDelayMs: null,
      };
    });
    return { options: this.options, emotes, sections: {} };
  }

  /** Build the camera rig (default resting shot + per-emote overrides). */
  buildCameraRig(): CameraRig {
    const emotes: Record<string, EmoteCamera> = {};
    for (const emote of this.emotes) {
      const camera: EmoteCamera = {};
      if (emote.loop) camera.loop = emote.loop;
      if (emote.preanimCamera) camera.preanim = emote.preanimCamera;
      if (camera.loop || camera.preanim) emotes[emote.key] = camera;
    }
    return {
      default: { ...DEFAULT_POSE },
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    };
  }

  /** Assemble the exportable character folder. Throws if incomplete. */
  buildFolder(): CharacterArchive {
    if (!this.model) throw new Error("No model assigned");
    const charIni = writeCharIni(this.buildCharIni());
    const cameraJson = writeCameraJson(this.buildCameraRig());

    const referenced = new Set<string>();
    for (const emote of this.emotes) {
      if (emote.anim) referenced.add(emote.anim);
      if (emote.preanim) referenced.add(emote.preanim);
    }

    const motions = [];
    for (const name of referenced) {
      const motion = this.motion(name);
      if (!motion) throw new Error(`Motion "${name}" referenced but not loaded`);
      motions.push({ name: motion.name, data: motion.data });
    }

    return {
      charIni,
      cameraJson,
      model: { name: this.model.name, data: this.model.data },
      motions,
      textures: this.textures.map((t) => ({ name: t.name, data: t.data })),
    };
  }
}
