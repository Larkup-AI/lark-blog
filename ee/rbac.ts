/**
 * Enterprise RBAC — custom roles and fine-grained permissions.
 *
 * The MIT core ships three fixed workspace roles (owner / admin / member). This
 * module maps those onto a permission set and, when the EE `custom-roles`
 * license flag is on, lets a workspace define additional named roles with an
 * explicit permission list (stored in the `role` table, attached to a member
 * via `workspace_member.customRoleId`).
 *
 * Permission checks ALWAYS work: with no license the custom-role path is simply
 * never taken and the fixed-role mapping below is authoritative, so the core
 * stays fully functional. EE only *adds* the ability to define custom roles.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { role as roleTable, workspaceMember } from "@/lib/db/schema";
import { isEEEnabled } from "./license";

/** Every capability that can be granted. Dotted `resource:action`. */
export const PERMISSIONS = [
  "post:create",
  "post:edit",
  "post:publish",
  "post:delete",
  "settings:read",
  "settings:write",
  "members:read",
  "members:invite",
  "members:manage",
  "apiKeys:manage",
  "schedules:read",
  "schedules:manage",
  "audit:read",
  "sso:manage",
  "scim:manage",
  "roles:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Fixed core roles → permission sets. `*` means "all permissions". */
const FIXED_ROLE_PERMISSIONS: Record<string, Permission[] | "*"> = {
  owner: "*",
  admin: [
    "post:create",
    "post:edit",
    "post:publish",
    "post:delete",
    "settings:read",
    "settings:write",
    "members:read",
    "members:invite",
    "members:manage",
    "apiKeys:manage",
    "schedules:read",
    "schedules:manage",
    "audit:read",
  ],
  member: [
    "post:create",
    "post:edit",
    "post:publish",
    "settings:read",
    "members:read",
    "schedules:read",
  ],
};

/**
 * Preset permission bundles offered as starting points when creating a custom
 * role in the UI. These are suggestions; operators can tweak the list freely.
 */
export const ROLE_PRESETS: Record<string, Permission[]> = {
  Editor: [
    "post:create",
    "post:edit",
    "post:publish",
    "post:delete",
    "schedules:read",
    "schedules:manage",
    "members:read",
  ],
  Writer: ["post:create", "post:edit", "members:read", "schedules:read"],
  Viewer: ["settings:read", "members:read", "schedules:read"],
};

function permsForFixedRole(fixed: string | null | undefined): Set<Permission> {
  const mapped = FIXED_ROLE_PERMISSIONS[fixed ?? "member"];
  if (mapped === "*") return new Set(PERMISSIONS);
  return new Set(mapped ?? FIXED_ROLE_PERMISSIONS.member);
}

export type ResolvedPermissions = {
  permissions: Set<Permission>;
  /** The role name shown in the UI (custom role name or the fixed role). */
  roleName: string;
  /** True when a custom (EE) role is in effect. */
  custom: boolean;
};

/**
 * Resolve the effective permissions for a (user, workspace) pair. Reads the
 * membership row; if the member has a custom role AND the EE flag is on, the
 * custom role's permission list wins. Otherwise the fixed-role mapping applies.
 */
export async function resolvePermissions(
  userId: string,
  workspaceId: string,
): Promise<ResolvedPermissions | null> {
  const [member] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!member) return null;

  if (member.customRoleId && isEEEnabled("custom-roles")) {
    const [custom] = await db
      .select()
      .from(roleTable)
      .where(
        and(
          eq(roleTable.id, member.customRoleId),
          eq(roleTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (custom) {
      const list = (custom.permissions as Permission[]) ?? [];
      return {
        permissions: new Set(list),
        roleName: custom.name,
        custom: true,
      };
    }
  }

  return {
    permissions: permsForFixedRole(member.role),
    roleName: member.role,
    custom: false,
  };
}

/** Does the (user, workspace) pair hold `permission`? */
export async function can(
  userId: string,
  workspaceId: string,
  permission: Permission,
): Promise<boolean> {
  const resolved = await resolvePermissions(userId, workspaceId);
  if (!resolved) return false;
  return resolved.permissions.has(permission);
}
