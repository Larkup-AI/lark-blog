"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  role as roleTable,
  scimToken,
  workspaceMember,
} from "@/lib/db/schema";
import { getSession } from "@/lib/admin";
import { getActiveWorkspaceId } from "@/lib/workspace";
import {
  can,
  PERMISSIONS,
  ROLE_PRESETS,
  type Permission,
} from "@/ee/rbac";
import { isEEEnabled, type EEFeature } from "@/ee/license";
import { recordAuditEvent } from "@/ee/audit";
import { listAuditEvents, listAuditActions } from "@/ee/audit";
import {
  listSsoConnections,
  createSsoConnection,
  updateSsoConnection,
  deleteSsoConnection,
  testOidcConnection,
  redactConnection,
  type OidcConfig,
} from "@/ee/sso";
import { createScimToken } from "@/ee/scim";

/** Common gate: authenticated, has permission, and the EE feature is licensed. */
async function gate(permission: Permission, feature: EEFeature) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" as const };
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: "No active workspace" as const };
  if (!isEEEnabled(feature))
    return { error: "This is an Enterprise feature. Add a license key to enable it." as const, upgrade: true };
  const allowed = await can(session.user.id, workspaceId, permission);
  if (!allowed) return { error: "You don't have permission to do that" as const };
  return { session, workspaceId };
}

/* --------------------------------- roles --------------------------------- */

export async function getRbacMeta() {
  return {
    permissions: PERMISSIONS as readonly string[],
    presets: ROLE_PRESETS,
    enabled: isEEEnabled("custom-roles"),
  };
}

export async function listRoles() {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId) return [];
  if (!isEEEnabled("custom-roles")) return [];
  return db
    .select()
    .from(roleTable)
    .where(eq(roleTable.workspaceId, workspaceId));
}

export async function createRole(input: {
  name: string;
  description?: string;
  permissions: string[];
}) {
  const ctx = await gate("roles:manage", "custom-roles");
  if ("error" in ctx) return ctx;
  const { session, workspaceId } = ctx;

  const name = input.name?.trim();
  if (!name) return { error: "Role name is required" };

  const valid = (input.permissions ?? []).filter((p) =>
    (PERMISSIONS as readonly string[]).includes(p),
  );
  const id = `role_${randomUUID().replace(/-/g, "")}`;
  await db.insert(roleTable).values({
    id,
    workspaceId,
    name,
    description: input.description?.trim() || null,
    permissions: valid as never,
  });

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.create",
    targetType: "role",
    targetId: id,
    metadata: { name, permissions: valid },
  });

  revalidatePath("/enterprise");
  return { ok: true, id };
}

export async function updateRole(
  id: string,
  input: { name: string; description?: string; permissions: string[] },
) {
  const ctx = await gate("roles:manage", "custom-roles");
  if ("error" in ctx) return ctx;
  const { session, workspaceId } = ctx;

  const valid = (input.permissions ?? []).filter((p) =>
    (PERMISSIONS as readonly string[]).includes(p),
  );
  await db
    .update(roleTable)
    .set({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      permissions: valid as never,
      updatedAt: new Date(),
    })
    .where(and(eq(roleTable.id, id), eq(roleTable.workspaceId, workspaceId)));

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.update",
    targetType: "role",
    targetId: id,
  });

  revalidatePath("/enterprise");
  return { ok: true };
}

export async function deleteRole(id: string) {
  const ctx = await gate("roles:manage", "custom-roles");
  if ("error" in ctx) return ctx;
  const { workspaceId } = ctx;

  // Detach from any members first (keep their fixed role).
  await db
    .update(workspaceMember)
    .set({ customRoleId: null })
    .where(
      and(
        eq(workspaceMember.customRoleId, id),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    );
  await db
    .delete(roleTable)
    .where(and(eq(roleTable.id, id), eq(roleTable.workspaceId, workspaceId)));

  revalidatePath("/enterprise");
  return { ok: true };
}

/** Attach (or clear, with null) a custom role on a member. */
export async function assignMemberRole(
  memberUserId: string,
  roleId: string | null,
) {
  const ctx = await gate("roles:manage", "custom-roles");
  if ("error" in ctx) return ctx;
  const { session, workspaceId } = ctx;

  if (roleId) {
    const [exists] = await db
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(and(eq(roleTable.id, roleId), eq(roleTable.workspaceId, workspaceId)))
      .limit(1);
    if (!exists) return { error: "Unknown role" };
  }

  await db
    .update(workspaceMember)
    .set({ customRoleId: roleId })
    .where(
      and(
        eq(workspaceMember.userId, memberUserId),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    );

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "member.role.assign",
    targetType: "user",
    targetId: memberUserId,
    metadata: { roleId },
  });

  revalidatePath("/enterprise");
  return { ok: true };
}

/* ---------------------------------- SSO ---------------------------------- */

export async function listSso() {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId) return [];
  if (!isEEEnabled("sso")) return [];
  const rows = await listSsoConnections(workspaceId);
  return rows.map(redactConnection);
}

export async function createOidcConnection(input: {
  label: string;
  domain: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
}) {
  const ctx = await gate("sso:manage", "sso");
  if ("error" in ctx) return ctx;
  const { session, workspaceId } = ctx;

  const cfg: OidcConfig = {
    clientId: input.clientId.trim(),
    clientSecret: input.clientSecret.trim(),
    discoveryUrl: input.discoveryUrl.trim(),
  };
  const test = await testOidcConnection(cfg);
  if (!test.ok) return { error: test.error || "Connection test failed" };

  const id = await createSsoConnection({
    workspaceId,
    type: "oidc",
    label: input.label.trim() || "OIDC",
    domain: input.domain,
    issuer: input.discoveryUrl.trim(),
    config: cfg,
  });

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "sso.create",
    targetType: "sso_connection",
    targetId: id,
    metadata: { type: "oidc", domain: input.domain },
  });

  revalidatePath("/enterprise");
  return { ok: true, id };
}

export async function setSsoEnabled(id: string, enabled: boolean) {
  const ctx = await gate("sso:manage", "sso");
  if ("error" in ctx) return ctx;
  await updateSsoConnection(id, ctx.workspaceId, { enabled });
  revalidatePath("/enterprise");
  return { ok: true };
}

export async function removeSsoConnection(id: string) {
  const ctx = await gate("sso:manage", "sso");
  if ("error" in ctx) return ctx;
  await deleteSsoConnection(id, ctx.workspaceId);
  revalidatePath("/enterprise");
  return { ok: true };
}

/* ---------------------------------- SCIM --------------------------------- */

export async function listScimTokens() {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId) return [];
  if (!isEEEnabled("scim")) return [];
  const rows = await db
    .select({
      id: scimToken.id,
      name: scimToken.name,
      lastUsedAt: scimToken.lastUsedAt,
      createdAt: scimToken.createdAt,
      expiresAt: scimToken.expiresAt,
    })
    .from(scimToken)
    .where(eq(scimToken.workspaceId, workspaceId));
  return rows;
}

/** Create a SCIM token; returns the raw token ONCE. */
export async function createScimTokenAction(name: string) {
  const ctx = await gate("scim:manage", "scim");
  if ("error" in ctx) return ctx;
  const { session, workspaceId } = ctx;

  const { id, token } = await createScimToken(
    workspaceId,
    name || "SCIM token",
    session.user.id,
  );

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "scim.token.create",
    targetType: "scim_token",
    targetId: id,
  });

  revalidatePath("/enterprise");
  return { ok: true, id, token };
}

export async function deleteScimToken(id: string) {
  const ctx = await gate("scim:manage", "scim");
  if ("error" in ctx) return ctx;
  await db
    .delete(scimToken)
    .where(and(eq(scimToken.id, id), eq(scimToken.workspaceId, ctx.workspaceId)));
  revalidatePath("/enterprise");
  return { ok: true };
}

/* --------------------------------- audit --------------------------------- */

export async function getAuditLog(action?: string) {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId)
    return { events: [], actions: [], enabled: false };
  if (!isEEEnabled("audit-log"))
    return { events: [], actions: [], enabled: false };
  const canRead = await can(session.user.id, workspaceId, "audit:read");
  if (!canRead) return { events: [], actions: [], enabled: true };
  const [events, actions] = await Promise.all([
    listAuditEvents(workspaceId, { action, limit: 200 }),
    listAuditActions(workspaceId),
  ]);
  return { events, actions, enabled: true };
}
