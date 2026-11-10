/**
 * Runtime application config (the "flexible providers" layer).
 *
 * The first-run setup wizard (`/setup`) writes the active storage / email / AI
 * provider into the singleton `app_config` row. These values OVERRIDE the
 * matching environment variables, so an operator can switch providers from the
 * dashboard without redeploying. When a field is unset, the env var is used.
 *
 * Secrets inside the JSON blobs (S3 secret key, SMTP/Resend password, AI key)
 * are encrypted at rest with AES-256-GCM via `lib/crypto`. They are only ever
 * decrypted server-side when building a provider client — never sent to the UI.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appConfig, type AppConfig } from "@/lib/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export type StorageProviderId = "s3" | "vercel-blob" | "uploadthing" | "local";
export type EmailProviderId = "resend" | "smtp" | "none";

/** Field names (per provider) whose values are stored encrypted. */
const SECRET_FIELDS: Record<string, string[]> = {
  s3: ["secretAccessKey", "accessKeyId"],
  resend: ["apiKey"],
  smtp: ["pass"],
  ai: ["apiKey"],
};

const APP_CONFIG_ID = 1;

/* ----------------------------- caching ----------------------------- */
let cache: { row: AppConfig | null; at: number } | null = null;
const TTL_MS = 10_000;

export function invalidateAppConfigCache() {
  cache = null;
}

/** Raw singleton row (secrets still encrypted). Cached briefly. */
export async function getAppConfigRow(): Promise<AppConfig | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.row;
  let row: AppConfig | null = null;
  try {
    const [found] = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.id, APP_CONFIG_ID))
      .limit(1);
    row = found ?? null;
  } catch {
    // Table may not exist yet (pre-migration) — behave as "no config".
    row = null;
  }
  cache = { row, at: Date.now() };
  return row;
}

/** Has the setup wizard been completed? */
export async function isSetupComplete(): Promise<boolean> {
  const row = await getAppConfigRow();
  return Boolean(row?.setupCompletedAt);
}

/* -------------------------- secret helpers -------------------------- */
function encryptFields(
  kind: keyof typeof SECRET_FIELDS,
  cfg: Record<string, any>,
): Record<string, any> {
  const out = { ...cfg };
  for (const k of SECRET_FIELDS[kind] ?? []) {
    if (typeof out[k] === "string" && out[k]) out[k] = encryptSecret(out[k]);
  }
  return out;
}

function decryptFields(
  kind: keyof typeof SECRET_FIELDS,
  cfg: Record<string, any> | null | undefined,
): Record<string, any> {
  const out = { ...(cfg ?? {}) };
  for (const k of SECRET_FIELDS[kind] ?? []) {
    if (typeof out[k] === "string" && out[k]) out[k] = decryptSecret(out[k]);
  }
  return out;
}

/* --------------------------- write (wizard) --------------------------- */
type SaveInput = {
  storageProvider?: StorageProviderId | null;
  storageConfig?: Record<string, any> | null;
  emailProvider?: EmailProviderId | null;
  emailConfig?: Record<string, any> | null;
  aiProvider?: string | null;
  aiConfig?: Record<string, any> | null;
  setupCompletedAt?: Date | null;
};

/** Upsert the singleton row, encrypting known secret fields. */
export async function saveAppConfig(input: SaveInput): Promise<void> {
  const patch: Record<string, any> = { updatedAt: new Date() };

  if (input.storageProvider !== undefined)
    patch.storageProvider = input.storageProvider;
  if (input.storageConfig !== undefined)
    patch.storageConfig = input.storageConfig
      ? encryptFields("s3", input.storageConfig)
      : null;

  if (input.emailProvider !== undefined)
    patch.emailProvider = input.emailProvider;
  if (input.emailConfig !== undefined)
    patch.emailConfig = input.emailConfig
      ? encryptFields(
          (input.emailProvider as keyof typeof SECRET_FIELDS) || "resend",
          input.emailConfig,
        )
      : null;

  if (input.aiProvider !== undefined) patch.aiProvider = input.aiProvider;
  if (input.aiConfig !== undefined)
    patch.aiConfig = input.aiConfig ? encryptFields("ai", input.aiConfig) : null;

  if (input.setupCompletedAt !== undefined)
    patch.setupCompletedAt = input.setupCompletedAt;

  await db
    .insert(appConfig)
    .values({ id: APP_CONFIG_ID, ...patch })
    .onConflictDoUpdate({ target: appConfig.id, set: patch });

  invalidateAppConfigCache();
}

/* ------------------------- resolved (merged) ------------------------- */
export type ResolvedStorage = {
  provider: StorageProviderId;
  /** Decrypted config merged over env defaults. */
  config: Record<string, any>;
  /** True when it came from the DB wizard rather than env. */
  fromDb: boolean;
};

/** Storage provider + config, DB wizard first then environment variables. */
export async function resolveStorage(): Promise<ResolvedStorage> {
  const row = await getAppConfigRow();
  if (row?.storageProvider) {
    return {
      provider: row.storageProvider as StorageProviderId,
      config: decryptFields("s3", row.storageConfig as any),
      fromDb: true,
    };
  }
  const envProvider = (
    process.env.STORAGE_PROVIDER || "uploadthing"
  ).toLowerCase() as StorageProviderId;
  return {
    provider: (
      ["s3", "vercel-blob", "uploadthing", "local"].includes(envProvider)
        ? envProvider
        : "uploadthing"
    ) as StorageProviderId,
    config: {
      bucket: process.env.S3_BUCKET || "",
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    },
    fromDb: false,
  };
}

export type ResolvedEmail = {
  provider: EmailProviderId;
  config: Record<string, any>;
  fromDb: boolean;
};

/** Email provider + config, DB wizard first then environment variables. */
export async function resolveEmail(): Promise<ResolvedEmail> {
  const row = await getAppConfigRow();
  if (row?.emailProvider) {
    return {
      provider: row.emailProvider as EmailProviderId,
      config: decryptFields(
        (row.emailProvider as keyof typeof SECRET_FIELDS) || "resend",
        row.emailConfig as any,
      ),
      fromDb: true,
    };
  }
  const explicit = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  let provider: EmailProviderId;
  if (explicit === "resend" || explicit === "smtp" || explicit === "none")
    provider = explicit;
  else if (process.env.RESEND_API_KEY) provider = "resend";
  else if (process.env.SMTP_HOST) provider = "smtp";
  else provider = "none";

  return {
    provider,
    config: {
      apiKey: process.env.RESEND_API_KEY || "",
      from: process.env.EMAIL_FROM || "",
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      secure: process.env.SMTP_SECURE === "true",
    },
    fromDb: false,
  };
}
