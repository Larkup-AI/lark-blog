/**
 * Cron runner: executes a single schedule (generate → create post → record a
 * job row) and the "tick" that finds and runs all due schedules.
 *
 * This is a Postgres-only worker — no external queue (pg-boss/Redis). The
 * `/api/cron/tick` endpoint (called by Vercel Cron, a Docker sidecar, or system
 * cron) drives it. A lightweight `nextRunAt <= now` guard plus per-run job rows
 * keep it idempotent enough for the common single-worker deployment.
 */
import { randomUUID } from "crypto";
import { and, asc, eq, lte, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { job, posts, schedule, workspaceMember, type Schedule } from "@/lib/db/schema";
import { generateArticle } from "@/lib/ai/generate";
import { nextRun } from "@/lib/cron/schedule";
import { isEEEnabled } from "@/ee/license";
import { recordAuditEvent } from "@/ee/audit";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "") || "untitled"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  while (true) {
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

function readingTimeFromHtml(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Pick the author for generated posts: the schedule creator, else the owner. */
async function resolveAuthor(s: Schedule): Promise<string | null> {
  if (s.createdBy) return s.createdBy;
  const [owner] = await db
    .select({ userId: workspaceMember.userId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, s.workspaceId),
        eq(workspaceMember.role, "owner"),
      ),
    )
    .limit(1);
  return owner?.userId ?? null;
}

export type RunOutcome = {
  jobId: string;
  status: "success" | "error";
  postId?: number;
  error?: string;
};

/** Run one schedule now. Always records a job row; never throws. */
export async function runSchedule(s: Schedule): Promise<RunOutcome> {
  const jobId = `job_${randomUUID().replace(/-/g, "")}`;
  await db.insert(job).values({
    id: jobId,
    workspaceId: s.workspaceId,
    scheduleId: s.id,
    status: "running",
    startedAt: new Date(),
  });

  try {
    // Round-robin topic selection from the pool.
    const topics = (s.topics as string[] | null) ?? [];
    const topic =
      topics.length > 0 ? topics[s.topicCursor % topics.length] : null;

    const result = await generateArticle({
      workspaceId: s.workspaceId,
      prompt: s.prompt,
      topic,
      length: s.length,
      category: s.category,
      preferUserId: s.createdBy,
    });

    const authorId = await resolveAuthor(s);
    if (!authorId) throw new Error("No author found for the workspace.");

    // Auto-publish is an advanced (EE) capability; core always creates drafts.
    const publish = s.autoPublish && isEEEnabled("advanced-scheduling");

    const slug = await uniqueSlug(result.title);
    const [row] = await db
      .insert(posts)
      .values({
        userId: authorId,
        workspaceId: s.workspaceId,
        title: result.title || "Untitled",
        slug,
        content: result.content as never,
        contentHtml: result.contentHtml,
        category: result.category,
        authorName: "AI Scheduler",
        published: publish,
        publishedAt: publish ? new Date() : null,
        readingTime: readingTimeFromHtml(result.contentHtml),
      })
      .returning({ id: posts.id });

    // Advance schedule bookkeeping: cursor, lastRun, nextRun.
    const next = nextRun(s.cron, s.timezone, new Date());
    await db
      .update(schedule)
      .set({
        lastRunAt: new Date(),
        nextRunAt: next,
        topicCursor: topics.length > 0 ? (s.topicCursor + 1) % topics.length : 0,
        updatedAt: new Date(),
      })
      .where(eq(schedule.id, s.id));

    await db
      .update(job)
      .set({
        status: "success",
        postId: row.id,
        finishedAt: new Date(),
        log: `Generated "${result.title}" (${result.modelId}) as ${
          publish ? "published post" : "draft"
        }.`,
      })
      .where(eq(job.id, jobId));

    await recordAuditEvent({
      workspaceId: s.workspaceId,
      actorId: null,
      actorEmail: "cron@scheduler",
      action: "schedule.run",
      targetType: "post",
      targetId: String(row.id),
      metadata: { scheduleId: s.id, published: publish, model: result.modelId },
    });

    return { jobId, status: "success", postId: row.id };
  } catch (err: any) {
    const message = err?.message || String(err);
    // Still advance nextRunAt so one failure doesn't wedge the schedule.
    const next = nextRun(s.cron, s.timezone, new Date());
    await db
      .update(schedule)
      .set({ lastRunAt: new Date(), nextRunAt: next, updatedAt: new Date() })
      .where(eq(schedule.id, s.id))
      .catch(() => {});
    await db
      .update(job)
      .set({ status: "error", finishedAt: new Date(), log: message })
      .where(eq(job.id, jobId))
      .catch(() => {});
    return { jobId, status: "error", error: message };
  }
}

/**
 * Find all enabled schedules whose nextRunAt is due (or unset) and run them.
 * Returns a summary. `limit` caps how many run in one tick.
 */
export async function tick(limit = 10): Promise<{
  ran: number;
  results: RunOutcome[];
}> {
  const now = new Date();
  const due = await db
    .select()
    .from(schedule)
    .where(
      and(
        eq(schedule.enabled, true),
        or(isNull(schedule.nextRunAt), lte(schedule.nextRunAt, now)),
      ),
    )
    .orderBy(asc(schedule.nextRunAt))
    .limit(limit);

  const results: RunOutcome[] = [];
  for (const s of due) {
    // A freshly created schedule may have a null nextRunAt; if it's null we run
    // it once immediately and then schedule forward.
    results.push(await runSchedule(s));
  }
  return { ran: results.length, results };
}
