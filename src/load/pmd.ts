// Minimal PMD (Polygon Model Data - the legacy MMD format) header walker.
//
// Like pmx.ts, we do not fully parse the model here: babylon-mmd's PmdLoader
// does that in Phase 2. This module only extracts the material texture table so
// local loading can resolve textures into referenceFiles without an HTTP server.
//
// PMD is a *different* binary layout from PMX (magic "Pmd", Shift-JIS text,
// fixed-size records), so it needs its own walker.

const SJIS = new TextDecoder("shift-jis");

function readAscii(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

/** Decode a fixed-size, NUL-padded Shift-JIS string field. */
function readFixedSjis(buffer: ArrayBuffer, offset: number, length: number): string {
  return SJIS.decode(new Uint8Array(buffer, offset, length)).replace(/\0.*$/, "");
}

/**
 * Return the texture paths stored in a PMD model's material table.
 *
 * Each material's 20-byte texture field is NUL-padded Shift-JIS and may carry
 * several `*`-separated paths (diffuse + `.sph`/`.spa` sphere maps). Paths are
 * returned verbatim; callers normalize them for filesystem matching.
 *
 * The toon-texture ("skin") table that follows bones/IK/morphs is intentionally
 * not walked - those are shared toon bmps babylon-mmd provides defaults for.
 */
export function parsePmdTexturePaths(buffer: ArrayBuffer): string[] {
  const view = new DataView(buffer);
  const byteLength = view.byteLength;

  if (readAscii(view, 0, 3) !== "Pmd") {
    throw new Error(`Not a PMD file (bad magic "${readAscii(view, 0, 3)}")`);
  }

  // magic (3) + version float (4) + name (20) + comment (256)
  let offset = 3 + 4 + 20 + 256;

  const need = (count: number, what: string): void => {
    if (offset + count > byteLength) {
      throw new Error(`PMD parse error: truncated ${what}`);
    }
  };

  need(4, "vertex count");
  const vertexCount = view.getUint32(offset, true);
  // position 3f + normal 3f + uv 2f + bone indices 2x u16 + weight u8 + edge u8
  offset += 4 + vertexCount * 38;

  need(4, "face count");
  const faceCount = view.getUint32(offset, true);
  offset += 4 + faceCount * 2; // u16 vertex indices

  need(4, "material count");
  const materialCount = view.getUint32(offset, true);
  offset += 4;

  const textures: string[] = [];
  for (let i = 0; i < materialCount; i++) {
    need(70, "material block");
    // Material record is 70 bytes; the texture field is the trailing 20 bytes.
    const field = readFixedSjis(buffer, offset + 50, 20);
    offset += 70;
    for (const path of field.split("*")) {
      if (path !== "") textures.push(path);
    }
  }

  return textures;
}