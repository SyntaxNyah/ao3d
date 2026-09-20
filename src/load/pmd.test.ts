import { describe, expect, it } from "vitest";

import { parsePmdTexturePaths } from "./pmd";

/** Build a minimal, valid PMD buffer with the given material textures. */
function buildPmd(textures: string[], vertexCount = 0): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const writeBytes = (bytes: Uint8Array): void => { parts.push(bytes); };
  const writeU8 = (value: number): void => writeBytes(new Uint8Array([value]));
  const writeU16 = (value: number): void => {
    const b = new ArrayBuffer(2);
    new DataView(b).setUint16(0, value, true);
    writeBytes(new Uint8Array(b));
  };
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
  const writeFixedSjis = (value: string, length: number): void => {
    // Test names are ASCII, whose bytes are identical in Shift-JIS and UTF-8.
    const bytes = encoder.encode(value);
    const out = new Uint8Array(length);
    out.set(bytes.subarray(0, Math.min(bytes.length, length)));
    writeBytes(out);
  };

  // Header: magic + version + name + comment.
  writeBytes(encoder.encode("Pmd"));
  writeF32(1.0);
  writeFixedSjis("", 20); // model name
  writeFixedSjis("", 256); // comment

  // Vertices (38 bytes each).
  writeU32(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    writeF32(0); writeF32(0); writeF32(0); // position
    writeF32(0); writeF32(0); writeF32(0); // normal
    writeF32(0); writeF32(0); // uv
    writeU16(0); writeU16(0); // bone indices
    writeU8(0); // bone weight
    writeU8(0); // edge flag
  }

  // Faces.
  writeU32(0);

  // Materials (70 bytes each): texture field at byte offset 50.
  writeU32(textures.length);
  for (const texture of textures) {
    writeF32(1); writeF32(1); writeF32(1); writeF32(1); // diffuse
    writeF32(1); // shininess
    writeF32(1); writeF32(1); writeF32(1); // specular
    writeF32(1); writeF32(1); writeF32(1); // ambient
    writeU8(0); // toon index
    writeU8(0); // edge flag
    writeU32(0); // index count
    writeFixedSjis(texture, 20); // texture path
  }

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out.buffer;
}

describe("parsePmdTexturePaths", () => {
  it("reads the material texture table", () => {
    const buffer = buildPmd(["eye2.bmp", "face.bmp", "toon01.bmp"]);
    expect(parsePmdTexturePaths(buffer)).toEqual(["eye2.bmp", "face.bmp", "toon01.bmp"]);
  });

  it("splits sphere-map paths from the diffuse texture field", () => {
    const buffer = buildPmd(["body.bmp*body.spa"]);
    expect(parsePmdTexturePaths(buffer)).toEqual(["body.bmp", "body.spa"]);
  });

  it("skips vertices correctly to reach the texture table", () => {
    const buffer = buildPmd(["eye2.bmp"], 3);
    expect(parsePmdTexturePaths(buffer)).toEqual(["eye2.bmp"]);
  });

  it("skips empty material texture fields", () => {
    expect(parsePmdTexturePaths(buildPmd([""]))).toEqual([]);
  });

  it("rejects non-PMD data", () => {
    expect(() => parsePmdTexturePaths(new TextEncoder().encode("not a pmd").buffer))
      .toThrow(/Not a PMD file/);
  });
});