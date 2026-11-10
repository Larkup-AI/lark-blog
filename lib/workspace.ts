/**
 * Workspace (multi-tenancy) resolution helpers.
 *
 * A user can belong to several workspaces; the "active" one is remembered in a
 * cookie and validated against membership on every request. Posts and settings
 * are scoped to the active workspace. This is MIT-core; advanced governance
 * (custom roles, SSO, SCIM, audit) is gated by the EE license.
 */
import { cookies } from "next/headers";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspace, workspaceMember, type Workspace } from "@/lib/db/schema";
import { getSession } from "@/lib/admin";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

/** All workspaces the given user belongs to, with their role, oldest first. */
export async function getUserWorkspaces(
  userId: string,
): Promise<WorkspaceWithRole[]> {
  const rows = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      logo: workspace.logo,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, userId))
    .orderBy(asc(workspace.createdAt));
  return rows as WorkspaceWithRole[];
}

/** Membership row for a (user, workspace) pair, or null. */
export async function getMembership(userId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * The active workspace for the current session, or null if the user has none.
 * Reads the cookie, validates membership, and falls back to the first
 * workspace the user belongs to.
 */
export async function getActiveWorkspace(): Promise<WorkspaceWithRole | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const mine = await getUserWorkspaces(session.user.id);
  if (mine.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (preferred) {
    const match = mine.find((w) => w.id === preferred);
    if (match) return match;
  }
  return mine[0];
}

/**
 * The active workspace id for the current session. Used to scope queries.
 * Returns null when the user has no workspace (pre-migration / fresh install).
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  return (await getActiveWorkspace())?.id ?? null;
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/** True when `role` is at least `required` in the workspace hierarchy. */
export function roleAtLeast(
  role: string | null | undefined,
  required: WorkspaceRole,
): boolean {
  if (!role) return false;
  return (ROLE_RANK[role as WorkspaceRole] ?? 0) >= ROLE_RANK[required];
}
