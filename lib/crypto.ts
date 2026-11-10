/**
 * AES-256-GCM encryption for secrets stored at rest (AI keys, storage creds,
 * SMTP passwords, SSO secrets). Never store provider keys in plaintext.
 *
 * Set ENCRYPTION_KEY to a 32-byte value, base64 or hex encoded. Generate one with:
 *   openssl rand -base64 32
 *
 * In dev, if ENCRYPTION_KEY is unset we fall back to BETTER_AUTH_SECRET so the
 * app still runs; production should always set a dedicated ENCRYPTION_KEY.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw =
    process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "";
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY (or BETTER_AUTH_SECRET) must be set to encrypt secrets."
    );
  }
  // Accept base64, hex, or any string — normalise to 32 bytes via SHA-256.
  let buf: Buffer | null = null;
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) buf = b64;
  } catch {}
  if (!buf) {
    try {
      const hex = Buffer.from(raw, "hex");
      if (hex.length === 32) buf = hex;
    } catch {}
  }
  return buf ?? createHash("sha256").update(raw).digest();
}

/** Encrypt a string. Returns `enc:v1:<iv>:<tag>:<ciphertext>` (base64 parts). */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(
      ":"
    )
  );
}

/** Decrypt a value produced by encryptSecret. Plaintext passes through (migration-safe). */
export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext — return as-is
  try {
    const [, , ivB64, tagB64, dataB64] = value.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
}

/** True if a value is already encrypted. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Mask a secret for display, e.g. "sk-ab…xy9z". */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 3)}…${v.slice(-4)}`;
}
