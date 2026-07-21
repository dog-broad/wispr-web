// Client for managing an owned PIN share from the sent state (rotate / delete).
// The /r resolve client (POST /snippets/by-pin) lands with the receive page.

import { env } from "@/lib/env";

/** Issue a fresh PIN for an owned share. Returns the new PIN. */
export async function rotatePin(id: string): Promise<string> {
  const response = await fetch(`${env.apiBaseUrl}/me/snippets/${id}/rotate-pin`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error(`rotate failed: ${response.status}`);
  return String(((await response.json()) as { pin: string }).pin);
}

/** Hard-delete an owned share (delete now). A 404 means it's already gone. */
export async function deleteSnippet(id: string): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/me/snippets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`delete failed: ${response.status}`);
  }
}
