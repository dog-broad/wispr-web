import { describe, expect, test } from "vitest";
import { CHUNK_SIZE, chunkAad, chunkCountFor, sliceChunks } from "./chunk";

describe("chunkCountFor", () => {
  test("empty and sub-chunk files are one chunk", () => {
    expect(chunkCountFor(0)).toBe(1);
    expect(chunkCountFor(1)).toBe(1);
    expect(chunkCountFor(CHUNK_SIZE)).toBe(1);
  });

  test("splits on 1 MiB boundaries", () => {
    expect(chunkCountFor(CHUNK_SIZE + 1)).toBe(2);
    expect(chunkCountFor(CHUNK_SIZE * 3)).toBe(3);
    expect(chunkCountFor(CHUNK_SIZE * 3 + 1)).toBe(4);
  });
});

describe("chunkAad", () => {
  test("encodes the index as 4-byte big-endian", () => {
    expect([...chunkAad(0)]).toEqual([0, 0, 0, 0]);
    expect([...chunkAad(1)]).toEqual([0, 0, 0, 1]);
    expect([...chunkAad(258)]).toEqual([0, 0, 1, 2]);
  });

  test("distinct indices give distinct AAD", () => {
    expect(chunkAad(1)).not.toEqual(chunkAad(2));
  });
});

describe("sliceChunks", () => {
  test("splits bytes into <=1 MiB pieces on the right boundaries", () => {
    const bytes = new Uint8Array(CHUNK_SIZE * 2 + 10);
    // Markers at each chunk boundary; a cheap check that content maps to the
    // right chunk without a multi-MB deep-equal.
    bytes[0] = 1;
    bytes[CHUNK_SIZE] = 2;
    bytes[CHUNK_SIZE * 2] = 3;
    bytes[CHUNK_SIZE * 2 + 9] = 4;
    const chunks = sliceChunks(bytes);
    expect(chunks.map((c) => c.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 10]);
    expect(chunks[0]![0]).toBe(1);
    expect(chunks[1]![0]).toBe(2);
    expect(chunks[2]![0]).toBe(3);
    expect(chunks[2]![9]).toBe(4);
  });

  test("empty input yields one empty chunk", () => {
    const chunks = sliceChunks(new Uint8Array(0));
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.length).toBe(0);
  });
});
