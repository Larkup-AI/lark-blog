import { createHash, randomBytes, randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKey, settings } from "@/lib/db/schema";

/**
 * API keys v2 — workspace-scoped, hashed, split into publishable vs secret.
 *
 *  - publishable (`pk_…`): read **published** posts only. Safe to ship in a
 *    browser / embed script.
 *  - secret (`sk_…`): can read drafts (`?preview=true`) and (future) write.
 *
 * Only the SHA-256 hash is stored; the plaintext is returned once at creation.
 * Keys are read from the `Authorization: Bearer` or `x-api-key` header — never
 * the query string (that leaks the key into logs, history and referrers).
 *
 * Legacy single keys stored in `settings.apiKey` keep working (treated as
 * secret) so existing integrations don't break; rotate them from Settings.
 */

export type ApiKeyType = "publishable" | "secret";

export type ResolvedApiKey = {
  /** Content owner whose posts this key serves. */
  userId: string;
  workspaceId: string | null;
  type: ApiKeyType;
  /** Secret keys may read drafts; publishable keys may not. */
  canReadDrafts: boolean;
  /** True for a pre-v2 key matched via settings.apiKey (for telemetry/UI). */
  legacy: boolean;
};

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a new plaintext key of the given kind. */
export function generateKey(type: ApiKeyType): string {
  const prefix = type === "publishable" ? "pk" : "sk";
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

function keyTypeOf(key: string): ApiKeyType | null {
  if (key.startsWith("pk_")) return "publishable";
  if (key.startsWith("sk_")) return "secret";
  return null;
}

/**
 * Read a raw key from the request headers. Query-string keys are intentionally
 * NOT accepted.
 */
export function readKeyFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && /^Bearer\s+/i.test(auth)) {
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  const header = req.headers.get("x-api-key");
  return header?.trim() || null;
}

/**
 * Resolve a request's API key to its owner + permissions, or null if missing /
 * invalid / revoked. Updates `lastUsedAt` (best-effort) on a hit.
 */
export async function resolveApiKey(req: Request): Promise<ResolvedApiKey | null> {
  const raw = readKeyFromRequest(req);
  if (!raw) return null;

  const type = keyTypeOf(raw);

  // v2 keys (pk_/sk_): look up by hash, reject revoked.
  if (type) {
    const hash = hashApiKey(raw);
    const [row] = await db
      .select()
      .from(apiKey)
      .where(and(eq(apiKey.keyHash, hash), isNull(apiKey.revokedAt)));
    if (!row) return null;

    db.update(apiKey)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKey.id, row.id))
      .catch(() => {});

    return {
      userId: row.userId,
      workspaceId: row.workspaceId,
      type: row.type === "publishable" ? "publishable" : "secret",
      canReadDrafts: row.type === "secret",
      legacy: false,
    };
  }

  // Legacy fallback: a pre-v2 single key stored plaintext in settings.apiKey.
  // Treated as a secret key (full read, incl. drafts) for backwards compat.
  const [legacy] = await db
    .select()
    .from(settings)
    .where(eq(settings.apiKey, raw));
  if (!legacy) return null;

  return {
    userId: legacy.userId,
    workspaceId: legacy.workspaceId ?? null,
    type: "secret",
    canReadDrafts: true,
    legacy: true,
  };
}

export type CreatedApiKey = {
  id: string;
  /** Plaintext — shown once, never stored. */
  key: string;
  type: ApiKeyType;
  prefix: string;
  lastFour: string;
};

/** Create a key for a workspace. Returns the plaintext once. */
export async function createApiKey(opts: {
  workspaceId: string;
  userId: string;
  type: ApiKeyType;
  name?: string;
  createdByUserId?: string;
}): Promise<CreatedApiKey> {
  const key = generateKey(opts.type);
  const prefix = key.slice(0, 11); // e.g. "pk_" + 8 hex chars
  const lastFour = key.slice(-4);
  const id = randomUUID();

  await db.insert(apiKey).values({
    id,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    name: opts.name?.trim() || (opts.type === "publishable" ? "Publishable key" : "Secret key"),
    type: opts.type,
    prefix,
    keyHash: hashApiKey(key),
    lastFour,
    createdByUserId: opts.createdByUserId ?? opts.userId,
  });

  return { id, key, type: opts.type, prefix, lastFour };
}
