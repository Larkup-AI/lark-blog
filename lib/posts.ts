import { db } from "@/lib/db";
import { posts, user, type Post } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

/** Public: list published posts, newest first. */
export async function getPublishedPosts(limit?: number): Promise<Post[]> {
  try {
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
    return limit ? rows.slice(0, limit) : rows;
  } catch (error) {
    console.log(" getPublishedPosts failed:", (error as Error).message);
    return [];
  }
}

/** Public: a single published post by slug. */
export async function getPublishedPostBySlug(
  slug: string,
): Promise<(Post & { authorImage?: string | null }) | null> {
  try {
    const [row] = await db
      .select({
        post: posts,
        authorImage: user.image,
      })
      .from(posts)
      .leftJoin(user, eq(posts.userId, user.id))
      .where(and(eq(posts.slug, slug), eq(posts.published, true)))
      .limit(1);

    if (!row) return null;
    return { ...row.post, authorImage: row.authorImage };
  } catch (error) {
    console.log("getPublishedPostBySlug failed:", (error as Error).message);
    return null;
  }
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
