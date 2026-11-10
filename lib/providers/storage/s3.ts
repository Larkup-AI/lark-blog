import { randomBytes } from "crypto";
import type { PresignedUpload, S3Config, StorageAdapter } from "./types";

/**
 * S3-compatible adapter. Covers AWS S3, Cloudflare R2, MinIO, Backblaze B2,
 * DigitalOcean Spaces, Supabase Storage (S3), Tigris and Neon Object Storage.
 *
 * Requires `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (imported
 * lazily so the rest of the app builds even if they aren't installed yet):
 *   pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */
export function createS3Adapter(config: S3Config): StorageAdapter {
  const serveBase =
    config.publicBaseUrl?.replace(/\/$/, "") ||
    (config.endpoint
      ? `${config.endpoint.replace(/\/$/, "")}/${config.bucket}`
      : `https://${config.bucket}.s3.${config.region ?? "us-east-1"}.amazonaws.com`);

  async function client() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: config.region ?? "auto",
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  function safeName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  }

  return {
    id: "s3",
    publicUrl(key: string) {
      return `${serveBase}/${key}`;
    },
    async createUpload({ filename, contentType, prefix }): Promise<PresignedUpload> {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const key = [prefix?.replace(/^\/|\/$/g, ""), `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName(filename)}`]
        .filter(Boolean)
        .join("/");
      const c = await client();
      const uploadUrl = await getSignedUrl(
        c as any,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: contentType,
        }) as any,
        { expiresIn: 600 }
      );
      return {
        strategy: "presigned-put",
        uploadUrl,
        publicUrl: `${serveBase}/${key}`,
        headers: { "Content-Type": contentType },
        key,
      };
    },
    async delete(keyOrUrl: string) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const key = keyOrUrl.startsWith(serveBase)
        ? keyOrUrl.slice(serveBase.length + 1)
        : keyOrUrl;
      const c = await client();
      await c.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }) as any
      );
    },
  };
}
