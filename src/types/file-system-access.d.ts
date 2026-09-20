// File System Access API methods that TS's lib.dom does not declare yet.
// Everything else we use (webkitGetAsEntry, FileSystemDirectoryEntry,
// FileSystemDirectoryHandle.entries(), etc.) is already in lib.dom.

interface Window {
  showOpenFilePicker(options?: {
    multiple?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    excludeAcceptAllOption?: boolean;
  }): Promise<FileSystemFileHandle[]>;

  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
  }): Promise<FileSystemDirectoryHandle>;
}
