import { describe, expect, it } from "vitest";

import { buildCharacterArchive, buildCharacterEntries } from "./folder";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("buildCharacterEntries", () => {
  it("assembles char.ini, camera.json, model, motions, textures", () => {
    const entries = buildCharacterEntries({
      charIni: "[options]\nmodel = model.pmx\n",
      cameraJson: '{"default": {"distance": 2.5}}',
      model: { name: "model.pmx", data: new Uint8Array([1, 2, 3]) },
      motions: [{ name: "idle.vmd", data: new Uint8Array([4, 5, 6]) }],
      textures: [{ name: "textures/face.png", data: new Uint8Array([7, 8, 9]) }],
    });

    expect(entries.map((e) => e.name)).toEqual([
      "char.ini",
      "camera.json",
      "model.pmx",
      "idle.vmd",
      "textures/face.png",
    ]);
    expect(decoder.decode(entries[0].data)).toBe("[options]\nmodel = model.pmx\n");
    expect(decoder.decode(entries[1].data)).toBe('{"default": {"distance": 2.5}}');
  });

  it("omits camera.json when not provided", () => {
    const entries = buildCharacterEntries({
      charIni: "",
      model: { name: "model.pmx", data: new Uint8Array() },
      motions: [],
      textures: [],
    });
    expect(entries.map((e) => e.name)).toEqual(["char.ini", "model.pmx"]);
  });
});

describe("buildCharacterArchive", () => {
  it("produces an application/zip blob", async () => {
    const blob = await buildCharacterArchive({
      charIni: "x",
      model: { name: "model.pmx", data: encoder.encode("pmx") },
      motions: [],
      textures: [],
    });
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(0);
  });
});
