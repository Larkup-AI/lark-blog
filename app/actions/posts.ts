"use server";

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { getAdminUserId, getSession, isFullAdmin, isAdmin } from "@/lib/admin";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readingTimeFromHtml(html: string) {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

async function uniqueSlug(base: string, excludeId?: number) {
  const root = slugify(base) || "untitled";
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, candidate))
      .limit(1);
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

import { count } from "drizzle-orm";

export async function getPostCounts(authorId?: string) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  let query = db
    .select({ published: posts.published, count: count() })
    .from(posts)
    .$dynamic();

  if (authorId) {
    query = query.where(eq(posts.userId, authorId));
  }

  const allPosts = await query.groupBy(posts.published);

  let publishedCount = 0;
  let draftCount = 0;

  for (const row of allPosts) {
    if (row.published) publishedCount += Number(row.count);
    else draftCount += Number(row.count);
  }

  return {
    total: publishedCount + draftCount,
    publishedCount,
    draftCount,
  };
}

export async function getPaginatedPosts(
  page: number = 1,
  limit: number = 10,
  authorId?: string,
) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  const offset = (page - 1) * limit;

  let query = db.select().from(posts).$dynamic();

  if (authorId) {
    query = query.where(eq(posts.userId, authorId));
  }

  const data = await query
    .orderBy(desc(posts.updatedAt))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function listAllPosts(authorId?: string) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  let query = db.select().from(posts).$dynamic();
  if (authorId) {
    query = query.where(eq(posts.userId, authorId));
  }

  return query.orderBy(desc(posts.updatedAt));
}

export async function getPostById(id: number) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  let query = db.select().from(posts).where(eq(posts.id, id)).$dynamic();

  const [row] = await query.limit(1);
  return row ?? null;
}

export async function createPost() {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  const slug = await uniqueSlug(`draft-${Date.now()}`);
  const [row] = await db
    .insert(posts)
    .values({
      userId: session.user.id,
      title: "Untitled",
      slug,
      authorName: session.user.name || "Admin",
      published: false,
    })
    .returning({ id: posts.id });
  revalidatePath("/");
  return row.id;
}

type SavePayload = {
  id: number;
  title: string;
  category: string;
  authorName: string;
  coverImage: string | null;
  showCover: boolean;
  coverSize: string;
  showToc: boolean;
  content: unknown;
  contentHtml: string;
};

export async function savePost(payload: SavePayload) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  const existing = await getPostById(payload.id);
  if (!existing) throw new Error("Not found");

  // The URL is generated from the title and is continuously updated while the post is a draft.
  // Once the post is published (publishedAt is set), the URL is locked to avoid breaking links.
  const hasBeenPublished = !!existing.publishedAt;
  const slug = !hasBeenPublished
    ? await uniqueSlug(payload.title || "untitled", payload.id)
    : existing.slug;

  await db
    .update(posts)
    .set({
      title: payload.title || "Untitled",
      slug,
      category: payload.category || null,
      authorName: payload.authorName || "Admin",
      coverImage: payload.coverImage,
      showCover: payload.showCover,
      coverSize: payload.coverSize,
      showToc: payload.showToc,
      content: payload.content as never,
      contentHtml: payload.contentHtml,
      readingTime: readingTimeFromHtml(payload.contentHtml),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, payload.id));

  revalidatePath("/");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  return { slug };
}

export async function setPublished(id: number, published: boolean) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  const existing = await getPostById(id);
  if (!existing) throw new Error("Not found");

  await db
    .update(posts)
    .set({
      published,
      publishedAt: existing.publishedAt ?? (published ? new Date() : null),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  revalidatePath("/");
  revalidatePath("/");
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/");
}

export async function deletePost(id: number) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  const existing = await getPostById(id);
  if (!existing) throw new Error("Not found");

  if (!isFullAdmin(session.user) && existing.userId !== session.user.id) {
    throw new Error("You can only delete your own posts");
  }

  await db.delete(posts).where(eq(posts.id, id));
  revalidatePath("/");
  revalidatePath("/");
}
