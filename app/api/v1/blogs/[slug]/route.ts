import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, posts, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const includeDrafts = url.searchParams.get("preview") === "true";
    const apiKey = req.headers.get("x-api-key") || url.searchParams.get("key");

    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
    }

    const [userSettings] = await db.select().from(settings).where(eq(settings.apiKey, apiKey));
    
    if (!userSettings) {
      return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
    }

    const [blogOwner] = await db.select({ name: user.name, image: user.image }).from(user).where(eq(user.id, userSettings.userId));

    let queryConditions = and(eq(posts.userId, userSettings.userId), eq(posts.slug, slug));

    if (!includeDrafts) {
      queryConditions = and(queryConditions, eq(posts.published, true));
    }

    const [post] = await db.select().from(posts).where(queryConditions);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post && blogOwner) {
      if (!post.authorName || post.authorName === "Admin") {
        post.authorName = blogOwner.name;
      }
      (post as any).authorImage = blogOwner.image;
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
