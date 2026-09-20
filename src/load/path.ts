// Pure, cross-platform path helpers. All paths are represented with forward
// slashes so they can be compared consistently regardless of the source
// (Windows drag-drop, directory picker, PMX texture tables).

/** Normalize backslashes to forward slashes, collapse duplicate separators,
 *  strip a leading "./" and a trailing "/". Does not resolve "..". */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}

/** Parent directory of a path ("" when there is no parent). */
export function dirname(path: string): string {
  const p = normalizePath(path);
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

/** Final path component. */
export function basename(path: string): string {
  const p = normalizePath(path);
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

/** Join path parts with "/", skipping empty parts. */
export function joinPath(...parts: string[]): string {
  const joined = parts.filter((p) => p.length > 0).map(normalizePath).join("/");
  return normalizePath(joined);
}
