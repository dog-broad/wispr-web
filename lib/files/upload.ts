// Encrypt a file in 1 MiB chunks and PUT each ciphertext chunk straight to R2
// via presigned URLs. The bytes never transit the API — only the presign +
// finalize calls do. Returns the storage key + chunk count for finalize.

import { presignChunks } from "@/lib/api/files";
import { sealChunk, sliceChunks } from "@/lib/files/chunk";

export interface UploadedFile {
  storageObjectKey: string;
  chunkCount: number;
}

export async function uploadEncryptedFile(
  key: Uint8Array,
  bytes: Uint8Array,
  onProgress?: (fraction: number) => void,
): Promise<UploadedFile> {
  const chunks = sliceChunks(bytes);
  const presigned = await presignChunks(chunks.length);
  for (let i = 0; i < chunks.length; i++) {
    const envelope = await sealChunk(key, i, chunks[i]!);
    // Wrap in a Blob so fetch sends the exact bytes with no extra framing;
    // the presigned URL signs only bucket+key, so R2 accepts any content-type.
    const put = await fetch(presigned.chunks[i]!.url, {
      method: "PUT",
      body: new Blob([envelope]),
    });
    if (!put.ok) {
      throw new Error(`chunk ${i} upload failed: ${put.status} ${put.statusText}`);
    }
    onProgress?.((i + 1) / chunks.length);
  }
  return { storageObjectKey: presigned.storageObjectKey, chunkCount: presigned.chunkCount };
}
