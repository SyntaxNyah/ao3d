// Minimal PMX (Polygon Model eXtended) 2.x header walker.
//
// We do not fully parse the model here — babylon-mmd's PmxLoader does that in
// Phase 2. This module only extracts the texture table so local loading can
// resolve textures into referenceFiles without an HTTP server.

const UTF8 = new TextDecoder("utf-8");
const UTF16LE = new TextDecoder("utf-16le");

function readAscii(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

function weightByteLength(deformType: number, boneIndexSize: number): number {
  switch (deformType) {
    case 0: return boneIndexSize;               // BDEF1
    case 1: return boneIndexSize * 2 + 4;       // BDEF2
    case 2: return boneIndexSize * 4 + 16;      // BDEF4
    case 3: return boneIndexSize * 4 + 16 + 36; // SDEF (adds C, R0, R1 vec3s)
    case 4: return boneIndexSize * 4 + 16;      // QDEF
    default: throw new Error(`PMX parse error: unknown weight deform type ${deformType}`);
  }
}

/**
 * Return the texture paths stored in a PMX model's texture table.
 *
 * Paths are returned verbatim (e.g. "Texture2D/base.png" or
 * "Texture2D\\base.png"); callers normalize them for filesystem matching.
 */
export function parsePmxTexturePaths(buffer: ArrayBuffer): string[] {
  const view = new DataView(buffer);
  const byteLength = view.byteLength;

  const magic = readAscii(view, 0, 4);
  if (magic !== "PMX " && magic !== "PMX\0") {
    throw new Error(`Not a PMX file (bad magic "${magic}")`);
  }

  const version = view.getFloat32(4, true);
  if (version !== 2.0 && version !== 2.1) {
    throw new Error(`Unsupported PMX version: ${version}`);
  }

  const globalsCount = view.getUint8(8);
  if (globalsCount < 8) {
    throw new Error(`PMX globals count ${globalsCount} is less than 8`);
  }

  const decoder = view.getUint8(9) === 1 ? UTF8 : UTF16LE;
  const additionalUvCount = view.getUint8(10);
  const vertexIndexSize = view.getUint8(11);
  // Vertex *weights* reference bones, so the weight block uses the bone index
  // size (byte 14), not the vertex index size (byte 11). Models with more than
  // 65535 vertices but fewer than 65536 bones (e.g. vertexIndexSize 4,
  // boneIndexSize 2) otherwise drift out of alignment.
  const boneIndexSize = view.getUint8(14);

  let offset = 9 + globalsCount;

  // Model name (JP/EN) and comment (JP/EN): four length-prefixed strings.
  for (let i = 0; i < 4; i++) {
    offset += 4 + view.getUint32(offset, true);
  }

  const vertexCount = view.getUint32(offset, true);
  offset += 4;

  // Skip vertices. Each vertex is: position (3f) + normal (3f) + uv (2f) +
  // additional uvs + weight block (type-dependent) + edge scale (1f).
  const fixedVertexBytes = 32 + additionalUvCount * 16;
  for (let i = 0; i < vertexCount; i++) {
    offset += fixedVertexBytes;
    if (offset + 1 > byteLength) {
      throw new Error("PMX parse error: truncated vertex block");
    }
    const deformType = view.getUint8(offset);
    offset += 1 + weightByteLength(deformType, boneIndexSize) + 4;
  }

  const faceCount = view.getUint32(offset, true);
  offset += 4 + faceCount * vertexIndexSize;

  const textureCount = view.getUint32(offset, true);
  offset += 4;

  const textures: string[] = [];
  for (let i = 0; i < textureCount; i++) {
    if (offset + 4 > byteLength) {
      throw new Error("PMX parse error: truncated texture table");
    }
    const length = view.getUint32(offset, true);
    offset += 4;
    if (offset + length > byteLength) {
      throw new Error("PMX parse error: truncated texture path");
    }
    textures.push(decoder.decode(new Uint8Array(buffer, offset, length)));
    offset += length;
  }

  return textures;
}
