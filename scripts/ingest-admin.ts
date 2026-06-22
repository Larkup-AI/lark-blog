import "dotenv/config";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { user } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    console.error("ADMIN_EMAIL must be set in .env");
    process.exit(1);
  }

  if (!password) {
    console.error("ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  console.log(`Ingesting admin account for ${email}...`);

  try {
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `User ${email} already exists. Updating role to full_admin...`,
      );
      await db
        .update(user)
        .set({ role: "full_admin" })
        .where(eq(user.email, email));
      console.log("Successfully updated role to full_admin.");
      process.exit(0);
    }

    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Admin",
      },
      headers: new Headers(),
    });

    if (res?.user) {
      await db
        .update(user)
        .set({ role: "full_admin", emailVerified: true })
        .where(eq(user.email, email));
      console.log(
        `Successfully ingested admin account for ${email} as full_admin`,
      );
      console.log(`Password: ${password}`);
    } else {
      console.error("Failed to ingest admin account", res);
    }
  } catch (err) {
    console.error("Error creating admin account:", err);
  }
}

main();

// npx tsx scripts/ingest-admin.ts
