import { crc32 } from "./zip";

const decoder = new TextDecoder();

function readUint16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0
  );
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEocd(data: Uint8Array): number {
  for (let i = data.length - 22; i >= 0; i--) {
    if (readUint32(data, i) === 0x06054b50) return i;
  }
  return -1;
}

/** Minimal ZIP reader: verifies structure and returns `{ name, data }` per entry. */
export async function unzip(data: Uint8Array): Promise<Array<{ name: string; data: Uint8Array }>> {
  const eocd = findEocd(data);
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const count = readUint16(data, eocd + 10);
  const result: Array<{ name: string; data: Uint8Array }> = [];
  let offset = readUint32(data, eocd + 16);

  for (let i = 0; i < count; i++) {
    if (readUint32(data, offset) !== 0x02014b50) throw new Error("bad central directory header");
    const method = readUint16(data, offset + 10);
    const crc = readUint32(data, offset + 16);
    const compressedSize = readUint32(data, offset + 20);
    const uncompressedSize = readUint32(data, offset + 24);
    const nameLength = readUint16(data, offset + 28);
    const extraLength = readUint16(data, offset + 30);
    const commentLength = readUint16(data, offset + 32);
    const localOffset = readUint32(data, offset + 42);
    const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength));

    const localNameLength = readUint16(data, localOffset + 26);
    const localExtraLength = readUint16(data, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = data.subarray(dataOffset, dataOffset + compressedSize);

    let fileData: Uint8Array;
    if (method === 0) fileData = compressed;
    else if (method === 8) fileData = await inflateRaw(compressed);
    else throw new Error(`unexpected compression method ${method}`);

    if (fileData.length !== uncompressedSize) throw new Error("size mismatch");
    if (crc32(fileData) !== crc) throw new Error("crc mismatch");

    result.push({ name, data: fileData });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}
