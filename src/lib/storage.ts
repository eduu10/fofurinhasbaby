import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

/**
 * Upload a buffer to storage.
 * Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is set, otherwise returns null.
 */
export async function uploadToStorage(
  buffer: Buffer,
  contentType: string,
  ext: string
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    // Use Vercel Blob
    const filename = `products/${randomUUID()}.${ext}`;
    const blob = await put(filename, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      token,
    });
    return blob.url;
  }

  // No blob token available
  return null;
}

/**
 * Upload a File to storage.
 * Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is set, otherwise returns null.
 */
export async function uploadFileToStorage(
  file: File,
  ext: string
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    const filename = `products/${randomUUID()}.${ext}`;
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      token,
    });
    return blob.url;
  }

  return null;
}
