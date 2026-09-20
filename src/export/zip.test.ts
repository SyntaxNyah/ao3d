import { describe, expect, it } from "vitest";

import { unzip } from "./testUtils";
import { crc32, createZip } from "./zip";

const encoder = new TextEncoder();

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("round-trips entries (content, names, CRC)", async () => {
    const entries = [
      { name: "char.ini", data: encoder.encode("[options]\nmodel = model.pmx\n") },
      { name: "model.pmx", data: new Uint8Array([0, 1, 2, 3, 255, 254, 253]) },
      { name: "テクスチャ/face.png", data: new Uint8Array([9, 9, 9, 9]) },
      { name: "big.bin", data: new Uint8Array(4096).map((_, i) => (i * 7 + 13) & 0xff) },
    ];
    const blob = await createZip(entries);
    const files = await unzip(new Uint8Array(await blob.arrayBuffer()));

    expect(files.map((f) => f.name)).toEqual(entries.map((e) => e.name));
    for (let i = 0; i < entries.length; i++) {
      expect(files[i].data).toEqual(entries[i].data);
    }
  });

  it("produces a valid empty archive", async () => {
    const blob = await createZip([]);
    const files = await unzip(new Uint8Array(await blob.arrayBuffer()));
    expect(files).toEqual([]);
  });
});

