"use server";

import { randomUUID } from "crypto";
import { eq, or, count } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import {
  user as userTable,
  workspace,
  workspaceMember,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { getSession, isFullAdmin } from "@/lib/admin";
import {
  saveAppConfig,
  isSetupComplete,
  invalidateAppConfigCache,
  type StorageProviderId,
  type EmailProviderId,
} from "@/lib/app-config";
import type { SetupState } from "@/lib/setup-types";

/**
 * The setup wizard is open (no auth) only on a fresh install — before any admin
 * exists AND before setup is marked complete. Once there is an admin, the
 * wizard becomes an admin-only "re-run" surface so it can't be hijacked.
 */
async function assertSetupAllowed() {
  const complete = await isSetupComplete();
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(userTable);
  const fresh = !complete && Number(userCount) === 0;
  if (fresh) return; // open during first-run

  const session = await getSession();
  if (!session?.user || !isFullAdmin(session.user)) {
    throw new Error("Setup is already complete. Admin access required.");
  }
}

/** High-level state used by the wizard page to decide what to show. */
export async function getSetupState(): Promise<SetupState> {
  let dbOk = false;
  let userCount = 0;
  let hasAdmin = false;
  let setupComplete = false;

  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    const [{ value }] = await db.select({ value: count() }).from(userTable);
    userCount = Number(value);
    const [admin] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(or(eq(userTable.role, "full_admin"), eq(userTable.role, "admin")))
      .limit(1);
    hasAdmin = Boolean(admin);
    setupComplete = await isSetupComplete();
  } catch {
    // Tables may not exist yet — migrations needed.
  }

  return {
    needsSetup: !setupComplete || !hasAdmin,
    hasAdmin,
    setupComplete,
    dbOk,
    userCount,
  };
}

/** Test the database connection string that the app booted with. */
export async function testDatabaseConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Connection failed" };
  }
}

/** Apply any pending Drizzle migrations against the configured database. */
export async function runMigrations(): Promise<{
  ok: boolean;
  error?: string;
}> {
  await assertSetupAllowed();
  try {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Migration failed" };
  }
}

/**
 * Create the first admin account and its default workspace. Only allowed while
 * no admin exists yet.
 */
export async function createFirstAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const complete = await isSetupComplete();
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(userTable);
  if (complete || Number(userCount) > 0) {
    return { ok: false, error: "An account already exists." };
  }

  const name = (input.name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const password = input.password || "";
  if (!name || !email || password.length < 8) {
    return {
      ok: false,
      error: "Name, email and a password of 8+ characters are required.",
    };
  }

  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
    });
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not create account." };
  }

  // Promote to full admin.
  const [created] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (!created) return { ok: false, error: "Account creation failed." };

  await db
    .update(userTable)
    .set({ role: "full_admin" })
    .where(eq(userTable.id, created.id));

  // Create the default workspace with this user as owner (if none yet).
  const [existingWs] = await db.select().from(workspace).limit(1);
  if (!existingWs) {
    const wsId = `ws_${randomUUID().replace(/-/g, "")}`;
    await db.insert(workspace).values({
      id: wsId,
      name: "Default workspace",
      slug: "default",
      createdBy: created.id,
    });
    await db.insert(workspaceMember).values({
      id: `wm_${randomUUID().replace(/-/g, "")}`,
      workspaceId: wsId,
      userId: created.id,
      role: "owner",
    });
  }

  return { ok: true };
}

/* ------------------------------- provider steps ------------------------------ */

export async function saveStorageStep(input: {
  provider: StorageProviderId;
  config?: Record<string, any>;
}): Promise<{ ok: boolean; error?: string }> {
  await assertSetupAllowed();
  try {
    await saveAppConfig({
      storageProvider: input.provider,
      storageConfig: input.config ?? null,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not save storage config." };
  }
}

/** Validate S3-style credentials by signing a throwaway upload URL. */
export async function testStorageStep(input: {
  provider: StorageProviderId;
  config?: Record<string, any>;
}): Promise<{ ok: boolean; error?: string }> {
  await assertSetupAllowed();
  if (input.provider !== "s3") return { ok: true }; // nothing to test
  try {
    const { createS3Adapter } = await import("@/lib/providers/storage/s3");
    const c = input.config || {};
    const adapter = createS3Adapter({
      bucket: c.bucket || "",
      region: c.region,
      endpoint: c.endpoint,
      accessKeyId: c.accessKeyId || "",
      secretAccessKey: c.secretAccessKey || "",
      publicBaseUrl: c.publicBaseUrl,
      forcePathStyle: c.forcePathStyle === true || c.forcePathStyle === "true",
    });
    await adapter.createUpload({
      filename: "setup-test.txt",
      contentType: "text/plain",
      prefix: "setup-check",
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not sign a test upload." };
  }
}

export async function saveEmailStep(input: {
  provider: EmailProviderId;
  config?: Record<string, any>;
}): Promise<{ ok: boolean; error?: string }> {
  await assertSetupAllowed();
  try {
    await saveAppConfig({
      emailProvider: input.provider,
      emailConfig: input.provider === "none" ? null : input.config ?? null,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not save email config." };
  }
}

export async function saveAiStep(input: {
  provider: string;
  config?: Record<string, any>;
}): Promise<{ ok: boolean; error?: string }> {
  await assertSetupAllowed();
  try {
    await saveAppConfig({
      aiProvider: input.provider,
      aiConfig: input.config ?? null,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not save AI config." };
  }
}

/** Mark the wizard as finished. */
export async function completeSetup(): Promise<{ ok: boolean; error?: string }> {
  await assertSetupAllowed();
  try {
    await saveAppConfig({ setupCompletedAt: new Date() });
    invalidateAppConfigCache();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not finish setup." };
  }
}
