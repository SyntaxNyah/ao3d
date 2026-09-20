import {
  collectFilesFromDataTransfer,
  pickDirectoryViaPicker,
  pickFilesViaPicker,
  toLocalFile,
  type CollectedFile,
} from "./fileSystem";
import { parsePmdTexturePaths } from "./pmd";
import { parsePmxTexturePaths } from "./pmx";
import { resolveReferenceFiles, type LocalFile, type ReferenceFile } from "./referenceFiles";

export type ModelKind = "pmx" | "pmd";

export interface LoadedCharacter {
  files: LocalFile[];
  /** Path of the model (`.pmx` or `.pmd`) relative to the drop/pick root. */
  modelPath: string;
  /** Which format the model is; selects the texture walker and scene loader. */
  modelKind: ModelKind;
  model: ArrayBuffer;
  /** Texture paths parsed from the model's texture table. */
  texturePaths: string[];
  /** Resolved textures, ready to pass to babylon-mmd as referenceFiles. */
  referenceFiles: ReferenceFile[];
  /** Texture paths that had no matching file on disk. */
  missingTextures: string[];
}

export type CharacterCallback = (character: LoadedCharacter) => void;

const MODEL_EXTENSIONS = [".pmx", ".pmd"] as const;

/** Wire up drop + picker UI and hand completed characters to `onCharacterLoaded`. */
export function initFileLoading(onCharacterLoaded: CharacterCallback): void {
  const status = document.getElementById("status");
  const btnFiles = document.getElementById("btn-files");
  const btnFolder = document.getElementById("btn-folder");

  const setStatus = (text: string): void => {
    if (status) status.textContent = text;
  };

  const handle = async (collected: CollectedFile[]): Promise<void> => {
    if (collected.length === 0) return;
    try {
      setStatus(`Reading ${collected.length} file(s)…`);
      const character = await buildCharacter(collected);
      const missing = character.missingTextures.length
        ? `, ${character.missingTextures.length} MISSING`
        : "";
      setStatus(
        `Loaded ${character.modelPath} — ${character.texturePaths.length} texture(s), ` +
          `${character.referenceFiles.length} resolved${missing}.`,
      );
      onCharacterLoaded(character);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!event.dataTransfer) return;
    void collectFilesFromDataTransfer(event.dataTransfer).then(handle);
  });

  btnFiles?.addEventListener("click", () => {
    void pickFilesViaPicker().then(handle).catch((e) => setStatus(String(e)));
  });
  btnFolder?.addEventListener("click", () => {
    void pickDirectoryViaPicker().then(handle).catch((e) => setStatus(String(e)));
  });
}

/** Read collected files and resolve the PMX's textures into referenceFiles. */
export async function buildCharacter(collected: CollectedFile[]): Promise<LoadedCharacter> {
  const files: LocalFile[] = [];
  for (const collectedFile of collected) {
    files.push(await toLocalFile(collectedFile));
  }

  const modelFile = files.find((f) =>
    MODEL_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)),
  );
  if (!modelFile) {
    throw new Error("No .pmx or .pmd model found in the dropped files.");
  }

  const modelKind: ModelKind = modelFile.path.toLowerCase().endsWith(".pmd") ? "pmd" : "pmx";
  const texturePaths =
    modelKind === "pmd"
      ? parsePmdTexturePaths(modelFile.data)
      : parsePmxTexturePaths(modelFile.data);
  const { referenceFiles, missing } = resolveReferenceFiles(files, modelFile.path, texturePaths);

  return {
    files,
    modelPath: modelFile.path,
    modelKind,
    model: modelFile.data,
    texturePaths,
    referenceFiles,
    missingTextures: missing,
  };
}
