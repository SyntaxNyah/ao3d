import { describe, expect, it } from "vitest";

import { parsePmxTexturePaths } from "./pmx";

/** Build a minimal, valid PMX 2.0 buffer with the given texture table. */
function buildPmx(textures: string[], vertexCount = 0): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const writeBytes = (bytes: Uint8Array): void => { parts.push(bytes); };
  const writeU8 = (value: number): void => writeBytes(new Uint8Array([value]));
  const writeU32 = (value: number): void => {
    const b = new ArrayBuffer(4);
    new DataView(b).setUint32(0, value, true);
    writeBytes(new Uint8Array(b));
  };
  const writeF32 = (value: number): void => {
    const b = new ArrayBuffer(4);
    new DataView(b).setFloat32(0, value, true);
    writeBytes(new Uint8Array(b));
  };
  const writeStr = (value: string): void => {
    const bytes = encoder.encode(value);
    writeU32(bytes.length);
    writeBytes(bytes);
  };

  // Header.
  writeBytes(encoder.encode("PMX "));
  writeF32(2.0);
  writeU8(8);       // globals count
  writeU8(1);       // encoding = UTF-8
  writeU8(0);       // additional UV count
  writeU8(1);       // vertex index size
  writeU8(1);       // texture index size
  writeU8(1);       // material index size
  writeU8(1);       // bone index size
  writeU8(1);       // morph index size
  writeU8(1);       // rigidbody index size

  // Model name (JP/EN) + comment (JP/EN).
  writeStr(""); writeStr(""); writeStr(""); writeStr("");

  // Vertices (BDEF1, single bone, edge scale 1).
  writeU32(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    for (let j = 0; j < 8; j++) writeF32(0); // position + normal + uv
    writeU8(0);   // BDEF1
    writeU8(0);   // bone index
    writeF32(1);  // edge scale
  }

  // Faces.
  writeU32(0);

  // Textures.
  writeU32(textures.length);
  for (const texture of textures) writeStr(texture);

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out.buffer;
}

describe("parsePmxTexturePaths", () => {
  it("reads the texture table", () => {
    const buffer = buildPmx(["Texture2D/base.png", "Texture2D/face.png", "toon01.bmp"]);
    expect(parsePmxTexturePaths(buffer)).toEqual([
      "Texture2D/base.png",
      "Texture2D/face.png",
      "toon01.bmp",
    ]);
  });

  it("skips vertices correctly to reach the texture table", () => {
    const buffer = buildPmx(["Texture2D/base.png"], 3);
    expect(parsePmxTexturePaths(buffer)).toEqual(["Texture2D/base.png"]);
  });

  it("returns an empty array for a textureless model", () => {
    expect(parsePmxTexturePaths(buildPmx([]))).toEqual([]);
  });

  it("rejects non-PMX data", () => {
    expect(() => parsePmxTexturePaths(new TextEncoder().encode("not a pmx").buffer))
      .toThrow(/Not a PMX file/);
  });
});
