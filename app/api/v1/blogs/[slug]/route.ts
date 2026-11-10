import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveApiKey } from "@/lib/api-keys";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);

    const key = await resolveApiKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Unauthorized: missing or invalid API key (send it in the Authorization: Bearer header)" },
        { status: 401 },
      );
    }

    // Drafts require a secret key; publishable (pk_) keys only ever see published posts.
    const includeDrafts = url.searchParams.get("preview") === "true" && key.canReadDrafts;

    const [blogOwner] = await db.select({ name: user.name, image: user.image }).from(user).where(eq(user.id, key.userId));

    let queryConditions = and(eq(posts.userId, key.userId), eq(posts.slug, slug));

    if (!includeDrafts) {
      queryConditions = and(queryConditions, eq(posts.published, true));
    }

    const [post] = await db.select().from(posts).where(queryConditions);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const postResponse = {
      ...post,
      authorName: !post.authorName || post.authorName === "Admin" ? blogOwner?.name : post.authorName,
      authorImage: blogOwner?.image || null
    };

    return NextResponse.json({ post: postResponse });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
