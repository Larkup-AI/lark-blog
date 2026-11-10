"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  workspace,
  workspaceMember,
  invitation,
  user as userTable,
} from "@/lib/db/schema";
import { getSession } from "@/lib/admin";
import { getBaseUrl, brand } from "@/lib/config";
import { sendEmail, isEmailEnabledResolved } from "@/lib/providers/email";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getActiveWorkspace,
  getMembership,
  getUserWorkspaces,
  roleAtLeast,
  type WorkspaceRole,
} from "@/lib/workspace";
import { isEEEnabled } from "@/ee/license";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "") || "workspace"
  );
}

async function uniqueSlug(base: string) {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  while (true) {
    const [existing] = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

/** Workspaces for the current user + which one is active. */
export async function listMyWorkspaces() {
  const session = await getSession();
  if (!session?.user) return { workspaces: [], activeId: null as string | null };
  const workspaces = await getUserWorkspaces(session.user.id);
  const active = await getActiveWorkspace();
  return { workspaces, activeId: active?.id ?? null };
}

/**
 * Create a new workspace and make the creator its owner. In the free core a
 * user can own a limited number of workspaces; unlimited workspaces are an EE
 * feature (`custom-roles` license flag doubles as the "teams" unlock here).
 */
export async function createWorkspace(name: string) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Workspace name is required" };

  // Free-core guardrail: cap the number of workspaces a user can own unless EE.
  const FREE_WORKSPACE_LIMIT = 2;
  if (!isEEEnabled("custom-roles")) {
    const mine = await getUserWorkspaces(session.user.id);
    const owned = mine.filter((w) => w.role === "owner").length;
    if (owned >= FREE_WORKSPACE_LIMIT) {
      return {
        error: `The free plan allows up to ${FREE_WORKSPACE_LIMIT} workspaces. Upgrade to add more.`,
        upgrade: true,
      };
    }
  }

  const id = `ws_${randomUUID().replace(/-/g, "")}`;
  const slug = await uniqueSlug(trimmed);

  await db.insert(workspace).values({
    id,
    name: trimmed,
    slug,
    createdBy: session.user.id,
  });
  await db.insert(workspaceMember).values({
    id: `wm_${randomUUID().replace(/-/g, "")}`,
    workspaceId: id,
    userId: session.user.id,
    role: "owner",
  });

  // Make the new workspace active.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/");
  return { ok: true, workspaceId: id, slug };
}

/** Switch the active workspace (validates membership first). */
export async function switchWorkspace(workspaceId: string) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership) return { error: "You are not a member of that workspace" };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/");
  return { ok: true };
}

/** Rename the active workspace. Requires admin or owner. */
export async function renameWorkspace(workspaceId: string, name: string) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = await getMembership(session.user.id, workspaceId);
  if (!roleAtLeast(membership?.role, "admin"))
    return { error: "Only admins can rename a workspace" };

  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Name is required" };

  await db
    .update(workspace)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(workspace.id, workspaceId));

  revalidatePath("/workspaces");
  return { ok: true };
}

/** Members of a workspace with their user details. Requires membership. */
export async function listWorkspaceMembers(workspaceId: string) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated", members: [] };

  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership) return { error: "Not a member", members: [] };

  const members = await db
    .select({
      id: workspaceMember.id,
      role: workspaceMember.role,
      userId: workspaceMember.userId,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      createdAt: workspaceMember.createdAt,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(eq(workspaceMember.workspaceId, workspaceId));

  return { members, myRole: membership.role as WorkspaceRole };
}

/** Change a member's role. Requires owner. Custom roles beyond the 3 are EE. */
export async function setMemberRole(
  workspaceId: string,
  memberUserId: string,
  role: WorkspaceRole,
) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const mine = await getMembership(session.user.id, workspaceId);
  if (!roleAtLeast(mine?.role, "owner"))
    return { error: "Only the owner can change roles" };

  if (!["owner", "admin", "member"].includes(role))
    return { error: "Unknown role" };

  await db
    .update(workspaceMember)
    .set({ role })
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, memberUserId),
      ),
    );

  revalidatePath("/workspaces");
  return { ok: true };
}

/** Remove a member from a workspace. Requires admin; cannot remove the owner. */
export async function removeMember(workspaceId: string, memberUserId: string) {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };

  const mine = await getMembership(session.user.id, workspaceId);
  if (!roleAtLeast(mine?.role, "admin"))
    return { error: "Only admins can remove members" };

  const target = await getMembership(memberUserId, workspaceId);
  if (target?.role === "owner")
    return { error: "The workspace owner cannot be removed" };

  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, memberUserId),
      ),
    );

  revalidatePath("/workspaces");
  return { ok: true };
}

/**
 * Invite someone to a workspace. If the email already belongs to a user they
 * are added as a member immediately. Otherwise a pending invitation (carrying
 * the workspace id) is created; membership is granted on sign-up. When email is
 * disabled the invite link is returned so an admin can share it manually.
 */
export async function inviteToWorkspace(
  workspaceId: string,
  email: string,
  role: WorkspaceRole | string,
): Promise<{ ok: boolean; error?: string; link?: string; added?: boolean }> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const mine = await getMembership(session.user.id, workspaceId);
  if (!roleAtLeast(mine?.role, "admin"))
    return { ok: false, error: "Only admins can invite members" };

  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Email is required" };
  const memberRole = role === "admin" ? "admin" : "member";

  // Already a user? Add them straight away.
  const [existingUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, normalized))
    .limit(1);

  if (existingUser) {
    const already = await getMembership(existingUser.id, workspaceId);
    if (already) return { ok: false, error: "Already a member of this workspace" };
    await db.insert(workspaceMember).values({
      id: `wm_${randomUUID().replace(/-/g, "")}`,
      workspaceId,
      userId: existingUser.id,
      role: memberRole,
    });
    revalidatePath("/workspaces");
    return { ok: true, added: true };
  }

  // Otherwise create a pending invite tied to this workspace.
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  await db.insert(invitation).values({
    id: randomUUID(),
    email: normalized,
    role: memberRole,
    token,
    invitedBy: session.user.id,
    workspaceId,
    status: "pending",
  });

  const link = `${getBaseUrl()}/invite?token=${token}`;

  if (await isEmailEnabledResolved()) {
    await sendEmail({
      email: normalized,
      subject: `You've been invited to a ${brand.name} workspace`,
      text: `You've been invited to join a workspace. Accept here: ${link}`,
      html: `<p>You've been invited to join a workspace on ${brand.name}.</p><p><a href="${link}">Accept the invitation</a></p>`,
    });
    revalidatePath("/workspaces");
    return { ok: true };
  }

  // Email disabled → hand back the link for manual sharing.
  revalidatePath("/workspaces");
  return { ok: true, link };
}
