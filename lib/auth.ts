import { betterAuth } from "better-auth";
import { pool } from "@/lib/db";
import { sendEmail, isEmailEnabled } from "@/lib/providers/email";
import { getBaseUrl, trustedOrigins as configTrustedOrigins, brand } from "@/lib/config";

export const auth = betterAuth({
  database: pool,
  baseURL: getBaseUrl(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (!isEmailEnabled()) {
        // No email transport configured: log the reset link so an operator can
        // relay it manually, instead of silently failing.
        console.warn(
          `[auth] Email disabled. Password reset link for ${user.email}: ${url}`
        );
        return;
      }
      await sendEmail({
        email: user.email,
        subject: `Reset your ${brand.name} password`,
        text: `Click the link to reset your password: ${url}`,
        html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!user.image) {
            user.image = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`;
          }

          const { eq, and } = await import("drizzle-orm");
          const { drizzle } = await import("drizzle-orm/node-postgres");
          const { invitation } = await import("@/lib/db/schema");
          const db = drizzle(pool);

          const [invite] = await db
            .select()
            .from(invitation)
            .where(
              and(
                eq(invitation.email, user.email),
                eq(invitation.status, "pending"),
              ),
            )
            .limit(1);

          if (invite) {
            user.role = invite.role;
          } else if (!user.role) {
            user.role = "user";
          }
          return { data: user };
        },
        after: async (user) => {
          const { eq, and } = await import("drizzle-orm");
          const { drizzle } = await import("drizzle-orm/node-postgres");
          const { invitation, workspace, workspaceMember } = await import(
            "@/lib/db/schema"
          );
          const { randomUUID } = await import("crypto");
          const db = drizzle(pool);

          // Grant workspace membership for any pending workspace invite before
          // marking the invites accepted.
          const pending = await db
            .select()
            .from(invitation)
            .where(
              and(
                eq(invitation.email, user.email),
                eq(invitation.status, "pending"),
              ),
            );

          let grantedMembership = false;
          for (const invite of pending) {
            if (!invite.workspaceId) continue;
            try {
              await db.insert(workspaceMember).values({
                id: `wm_${randomUUID().replace(/-/g, "")}`,
                workspaceId: invite.workspaceId,
                userId: user.id,
                role: invite.role === "admin" ? "admin" : "member",
              });
              grantedMembership = true;
            } catch {
              // Ignore duplicate-membership races.
            }
          }

          await db
            .update(invitation)
            .set({ status: "accepted" })
            .where(eq(invitation.email, user.email));

          // Open signup (cloud): a user who joined via no invite gets their own
          // personal workspace so they land in a usable studio. Self-host users
          // normally arrive via /setup or an invite, so this only fires when
          // they truly have no workspace.
          if (!grantedMembership) {
            const existing = await db
              .select({ id: workspaceMember.id })
              .from(workspaceMember)
              .where(eq(workspaceMember.userId, user.id))
              .limit(1);
            if (existing.length === 0) {
              const base =
                (user.name || user.email.split("@")[0] || "workspace")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "") || "workspace";
              const wsId = `ws_${randomUUID().replace(/-/g, "")}`;
              try {
                await db.insert(workspace).values({
                  id: wsId,
                  name: user.name ? `${user.name}'s workspace` : "My workspace",
                  slug: `${base}-${wsId.slice(3, 9)}`,
                  createdBy: user.id,
                });
                await db.insert(workspaceMember).values({
                  id: `wm_${randomUUID().replace(/-/g, "")}`,
                  workspaceId: wsId,
                  userId: user.id,
                  role: "owner",
                });
              } catch {
                // Non-fatal: the user can create a workspace from the UI.
              }
            }
          }
        },
      },
    },
  },
  trustedOrigins: configTrustedOrigins(),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Cache the session in a signed cookie so most requests skip a DB round-trip.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
});
