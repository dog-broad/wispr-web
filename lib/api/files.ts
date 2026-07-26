// Client for the file-upload presign endpoint. Returns one presigned PUT URL
// per 1 MiB chunk; the browser uploads ciphertext straight to R2 from there.

import { env } from "@/lib/env";

export interface PresignedChunk {
  index: number;
  url: string;
}

export interface Presigned {
  storageObjectKey: string;
  chunkCount: number;
  chunks: PresignedChunk[];
}

export async function presignChunks(chunkCount: number): Promise<Presigned> {
  const response = await fetch(`${env.apiBaseUrl}/snippets/files/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ chunk_count: chunkCount }),
  });
  if (!response.ok) {
    throw new Error(`presign failed: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as {
    storage_object_key: string;
    chunk_count: number;
    chunks: { index: number; url: string }[];
  };
  return {
    storageObjectKey: body.storage_object_key,
    chunkCount: body.chunk_count,
    chunks: body.chunks,
  };
}
