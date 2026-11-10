import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and, isNotNull, ne } from "drizzle-orm";
import { resolveApiKey } from "@/lib/api-keys";

export async function GET(req: Request) {
  try {
    const key = await resolveApiKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Unauthorized: missing or invalid API key (send it in the Authorization: Bearer header)" },
        { status: 401 },
      );
    }

    // Get all distinct categories that have at least one published post
    const rows = await db
      .selectDistinct({ category: posts.category })
      .from(posts)
      .where(
        and(
          eq(posts.userId, key.userId),
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
