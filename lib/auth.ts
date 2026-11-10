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
          const { invitation, workspaceMember } = await import(
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

          for (const invite of pending) {
            if (!invite.workspaceId) continue;
            try {
              await db.insert(workspaceMember).values({
                id: `wm_${randomUUID().replace(/-/g, "")}`,
                workspaceId: invite.workspaceId,
                userId: user.id,
                role: invite.role === "admin" ? "admin" : "member",
              });
            } catch {
              // Ignore duplicate-membership races.
            }
          }

          await db
            .update(invitation)
            .set({ status: "accepted" })
            .where(eq(invitation.email, user.email));
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
