import { describe, expect, it } from "vitest";

import { parseCharIni } from "../format";
import { CharacterProject, DEFAULT_POSE } from "./project";

function makeProject(): CharacterProject {
  const project = new CharacterProject();
  project.setModel({ name: "model.pmx", data: new Uint8Array([1, 2, 3]) });
  project.addMotion({ name: "idle.vmd", data: new Uint8Array([4, 5]) });
  project.addMotion({ name: "point.vmd", data: new Uint8Array([6, 7]) });
  project.addTexture({ name: "Texture2D/face.png", data: new Uint8Array([8, 9]) });
  return project;
}

describe("CharacterProject", () => {
  it("builds a char.ini from emotes", () => {
    const project = makeProject();
    const emote = project.addEmote("objection");
    emote.anim = "idle.vmd";
    emote.preanim = "point.vmd";
    emote.modifier = 5;
    emote.deskMod = 1;

    const charIni = project.buildCharIni();
    expect(charIni.options.model).toBe("model.pmx");
    expect(charIni.emotes).toHaveLength(1);
    expect(charIni.emotes[0]).toMatchObject({
      id: 1,
      key: "objection",
      anim: "idle.vmd",
      preanim: "point.vmd",
      modifier: 5,
      deskMod: 1,
    });
  });

  it("round-trips through writeCharIni / parseCharIni", () => {
    const project = makeProject();
    project.addEmote("objection").anim = "idle.vmd";
    const think = project.addEmote("think");
    think.anim = "idle.vmd";
    think.modifier = 0;
    think.deskMod = null;

    const reparsed = parseCharIni(project.buildFolder().charIni);
    expect(reparsed.options.model).toBe("model.pmx");
    expect(reparsed.emotes.map((e) => e.key)).toEqual(["objection", "think"]);
    expect(reparsed.emotes[0].anim).toBe("idle.vmd");
  });

  it("builds a camera rig with default + per-emote overrides", () => {
    const project = makeProject();
    const emote = project.addEmote("objection");
    emote.loop = { distance: 2.2 };
    emote.preanimCamera = { keys: [{ t: 0, distance: 2.2 }, { t: 1, distance: 1.4 }], easing: "easeInOut" };

    const rig = project.buildCameraRig();
    expect(rig.default).toEqual(DEFAULT_POSE);
    expect(rig.emotes?.objection.loop).toEqual({ distance: 2.2 });
    expect(rig.emotes?.objection.preanim).toEqual({
      keys: [{ t: 0, distance: 2.2 }, { t: 1, distance: 1.4 }],
      easing: "easeInOut",
    });
  });

  it("assembles only the motions referenced by emotes", () => {
    const project = makeProject();
    project.addEmote("objection").anim = "idle.vmd";
    project.addEmote("think").anim = "idle.vmd";

    const folder = project.buildFolder();
    expect(folder.motions.map((m) => m.name)).toEqual(["idle.vmd"]); // point.vmd unreferenced
    expect(folder.model.name).toBe("model.pmx");
    expect(folder.textures.map((t) => t.name)).toEqual(["Texture2D/face.png"]);
    expect(folder.charIni).toContain("[emote objection]");
    expect(JSON.parse(folder.cameraJson!)).toHaveProperty("default");
  });

  it("throws when the model is missing", () => {
    const project = new CharacterProject();
    project.addEmote("x").anim = "idle.vmd";
    expect(() => project.buildCharIni()).toThrow("No model");
  });

  it("throws when an emote has no base motion", () => {
    const project = makeProject();
    project.addEmote("incomplete");
    expect(() => project.buildCharIni()).toThrow("no base motion");
  });
});
