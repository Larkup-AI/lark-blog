import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, user } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { resolveApiKey } from "@/lib/api-keys";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pageStr = url.searchParams.get("page");
    const limitStr = url.searchParams.get("limit");
    const categoryFilter = url.searchParams.get("category");

    const page = typeof pageStr === "string" ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;
    const limit = typeof limitStr === "string" ? Math.max(1, parseInt(limitStr, 10) || 10) : 10;
    const offset = (page - 1) * limit;

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

    let queryConditions = eq(posts.userId, key.userId);

    // If not including drafts (not in preview mode), only show published posts
    if (!includeDrafts) {
      queryConditions = and(queryConditions, eq(posts.published, true)) as any;
    }

    // Filter by category if provided
    if (categoryFilter) {
      queryConditions = and(queryConditions, eq(posts.category, categoryFilter)) as any;
    }

    const [countResult] = await db.select({ count: count() }).from(posts).where(queryConditions);
    const totalCount = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const paginatedPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        coverImage: posts.coverImage,
        showCover: posts.showCover,
        coverSize: posts.coverSize,
        coverFit: posts.coverFit,
        coverZoom: posts.coverZoom,
        coverX: posts.coverX,
        coverY: posts.coverY,
        category: posts.category,
        authorName: posts.authorName,
        readingTime: posts.readingTime,
        published: posts.published,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
        showToc: posts.showToc,
        isMain: posts.isMain,
      })
      .from(posts)
      .where(queryConditions)
      .orderBy(desc(posts.isMain), desc(posts.updatedAt))
      .limit(limit)
      .offset(offset);

    const postsWithAuthor = paginatedPosts.map(p => ({
      ...p,
      authorName: !p.authorName || p.authorName === "Admin" ? blogOwner?.name : p.authorName,
      authorImage: blogOwner?.image || null
    }));

    return NextResponse.json({ 
      posts: postsWithAuthor,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
