import { basename, dirname, joinPath, normalizePath } from "./path";

/** A file collected from disk, keyed by its relative path from the drop root. */
export interface LocalFile {
  /** Path relative to the drop/pick root, forward slashes, no leading "./". */
  path: string;
  data: ArrayBuffer;
  mimeType: string | undefined;
}

/**
 * A texture file ready to hand to babylon-mmd as a `referenceFiles` entry.
 *
 * Structurally matches babylon-mmd's `IArrayBufferFile`
 * (`src/Loader/referenceFileResolver.ts`): `relativePath` is matched
 * case-insensitively against the PMX texture path (after `PathNormalize`).
 */
export interface ReferenceFile {
  /** The PMX texture path, normalized to forward slashes. */
  relativePath: string;
  mimeType: string | undefined;
  data: ArrayBuffer;
}

export interface ResolveResult {
  referenceFiles: ReferenceFile[];
  /** Texture paths from the PMX that had no matching file on disk. */
  missing: string[];
}

/**
 * Match PMX texture paths against files collected from disk, producing the
 * referenceFiles array babylon-mmd needs to texture a locally-loaded model.
 *
 * PMX texture paths are relative to the PMX file's own directory, so we try:
 *   1. `pmxDir + "/" + texturePath` (folder structure preserved), then
 *   2. the texture's basename (flat drop fallback).
 * Matching is case-insensitive to survive Windows/English capitalization.
 */
export function resolveReferenceFiles(
  files: readonly LocalFile[],
  pmxPath: string,
  texturePaths: readonly string[],
): ResolveResult {
  const pmxDir = dirname(pmxPath);
  const byPath = new Map<string, LocalFile>();
  // basename → file, so a texture resolves even when its PMX path carries a
  // subdirectory (e.g. "Texture2D/face.png") but the file was dropped flat, or
  // the PMX stores a flat name while the file lives in a subfolder. `null`
  // marks an ambiguous basename (two files share it) that we won't guess on.
  const byBasename = new Map<string, LocalFile | null>();
  for (const file of files) {
    const norm = normalizePath(file.path);
    byPath.set(norm.toUpperCase(), file);
    const base = basename(norm).toUpperCase();
    byBasename.set(base, byBasename.has(base) ? null : file);
  }

  const referenceFiles: ReferenceFile[] = [];
  const missing: string[] = [];

  for (const texturePath of texturePaths) {
    const textureNorm = normalizePath(texturePath);

    let found = byPath.get(joinPath(pmxDir, textureNorm).toUpperCase());
    if (!found) {
      found = byBasename.get(basename(textureNorm).toUpperCase()) ?? undefined;
    }

    if (found) {
      referenceFiles.push({
        relativePath: textureNorm,
        mimeType: found.mimeType,
        data: found.data,
      });
    } else {
      missing.push(texturePath);
    }
  }

  return { referenceFiles, missing };
}
