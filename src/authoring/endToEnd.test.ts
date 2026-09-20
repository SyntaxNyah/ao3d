import { describe, expect, it } from "vitest";

import { buildCharacterArchive } from "../export";
import { unzip } from "../export/testUtils";
import { parseCharIni } from "../format";
import { CharacterProject } from "./project";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("end-to-end export", () => {
  it("zips a rigged character whose char.ini/camera.json round-trip", async () => {
    const project = new CharacterProject();
    project.options.name = "Fenomeno";
    project.setModel({ name: "1127_Fenomeno.pmx", data: encoder.encode("pmx") });
    project.addMotion({ name: "UMA_idle.vmd", data: encoder.encode("idle") });
    project.addMotion({ name: "UMA_point.vmd", data: encoder.encode("point") });
    project.addTexture({ name: "Texture2D/face.png", data: encoder.encode("png") });

    const objection = project.addEmote("objection");
    objection.anim = "UMA_idle.vmd";
    objection.preanim = "UMA_point.vmd";
    objection.modifier = 6; // objection_zoom
    objection.deskMod = 4; // hide_and_center_during_preanim
    objection.loop = { distance: 2.2 };

    const think = project.addEmote("think");
    think.anim = "UMA_idle.vmd";

    const blob = await buildCharacterArchive(project.buildFolder());
    const files = await unzip(new Uint8Array(await blob.arrayBuffer()));
    const byName = new Map(files.map((file) => [file.name, file.data]));

    // The flat export layout LemmyAO loads from `characters/<name>/`.
    expect([...byName.keys()].sort()).toEqual([
      "1127_Fenomeno.pmx",
      "Texture2D/face.png",
      "UMA_idle.vmd",
      "UMA_point.vmd",
      "camera.json",
      "char.ini",
    ]);

    const charIni = parseCharIni(decoder.decode(byName.get("char.ini")!));
    expect(charIni.options.model).toBe("1127_Fenomeno.pmx");
    expect(charIni.emotes.map((e) => [e.key, e.anim, e.preanim, e.modifier, e.deskMod])).toEqual([
      ["objection", "UMA_idle.vmd", "UMA_point.vmd", 6, 4],
      ["think", "UMA_idle.vmd", null, 0, null],
    ]);

    const camera = JSON.parse(decoder.decode(byName.get("camera.json")!));
    expect(camera.default).toMatchObject({ targetY: 0.9, distance: 2.5, fov: 30 });
    expect(camera.emotes.objection.loop).toMatchObject({ distance: 2.2 });
  });
});
