const EXT_MIME: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  bmp: "image/bmp",
  tga: "image/tga",
  dds: "image/vnd-ms.dds",
  webp: "image/webp",
  gif: "image/gif",
};

/** Infer a MIME type from a file extension, or undefined when unknown. */
export function mimeFromPath(path: string): string | undefined {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return undefined;
  return EXT_MIME[path.slice(dot + 1).toLowerCase()];
}
