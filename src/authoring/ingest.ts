import type { LoadedCharacter } from "../load";
import { basename } from "../load/path";
import type { ProjectModel, ProjectMotion, ProjectTexture } from "./project";

export interface IngestedCharacter {
  model: ProjectModel;
  motions: ProjectMotion[];
  textures: ProjectTexture[];
}

/**
 * Convert a locally-loaded character (Phase 1) into the authoring project's
 * inputs: the model (flat at the zip root), the .vmd motions, and the textures
 * with their PMX-relative paths preserved.
 */
export function ingestCharacter(character: LoadedCharacter): IngestedCharacter {
  const model: ProjectModel = {
    name: basename(character.pmxPath),
    data: new Uint8Array(character.pmx),
  };
  const motions: ProjectMotion[] = character.files
    .filter((file) => file.path.toLowerCase().endsWith(".vmd"))
    .map((file) => ({ name: basename(file.path), data: new Uint8Array(file.data) }));
  const textures: ProjectTexture[] = character.referenceFiles.map((ref) => ({
    name: ref.relativePath,
    data: new Uint8Array(ref.data),
  }));
  return { model, motions, textures };
}
