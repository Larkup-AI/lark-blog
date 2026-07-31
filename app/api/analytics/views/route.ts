import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { postViews, posts } from "@/lib/db/schema";
import { getSession, isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ranges = new Set([7, 30, 90]);

function startOfRange(days: number) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeDaySeries(days: number, viewsByDay: Map<string, { views: number; visitors: number }>) {
  const start = startOfRange(days);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = dayKey(date);
    const value = viewsByDay.get(key) ?? { views: 0, visitors: 0 };
    return { date: key, ...value };
  });
}

export async function POST(request: NextRequest) {
  let payload: { postId?: unknown; visitorId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const postId = typeof payload.postId === "number" ? payload.postId : Number(payload.postId);
  const visitorId = typeof payload.visitorId === "string" ? payload.visitorId : "";
  if (!Number.isInteger(postId) || postId < 1 || !/^[a-zA-Z0-9-]{20,64}$/.test(visitorId)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.published, true)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.insert(postViews).values({ postId, visitorId });
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedDays = Number(request.nextUrl.searchParams.get("range") ?? "7");
  const days = ranges.has(requestedDays) ? requestedDays : 7;
  const requestedPostId = Number(request.nextUrl.searchParams.get("postId") ?? "0");
  const postId = Number.isInteger(requestedPostId) && requestedPostId > 0 ? requestedPostId : undefined;
  const start = startOfRange(days);
  const filters = [gte(postViews.viewedAt, start)];
  if (postId) filters.push(eq(postViews.postId, postId));

  const day = sql<string>`to_char(date_trunc('day', ${postViews.viewedAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;
  const visitors = sql<number>`count(distinct ${postViews.visitorId})`;
  const [totals] = await db
    .select({ views: count(postViews.id), visitors })
    .from(postViews)
    .where(and(...filters));
  const grouped = await db
    .select({ date: day, views: count(postViews.id), visitors })
    .from(postViews)
    .where(and(...filters))
    .groupBy(day)
    .orderBy(day);
  const topPosts = await db
    .select({ id: posts.id, title: posts.title, views: count(postViews.id), visitors })
    .from(postViews)
    .innerJoin(posts, eq(postViews.postId, posts.id))
    .where(and(...filters))
    .groupBy(posts.id, posts.title)
    .orderBy(sql`count(${postViews.id}) desc`)
    .limit(5);
  const availablePosts = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(posts.title);

  const viewsByDay = new Map(
    grouped.map((item) => [item.date, { views: Number(item.views), visitors: Number(item.visitors) }]),
  );
  return NextResponse.json({
    days,
    updatedAt: new Date().toISOString(),
    summary: { views: Number(totals?.views ?? 0), visitors: Number(totals?.visitors ?? 0) },
    series: makeDaySeries(days, viewsByDay),
    topPosts: topPosts.map((item) => ({ ...item, views: Number(item.views), visitors: Number(item.visitors) })),
    posts: availablePosts,
  });
}
