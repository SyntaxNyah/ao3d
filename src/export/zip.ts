// Dependency-free ZIP writer.
//
// Produces a standards-compliant ZIP archive (local file headers + central
// directory + end-of-central-directory) with DEFLATE compression via the
// browser's built-in `CompressionStream("deflate-raw")` and UTF-8 filenames.
// No zip library is used. Files are assumed < 4 GiB (fine for MMD characters),
// so ZIP64 is not emitted.

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

/** CRC-32 (IEEE 802.3, reflected, poly 0xEDB88320) as used by the ZIP format. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path within the archive, forward slashes (e.g. "textures/face.png"). */
  name: string;
  data: Uint8Array;
}

const UTF8_FLAG = 0x0800;
const DEFLATE = 8;
const DOS_DATE = 0x21; // 1980-01-01

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

interface ProcessedEntry {
  nameBytes: Uint8Array;
  crc: number;
  compressed: Uint8Array;
}

function localHeader(entry: ProcessedEntry, uncompressedSize: number): Uint8Array {
  const header = new Uint8Array(30 + entry.nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true); // version needed
  view.setUint16(6, UTF8_FLAG, true);
  view.setUint16(8, DEFLATE, true);
  view.setUint16(10, 0, true); // mod time
  view.setUint16(12, DOS_DATE, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.compressed.length, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, entry.nameBytes.length, true);
  view.setUint16(28, 0, true); // extra field length
  header.set(entry.nameBytes, 30);
  return header;
}

function centralHeader(entry: ProcessedEntry, uncompressedSize: number, localOffset: number): Uint8Array {
  const header = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true); // version made by
  view.setUint16(6, 20, true); // version needed
  view.setUint16(8, UTF8_FLAG, true);
  view.setUint16(10, DEFLATE, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, DOS_DATE, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.compressed.length, true);
  view.setUint32(24, uncompressedSize, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true); // extra field length
  view.setUint16(32, 0, true); // comment length
  view.setUint16(34, 0, true); // disk number start
  view.setUint16(36, 0, true); // internal attributes
  view.setUint32(38, 0, true); // external attributes
  view.setUint32(42, localOffset, true);
  header.set(entry.nameBytes, 46);
  return header;
}

function endOfCentralDirectory(count: number, centralSize: number, centralOffset: number): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true); // disk number
  view.setUint16(6, 0, true); // central directory start disk
  view.setUint16(8, count, true); // entries on this disk
  view.setUint16(10, count, true); // total entries
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true); // comment length
  return record;
}

/** Build a ZIP archive (DEFLATE-compressed, UTF-8 filenames) as a Blob. */
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const processed = await Promise.all(
    entries.map(async (entry) => ({
      nameBytes: encoder.encode(entry.name),
      data: entry.data,
      crc: crc32(entry.data),
      compressed: await deflateRaw(entry.data),
    })),
  );

  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of processed) {
    const local = localHeader(entry, entry.data.length);
    parts.push(local, entry.compressed);
    centralParts.push(centralHeader(entry, entry.data.length, offset));
    offset += local.length + entry.compressed.length;
  }

  const central = concat(centralParts);
  parts.push(central, endOfCentralDirectory(processed.length, central.length, offset));

  // TS 6 types `Uint8Array` as `Uint8Array<ArrayBufferLike>`, but `BlobPart`
  // requires ArrayBuffer-backed views; the cast is safe (all our buffers are real).
  return new Blob(parts as unknown as BlobPart[], { type: "application/zip" });
}
