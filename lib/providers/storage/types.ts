/**
 * Object-storage abstraction.
 *
 * Adapters implement presigned, direct-to-bucket uploads so the browser uploads
 * straight to storage and the Next server only signs the request. One S3 adapter
 * covers AWS S3, Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces,
 * Supabase Storage (S3 API), Tigris, and **Neon Object Storage** (S3-compatible,
 * GA since 2026). Vercel Blob, UploadThing and local disk have their own adapters.
 */
export type StorageProviderId =
  | "s3"
  | "vercel-blob"
  | "uploadthing"
  | "local";

export type PresignedUpload =
  | {
      /** Direct PUT to this URL from the browser, then the file is at `publicUrl`. */
      strategy: "presigned-put";
      uploadUrl: string;
      publicUrl: string;
      headers?: Record<string, string>;
      key: string;
    }
  | {
      /** No presign — client should use the UploadThing hook/route. */
      strategy: "uploadthing";
    };

export interface StorageAdapter {
  readonly id: StorageProviderId;
  /** Create a presigned upload for a file the browser will PUT directly. */
  createUpload(input: {
    filename: string;
    contentType: string;
    /** Logical prefix, e.g. workspace id. */
    prefix?: string;
  }): Promise<PresignedUpload>;
  /** Delete a previously stored object by its key or URL. */
  delete(keyOrUrl: string): Promise<void>;
  /** Public URL for a stored key (for adapters where it's deterministic). */
  publicUrl(key: string): string;
}

export type S3Config = {
  bucket: string;
  region?: string;
  endpoint?: string; // R2/MinIO/Neon/Supabase/Tigris set this
  accessKeyId: string;
  secretAccessKey: string;
  /** Base URL files are served from (CDN or `${endpoint}/${bucket}`). */
  publicBaseUrl?: string;
  forcePathStyle?: boolean; // MinIO / most S3-compatible stores
};
