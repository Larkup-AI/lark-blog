/**
 * Enterprise SCIM 2.0 provisioning helpers.
 *
 * An IdP (Okta, Azure AD, OneLogin) calls `/api/scim/v2/*` with a Bearer token
 * to create and deactivate users in a workspace automatically. Tokens are
 * stored as SHA-256 hashes (the raw token is shown once on creation).
 *
 * Gated by the EE `scim` license flag — without it, token verification fails
 * closed and the SCIM endpoints return 501.
 */
import { randomUUID, createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  scimToken,
  user as userTable,
  workspaceMember,
} from "@/lib/db/schema";
import { isEEEnabled } from "./license";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a SCIM token for a workspace. Returns the RAW token once. */
export async function createScimToken(
  workspaceId: string,
  name: string,
  createdBy?: string,
): Promise<{ id: string; token: string }> {
  const raw = `scim_${randomBytes(24).toString("base64url")}`;
  const id = `scimt_${randomUUID().replace(/-/g, "")}`;
  await db.insert(scimToken).values({
    id,
    workspaceId,
    name: name || "SCIM token",
    tokenHash: hashToken(raw),
    createdBy: createdBy ?? null,
  });
  return { id, token: raw };
}

/**
 * Verify a Bearer token and return the workspace it provisions, or null.
 * Fails closed when SCIM is not licensed.
 */
export async function verifyScimToken(
  authorizationHeader: string | null,
): Promise<{ workspaceId: string; tokenId: string } | null> {
  if (!isEEEnabled("scim")) return null;
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  const [row] = await db
    .select()
    .from(scimToken)
    .where(eq(scimToken.tokenHash, hashToken(raw)))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // Best-effort last-used timestamp (don't block the request on it).
  db.update(scimToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(scimToken.id, row.id))
    .catch(() => {});

  return { workspaceId: row.workspaceId, tokenId: row.id };
}

/* --------------------------- SCIM user shaping --------------------------- */

export type ScimUserResource = {
  schemas: string[];
  id: string;
  userName: string;
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
  emails: { value: string; primary: boolean }[];
  active: boolean;
  meta: { resourceType: "User" };
};

export function toScimUser(u: {
  id: string;
  email: string;
  name: string;
  active: boolean;
}): ScimUserResource {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: u.id,
    userName: u.email,
    displayName: u.name,
    emails: [{ value: u.email, primary: true }],
    active: u.active,
    meta: { resourceType: "User" },
  };
}

/** List members of the workspace shaped as SCIM users. */
export async function scimListUsers(workspaceId: string) {
  const rows = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(eq(workspaceMember.workspaceId, workspaceId));
  return rows.map((r) => toScimUser({ ...r, active: true }));
}

/**
 * Provision a user into the workspace. If a user with the email exists they are
 * added as a member; otherwise a shell user is created (no password — they sign
 * in via SSO). Idempotent on (workspace, email).
 */
export async function scimProvisionUser(
  workspaceId: string,
  input: { email: string; name?: string },
): Promise<ScimUserResource> {
  const email = input.email.trim().toLowerCase();
  let [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (!existing) {
    const id = randomUUID();
    await db.insert(userTable).values({
      id,
      email,
      name: input.name || email,
      emailVerified: true,
      role: "user",
    });
    [existing] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
  }

  const [member] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, existing.id),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!member) {
    await db.insert(workspaceMember).values({
      id: `wm_${randomUUID().replace(/-/g, "")}`,
      workspaceId,
      userId: existing.id,
      role: "member",
    });
  }

  return toScimUser({
    id: existing.id,
    email: existing.email,
    name: existing.name,
    active: true,
  });
}

/**
 * Deprovision (deactivate) a user: remove their membership of this workspace.
 * The user account itself is left intact (they may belong to others).
 */
export async function scimDeprovisionUser(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    );
  return true;
}

/** Fetch one workspace member as a SCIM user, or null. */
export async function scimGetUser(workspaceId: string, userId: string) {
  const [row] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);
  return row ? toScimUser({ ...row, active: true }) : null;
}
