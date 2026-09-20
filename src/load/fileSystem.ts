import { mimeFromPath } from "./mime";
import { joinPath, normalizePath } from "./path";
import type { LocalFile } from "./referenceFiles";

/** A file collected from disk with its path relative to the drop/pick root. */
export interface CollectedFile {
  path: string;
  file: File;
}

export async function toLocalFile(collected: CollectedFile): Promise<LocalFile> {
  return {
    path: normalizePath(collected.path),
    data: await collected.file.arrayBuffer(),
    mimeType: collected.file.type || mimeFromPath(collected.path),
  };
}

/** Walk a drop's DataTransfer, preserving directory structure via webkitGetAsEntry. */
export async function collectFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<CollectedFile[]> {
  const out: CollectedFile[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      await walkEntry(entry, "", out);
    } else {
      const file = item.getAsFile();
      if (file) out.push({ path: file.name, file });
    }
  }
  return out;
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: CollectedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    out.push({ path: joinPath(prefix, entry.name), file });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const child of batch) {
        await walkEntry(child, joinPath(prefix, entry.name), out);
      }
    } while (batch.length > 0);
  }
}

/** Pick one or more files (flat — folder structure is not preserved). */
export async function pickFilesViaPicker(): Promise<CollectedFile[]> {
  if (!("showOpenFilePicker" in window)) {
    throw new Error("File System Access API is not supported in this browser.");
  }
  const handles = await window.showOpenFilePicker({ multiple: true });
  const out: CollectedFile[] = [];
  for (const handle of handles) {
    const file = await handle.getFile();
    out.push({ path: file.name, file });
  }
  return out;
}

/** Pick a folder and walk it recursively (preserves folder structure). */
export async function pickDirectoryViaPicker(): Promise<CollectedFile[]> {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("File System Access API is not supported in this browser.");
  }
  const root = await window.showDirectoryPicker({ mode: "read" });
  const out: CollectedFile[] = [];
  await walkDirectoryHandle(root, "", out);
  return out;
}

async function walkDirectoryHandle(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  out: CollectedFile[],
): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "file") {
      const file = await (handle as FileSystemFileHandle).getFile();
      out.push({ path: joinPath(prefix, name), file });
    } else {
      await walkDirectoryHandle(handle as FileSystemDirectoryHandle, joinPath(prefix, name), out);
    }
  }
}
