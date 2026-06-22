"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export async function getSettings() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  let [userSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));

  if (!userSettings) {
    // create default settings
    [userSettings] = await db
      .insert(settings)
      .values({
        userId,
        apiKey: null,
        previewUrl: "",
      })
      .returning();
  }

  return userSettings;
}

export async function updateSettings(previewUrl: string) {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  await db
    .update(settings)
    .set({ previewUrl, updatedAt: new Date() })
    .where(eq(settings.userId, userId));
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function generateApiKey() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  const newKey = "sk_larkup_" + randomBytes(24).toString("hex");

  await db
    .update(settings)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(settings.userId, userId));
  revalidatePath("/settings");
  return newKey;
}
