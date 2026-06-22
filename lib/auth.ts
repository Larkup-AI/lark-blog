import { betterAuth } from "better-auth";
import { pool } from "@/lib/db";
import { sendEmail } from "@/app/actions/resend";

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        email: user.email,
        subject: "Reset your password",
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
          const { eq } = await import("drizzle-orm");
          const { drizzle } = await import("drizzle-orm/node-postgres");
          const { invitation } = await import("@/lib/db/schema");
          const db = drizzle(pool);

          await db
            .update(invitation)
            .set({ status: "accepted" })
            .where(eq(invitation.email, user.email));
        },
      },
    },
  },
  trustedOrigins: [
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    "http://localhost:3000",
    "https://localhost:3000",
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
