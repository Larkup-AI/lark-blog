"use server";

import { db } from "@/lib/db";
import { posts, settings } from "@/lib/db/schema";
import { getAdminUserId, getSession, isFullAdmin, isAdmin } from "@/lib/admin";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createHmac } from "crypto";

/**
 * Build a WHERE clause that scopes posts to the active workspace (and,
 * optionally, a single author). When there is no active workspace (fresh
 * install before any workspace exists) scoping falls back to author-only.
 */
async function postScope(authorId?: string): Promise<SQL | undefined> {
  const workspaceId = await getActiveWorkspaceId();
  const clauses: (SQL | undefined)[] = [];
  if (workspaceId) clauses.push(eq(posts.workspaceId, workspaceId));
  if (authorId) clauses.push(eq(posts.userId, authorId));
  const filtered = clauses.filter(Boolean) as SQL[];
  if (filtered.length === 0) return undefined;
  return filtered.length === 1 ? filtered[0] : and(...filtered);
}

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

async function notifyFrontendRevalidation(slug?: string) {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return;

    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, adminId))
      .limit(1);

    if (!userSettings?.previewUrl || !userSettings?.apiKey) return;

    let url = userSettings.previewUrl.trim();
    if (url.endsWith("/")) url = url.slice(0, -1);

    const revalidate = async (tag: string) => {
      const response = await fetch(`${url}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: userSettings.apiKey,
          tag,
        }),
      });
      if (!response.ok) {
        throw new Error(`Revalidation failed for ${tag}: ${response.status}`);
      }
    };

    await Promise.all([revalidate("blog"), ...(slug ? [revalidate(slug)] : [])]);
  } catch (err) {
    console.error("Failed to notify frontend for revalidation:", err);
  }
}

/**
 * Creates a short-lived, slug-scoped preview link for the consumer website.
 * The API key stays server-side; the URL only contains an HMAC signature.
 */
export async function createPreviewUrl(postId: number) {
  const adminId = await getAdminUserId();
  if (!adminId) throw new Error("Unauthorized");

  const [post] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post) throw new Error("Post not found");

  const [userSettings] = await db
    .select({ previewUrl: settings.previewUrl, apiKey: settings.apiKey })
    .from(settings)
    .where(eq(settings.userId, adminId))
    .limit(1);
  if (!userSettings?.previewUrl || !userSettings.apiKey) {
    throw new Error("Configure a consumer URL and API key before previewing.");
  }

  const expires = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = createHmac("sha256", userSettings.apiKey)
    .update(`${post.slug}.${expires}`)
    .digest("hex");
  const url = new URL("/api/blog-preview", userSettings.previewUrl);
  url.searchParams.set("slug", post.slug);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("signature", signature);
  return url.toString();
}

import { count } from "drizzle-orm";

export async function getPostCounts(authorId?: string) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  let query = db
    .select({ published: posts.published, count: count() })
    .from(posts)
    .$dynamic();

  const scope = await postScope(authorId);
  if (scope) query = query.where(scope);

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

  const scope = await postScope(authorId);
  if (scope) query = query.where(scope);

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
  const scope = await postScope(authorId);
  if (scope) query = query.where(scope);

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
  const workspaceId = await getActiveWorkspaceId();
  const [row] = await db
    .insert(posts)
    .values({
      userId: session.user.id,
      workspaceId: workspaceId ?? undefined,
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
  coverFit: string;
  coverZoom: number;
  coverX: number;
  coverY: number;
  showToc: boolean;
  isMain: boolean;
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

  if (payload.isMain) {
    await db
      .update(posts)
      .set({ isMain: false })
      .where(eq(posts.userId, session.user.id));
  }

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
      coverFit: payload.coverFit,
      coverZoom: payload.coverZoom,
      coverX: payload.coverX,
      coverY: payload.coverY,
      showToc: payload.showToc,
      isMain: payload.isMain,
      content: payload.content as never,
      contentHtml: payload.contentHtml,
      readingTime: readingTimeFromHtml(payload.contentHtml),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, payload.id));

  revalidatePath("/");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  await notifyFrontendRevalidation(slug);
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
  await notifyFrontendRevalidation(existing.slug);
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
  await notifyFrontendRevalidation(existing.slug);
}
