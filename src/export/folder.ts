import { createZip, type ZipEntry } from "./zip";

/** The files that make up a finished AO2 3D character folder. */
export interface CharacterArchive {
  /** Canonical char.ini text. */
  charIni: string;
  /** Optional camera.json text (3D characters only). */
  cameraJson?: string;
  /** The .pmx model (name relative to the character root). */
  model: ZipEntry;
  /** VMD motions referenced by char.ini anim/preanim fields. */
  motions: ZipEntry[];
  /** Textures with relative paths preserved (e.g. "textures/face.png"). */
  textures: ZipEntry[];
}

/** Assemble the on-disk character-folder entries (before zipping). */
export function buildCharacterEntries(character: CharacterArchive): ZipEntry[] {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [{ name: "char.ini", data: encoder.encode(character.charIni) }];
  if (character.cameraJson !== undefined) {
    entries.push({ name: "camera.json", data: encoder.encode(character.cameraJson) });
  }
  entries.push(character.model, ...character.motions, ...character.textures);
  return entries;
}

/** Assemble a character folder into a ZIP archive Blob. */
export async function buildCharacterArchive(character: CharacterArchive): Promise<Blob> {
  return createZip(buildCharacterEntries(character));
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
