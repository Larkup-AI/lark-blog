import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, posts } from "@/lib/db/schema";
import { eq, and, isNotNull, ne } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get("x-api-key") || url.searchParams.get("key");

    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
    }

    const [userSettings] = await db.select().from(settings).where(eq(settings.apiKey, apiKey));

    if (!userSettings) {
      return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
    }

    // Get all distinct categories that have at least one published post
    const rows = await db
      .selectDistinct({ category: posts.category })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userSettings.userId),
          eq(posts.published, true),
          isNotNull(posts.category),
          ne(posts.category, ""),
        ),
      )
      .orderBy(posts.category);

    const categories = rows
      .map((r) => r.category)
      .filter((c): c is string => !!c);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
