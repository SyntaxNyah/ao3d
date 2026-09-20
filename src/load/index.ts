import {
  collectFilesFromDataTransfer,
  pickDirectoryViaPicker,
  pickFilesViaPicker,
  toLocalFile,
  type CollectedFile,
} from "./fileSystem";
import { parsePmxTexturePaths } from "./pmx";
import { resolveReferenceFiles, type LocalFile, type ReferenceFile } from "./referenceFiles";

export interface LoadedCharacter {
  files: LocalFile[];
  /** Path of the .pmx relative to the drop/pick root. */
  pmxPath: string;
  pmx: ArrayBuffer;
  /** Texture paths parsed from the PMX texture table. */
  texturePaths: string[];
  /** Resolved textures, ready to pass to babylon-mmd as referenceFiles. */
  referenceFiles: ReferenceFile[];
  /** PMX texture paths that had no matching file on disk. */
  missingTextures: string[];
}

export type CharacterCallback = (character: LoadedCharacter) => void;

const PMX_EXT = ".pmx";

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
        `Loaded ${character.pmxPath} — ${character.texturePaths.length} texture(s), ` +
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

  const pmxFile = files.find((f) => f.path.toLowerCase().endsWith(PMX_EXT));
  if (!pmxFile) {
    throw new Error("No .pmx model found in the dropped files.");
  }

  const texturePaths = parsePmxTexturePaths(pmxFile.data);
  const { referenceFiles, missing } = resolveReferenceFiles(files, pmxFile.path, texturePaths);

  return {
    files,
    pmxPath: pmxFile.path,
    pmx: pmxFile.data,
    texturePaths,
    referenceFiles,
    missingTextures: missing,
  };
}
