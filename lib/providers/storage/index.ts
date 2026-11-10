import type { StorageAdapter, StorageProviderId } from "./types";
import { createS3Adapter } from "./s3";

export * from "./types";

/**
 * Resolve the active storage adapter from environment variables.
 *
 * STORAGE_PROVIDER = s3 | vercel-blob | uploadthing | local  (default: uploadthing)
 *
 * S3 (also R2 / MinIO / B2 / Spaces / Supabase / Tigris / Neon Object Storage):
 *   S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *   S3_PUBLIC_BASE_URL (optional CDN), S3_FORCE_PATH_STYLE=true (MinIO etc.)
 *
 * A future version reads this per-workspace from the `settings` table instead of
 * only env, so Cloud customers pick storage in the UI.
 */
export function getStorageProvider(): StorageProviderId {
  const p = (process.env.STORAGE_PROVIDER || "uploadthing").trim().toLowerCase();
  if (["s3", "vercel-blob", "uploadthing", "local"].includes(p))
    return p as StorageProviderId;
  return "uploadthing";
}

/** Returns the configured S3-style adapter, or null if not using presigned storage. */
export function getStorageAdapter(): StorageAdapter | null {
  const provider = getStorageProvider();
  if (provider === "s3") {
    return createS3Adapter({
      bucket: process.env.S3_BUCKET || "",
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }
  // vercel-blob / uploadthing / local are handled by their own routes/hooks.
  return null;
}
