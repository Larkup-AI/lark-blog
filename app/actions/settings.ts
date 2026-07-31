"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, user } from "@/lib/db/schema";
import { getAdminUserId, getSession } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendEmail } from "@/app/actions/resend";

export async function getSettings() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  let [userSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));

  if (!userSettings) {
    [userSettings] = await db
      .insert(settings)
      .values({
        userId,
        apiKey: null,
        previewUrl: "",
        aiProvider: "vercel",
        customAiUrl: "",
        customAiKey: "",
        customAiModel: "",
      })
      .returning();
  }

  const session = await getSession();
  let vercelAiGatewayKey = "";
  if (session?.user?.id) {
    const [currentUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    vercelAiGatewayKey = currentUser?.vercelAiGatewayKey || "";
  }

  return { ...userSettings, vercelAiGatewayKey };
}

export async function updateSettings(
  previewUrl: string,
  aiProvider: string,
  customAiUrl: string | null,
  customAiKey: string | null,
  customAiModel: string | null,
  vercelAiGatewayKey: string | null
) {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  await db
    .update(settings)
    .set({
      previewUrl,
      aiProvider,
      customAiUrl,
      customAiKey,
      customAiModel,
      updatedAt: new Date()
    })
    .where(eq(settings.userId, userId));

  const session = await getSession();
  if (session?.user?.id) {
    await db.update(user).set({ vercelAiGatewayKey }).where(eq(user.id, session.user.id));
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function generateApiKey() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  const newKey = "lk_larkup_" + randomBytes(24).toString("hex");

  await db
    .update(settings)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(settings.userId, userId));

  const admins = await db.select().from(user);
  for (const admin of admins) {
    if (admin.role === 'admin' || admin.role === 'full_admin') {
      await sendEmail({
        email: admin.email,
        subject: "API Access Key Updated - Larkup Blog Studio",
        html: `<p>Hello ${admin.name},</p><p>The API access key for Larkup Blog Studio has been recently updated.</p><p>If you or your team use this key for integrations, please coordinate to update your environment variables or configurations with the new key.</p>`
      }).catch(console.error); // Catch errors to not fail the generation
    }
  }

  revalidatePath("/settings");
  return newKey;
}

export async function verifyLocalModel(
  url: string,
  apiKey: string,
  modelName: string
) {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");

  try {
    let testUrl = url;
    if (testUrl.endsWith("/")) testUrl = testUrl.slice(0, -1);

    // We try to verify by fetching models endpoint or sending a small chat request
    // Many OpenAI compatible servers support /models
    const res = await fetch(`${testUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    if (res.ok) {
      return { success: true };
    }

    // fallback test chat completion if /models fails (some servers might not implement it)
    const chatRes = await fetch(`${testUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1
      }),
    });

    if (chatRes.ok) {
      return { success: true };
    }

    const text = await chatRes.text();
    let errorMessage = "Check your URL, API Key, and Model name.";

    try {
      const json = JSON.parse(text);
      if (json.error && typeof json.error === "string") {
        errorMessage = json.error;
      } else if (json.error?.message) {
        errorMessage = json.error.message;
      } else {
        errorMessage = JSON.stringify(json).slice(0, 100);
      }
    } catch {
      if (text.trim().toLowerCase().startsWith("<!doctype html>") || text.trim().toLowerCase().startsWith("<html")) {
        errorMessage = "Server returned an HTML page instead of an API response. Are you sure the Base URL is correct?";
      } else if (text.trim()) {
        errorMessage = text.slice(0, 100);
      }
    }

    return {
      success: false,
      error: `Verification failed. ${errorMessage}`
    };
  } catch (error: any) {
    return { success: false, error: "Verification error: " + error.message };
  }
}
