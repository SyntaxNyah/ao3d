import { describe, expect, it } from "vitest";

import { resolveReferenceFiles, type LocalFile } from "./referenceFiles";

function file(path: string): LocalFile {
  return { path, data: new ArrayBuffer(0), mimeType: "image/png" };
}

describe("resolveReferenceFiles", () => {
  it("matches PMX-relative texture paths (normalizing backslashes)", () => {
    const result = resolveReferenceFiles(
      [file("Texture2D/base.png"), file("Texture2D/face.png")],
      "model.pmx",
      ["Texture2D\\base.png", "Texture2D/face.png"],
    );

    expect(result.missing).toEqual([]);
    expect(result.referenceFiles.map((r) => r.relativePath)).toEqual([
      "Texture2D/base.png",
      "Texture2D/face.png",
    ]);
  });

  it("prefixes the PMX directory when the model is in a subfolder", () => {
    const result = resolveReferenceFiles(
      [file("fenomeno/Texture2D/base.png")],
      "fenomeno/1127_Fenomeno.pmx",
      ["Texture2D/base.png"],
    );

    expect(result.missing).toEqual([]);
    expect(result.referenceFiles[0].relativePath).toBe("Texture2D/base.png");
  });

  it("falls back to basename matching for flat drops", () => {
    const result = resolveReferenceFiles(
      [file("base.png")],
      "model.pmx",
      ["Texture2D/base.png"],
    );

    expect(result.missing).toEqual([]);
    expect(result.referenceFiles[0].relativePath).toBe("Texture2D/base.png");
  });

  it("is case-insensitive", () => {
    const result = resolveReferenceFiles(
      [file("texture2d/BASE.PNG")],
      "model.pmx",
      ["Texture2D/base.png"],
    );

    expect(result.missing).toEqual([]);
  });

  it("matches flat PMX paths against files inside a Texture2D subfolder", () => {
    const result = resolveReferenceFiles(
      [file("Texture2D/tex_bdy1127_00_diff.png")],
      "1127_Fenomeno.pmx",
      ["tex_bdy1127_00_diff.png"],
    );

    expect(result.missing).toEqual([]);
    expect(result.referenceFiles[0].relativePath).toBe("tex_bdy1127_00_diff.png");
  });

  it("does not guess when multiple files share a basename", () => {
    const result = resolveReferenceFiles(
      [file("a/face.png"), file("b/face.png")],
      "model.pmx",
      ["face.png"],
    );

    expect(result.missing).toEqual(["face.png"]);
  });

  it("reports textures that cannot be resolved", () => {
    const result = resolveReferenceFiles(
      [file("Texture2D/base.png")],
      "model.pmx",
      ["Texture2D/base.png", "Texture2D/missing.png"],
    );

    expect(result.referenceFiles).toHaveLength(1);
    expect(result.missing).toEqual(["Texture2D/missing.png"]);
  });
});
