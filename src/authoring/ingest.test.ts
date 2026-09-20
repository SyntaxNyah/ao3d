import { describe, expect, it } from "vitest";

import type { LoadedCharacter } from "../load";
import { ingestCharacter } from "./ingest";

describe("ingestCharacter", () => {
  it("converts a LoadedCharacter into model, motions, and textures", () => {
    const character: LoadedCharacter = {
      files: [
        { path: "folder/1127_Fenomeno.pmx", data: new ArrayBuffer(4), mimeType: undefined },
        { path: "folder/UMA_idle.vmd", data: new ArrayBuffer(5), mimeType: undefined },
        { path: "folder/UMA_point.vmd", data: new ArrayBuffer(6), mimeType: undefined },
        { path: "folder/Texture2D/face.png", data: new ArrayBuffer(7), mimeType: "image/png" },
      ],
      modelPath: "folder/1127_Fenomeno.pmx",
      modelKind: "pmx",
      model: new ArrayBuffer(4),
      texturePaths: ["Texture2D/face.png"],
      referenceFiles: [
        { relativePath: "Texture2D/face.png", mimeType: "image/png", data: new ArrayBuffer(7) },
      ],
      missingTextures: [],
    };

    const ingested = ingestCharacter(character);

    expect(ingested.model.name).toBe("1127_Fenomeno.pmx");
    expect(ingested.motions.map((m) => m.name)).toEqual(["UMA_idle.vmd", "UMA_point.vmd"]);
    expect(ingested.textures.map((t) => t.name)).toEqual(["Texture2D/face.png"]);
    expect(ingested.textures[0].data.byteLength).toBe(7);
  });
});
