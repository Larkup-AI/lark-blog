"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { apiKey } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import {
  createApiKey as createApiKeyRecord,
  type ApiKeyType,
  type CreatedApiKey,
} from "@/lib/api-keys";

export type ApiKeyListItem = {
  id: string;
  name: string;
  type: ApiKeyType;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
};

async function requireContext() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");
  const workspace = await getActiveWorkspace();
  if (!workspace) throw new Error("No active workspace");
  return { userId, workspaceId: workspace.id };
}

export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const { workspaceId } = await requireContext();
  const rows = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.workspaceId, workspaceId))
    .orderBy(desc(apiKey.createdAt));

  return rows
    .filter((r) => !r.revokedAt)
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type === "publishable" ? "publishable" : "secret",
      prefix: r.prefix,
      lastFour: r.lastFour,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    }));
}

/** Create a key. The plaintext is returned once and never stored. */
export async function createApiKey(
  type: ApiKeyType,
  name?: string,
): Promise<CreatedApiKey> {
  const { userId, workspaceId } = await requireContext();
  if (type !== "publishable" && type !== "secret") {
    throw new Error("Invalid key type");
  }
  const created = await createApiKeyRecord({
    workspaceId,
    userId,
    type,
    name,
    createdByUserId: userId,
  });
  revalidatePath("/settings");
  return created;
}

/** Revoke (soft-delete) a key in the active workspace. */
export async function revokeApiKey(id: string): Promise<{ success: true }> {
  const { workspaceId } = await requireContext();
  await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, id), eq(apiKey.workspaceId, workspaceId)));
  revalidatePath("/settings");
  return { success: true };
}
