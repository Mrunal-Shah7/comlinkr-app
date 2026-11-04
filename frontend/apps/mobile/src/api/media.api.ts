/**
 * Media / File Upload API
 *
 * Endpoints:
 *   POST   /media/upload        — upload a single file, returns URL
 *   POST   /media/upload/bulk   — upload multiple files, returns URL array
 *   DELETE /media/:key          — delete a stored file by key
 */

import * as SecureStore from "expo-secure-store";

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api") +
  "/" +
  (process.env.EXPO_PUBLIC_API_VERSION ?? "v1");

const JWT_KEY = process.env.EXPO_PUBLIC_JWT_STORAGE_KEY ?? "comlinkr_jwt";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadContext = "avatar" | "post" | "listing" | "restaurant" | "event" | "badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(JWT_KEY);
  return token ? `Bearer ${token}` : null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Upload a single image from a local URI (from expo-image-picker / expo-camera).
 *
 * @param localUri  file:// URI returned by the picker
 * @param context   upload category, used by the server for storage routing
 * @param filename  optional filename override
 */
export async function uploadImage(
  localUri: string,
  context: UploadContext = "post",
  filename?: string
): Promise<UploadResult> {
  const authHeader = await getAuthHeader();

  const formData = new FormData();
  const name = filename ?? localUri.split("/").pop() ?? "upload.jpg";
  const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

  // React Native FormData accepts { uri, name, type } objects
  formData.append("file", { uri: localUri, name, type: mimeType } as unknown as Blob);
  formData.append("context", context);

  const res = await fetch(`${BASE_URL}/media/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      // Do NOT set Content-Type — fetch sets multipart/form-data with boundary automatically
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<UploadResult>;
}

/**
 * Upload multiple images in one request.
 */
export async function uploadImages(
  localUris: string[],
  context: UploadContext = "post"
): Promise<UploadResult[]> {
  const authHeader = await getAuthHeader();
  const formData = new FormData();

  localUris.forEach((uri, i) => {
    const name = uri.split("/").pop() ?? `upload_${i}.jpg`;
    const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    formData.append("files", { uri, name, type: mimeType } as unknown as Blob);
  });
  formData.append("context", context);

  const res = await fetch(`${BASE_URL}/media/upload/bulk`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bulk upload failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<UploadResult[]>;
}

/**
 * Delete a previously uploaded file by its storage key.
 */
export async function deleteMedia(key: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${BASE_URL}/media/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Delete failed (${res.status}): ${err}`);
  }
}
