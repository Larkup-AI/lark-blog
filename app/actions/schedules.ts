"use server";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { schedule, job, type Schedule } from "@/lib/db/schema";
import { getSession } from "@/lib/admin";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { can } from "@/ee/rbac";
import { isEEEnabled } from "@/ee/license";
import { isValidCron, nextRun, describeCron } from "@/lib/cron/schedule";
import { runSchedule } from "@/lib/cron/runner";
import { recordAuditEvent } from "@/ee/audit";

/** Core allows a single active schedule per workspace; EE unlocks many. */
const FREE_SCHEDULE_LIMIT = 1;

async function requireManage() {
  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" as const };
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: "No active workspace" as const };
  const allowed = await can(session.user.id, workspaceId, "schedules:manage");
  if (!allowed) return { error: "You don't have permission to manage schedules" as const };
  return { session, workspaceId };
}

export async function listSchedules(): Promise<{
  schedules: (Schedule & { preview: string })[];
  canAutoPublish: boolean;
  limitReached: boolean;
}> {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId)
    return { schedules: [], canAutoPublish: false, limitReached: false };

  const rows = await db
    .select()
    .from(schedule)
    .where(eq(schedule.workspaceId, workspaceId))
    .orderBy(desc(schedule.createdAt));

  const advanced = isEEEnabled("advanced-scheduling");
  return {
    schedules: rows.map((r) => ({
      ...r,
      preview: describeCron(r.cron, r.timezone),
    })),
    canAutoPublish: advanced,
    limitReached: !advanced && rows.length >= FREE_SCHEDULE_LIMIT,
  };
}

export type ScheduleInput = {
  name: string;
  cron: string;
  timezone: string;
  prompt: string;
  topics: string[];
  model?: string | null;
  length: string;
  category?: string | null;
  autoPublish: boolean;
  enabled: boolean;
};

export async function createSchedule(input: ScheduleInput) {
  const ctx = await requireManage();
  if ("error" in ctx) return { error: ctx.error };
  const { session, workspaceId } = ctx;

  if (!input.name?.trim()) return { error: "Name is required" };
  if (!input.prompt?.trim()) return { error: "A prompt / brief is required" };
  if (!isValidCron(input.cron)) return { error: "Invalid cron expression" };

  const advanced = isEEEnabled("advanced-scheduling");

  // Free-core guardrail on the number of schedules.
  if (!advanced) {
    const existing = await db
      .select({ id: schedule.id })
      .from(schedule)
      .where(eq(schedule.workspaceId, workspaceId));
    if (existing.length >= FREE_SCHEDULE_LIMIT) {
      return {
        error: `The free plan allows ${FREE_SCHEDULE_LIMIT} schedule. Upgrade for multiple schedules and auto-publish.`,
        upgrade: true,
      };
    }
  }

  const id = `sch_${randomUUID().replace(/-/g, "")}`;
  await db.insert(schedule).values({
    id,
    workspaceId,
    name: input.name.trim(),
    cron: input.cron.trim(),
    timezone: input.timezone || "UTC",
    prompt: input.prompt.trim(),
    topics: (input.topics ?? []).filter(Boolean) as never,
    model: input.model || null,
    length: input.length || "medium",
    category: input.category || null,
    // Auto-publish only takes effect with EE; ignore the flag otherwise.
    autoPublish: advanced ? !!input.autoPublish : false,
    enabled: !!input.enabled,
    nextRunAt: nextRun(input.cron, input.timezone || "UTC", new Date()),
    createdBy: session.user.id,
  });

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "schedule.create",
    targetType: "schedule",
    targetId: id,
    metadata: { name: input.name, cron: input.cron },
  });

  revalidatePath("/schedules");
  return { ok: true, id };
}

export async function updateSchedule(id: string, input: ScheduleInput) {
  const ctx = await requireManage();
  if ("error" in ctx) return { error: ctx.error };
  const { session, workspaceId } = ctx;

  if (!isValidCron(input.cron)) return { error: "Invalid cron expression" };
  const advanced = isEEEnabled("advanced-scheduling");

  await db
    .update(schedule)
    .set({
      name: input.name.trim(),
      cron: input.cron.trim(),
      timezone: input.timezone || "UTC",
      prompt: input.prompt.trim(),
      topics: (input.topics ?? []).filter(Boolean) as never,
      model: input.model || null,
      length: input.length || "medium",
      category: input.category || null,
      autoPublish: advanced ? !!input.autoPublish : false,
      enabled: !!input.enabled,
      nextRunAt: nextRun(input.cron, input.timezone || "UTC", new Date()),
      updatedAt: new Date(),
    })
    .where(and(eq(schedule.id, id), eq(schedule.workspaceId, workspaceId)));

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "schedule.update",
    targetType: "schedule",
    targetId: id,
  });

  revalidatePath("/schedules");
  return { ok: true };
}

export async function setScheduleEnabled(id: string, enabled: boolean) {
  const ctx = await requireManage();
  if ("error" in ctx) return { error: ctx.error };
  const { workspaceId } = ctx;

  const [row] = await db
    .select()
    .from(schedule)
    .where(and(eq(schedule.id, id), eq(schedule.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return { error: "Schedule not found" };

  await db
    .update(schedule)
    .set({
      enabled,
      nextRunAt: enabled ? nextRun(row.cron, row.timezone, new Date()) : row.nextRunAt,
      updatedAt: new Date(),
    })
    .where(and(eq(schedule.id, id), eq(schedule.workspaceId, workspaceId)));

  revalidatePath("/schedules");
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  const ctx = await requireManage();
  if ("error" in ctx) return { error: ctx.error };
  const { session, workspaceId } = ctx;

  await db
    .delete(schedule)
    .where(and(eq(schedule.id, id), eq(schedule.workspaceId, workspaceId)));

  await recordAuditEvent({
    workspaceId,
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "schedule.delete",
    targetType: "schedule",
    targetId: id,
  });

  revalidatePath("/schedules");
  return { ok: true };
}

/** Run a schedule immediately (manual trigger). */
export async function runScheduleNow(id: string) {
  const ctx = await requireManage();
  if ("error" in ctx) return { error: ctx.error };
  const { workspaceId } = ctx;

  const [row] = await db
    .select()
    .from(schedule)
    .where(and(eq(schedule.id, id), eq(schedule.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return { error: "Schedule not found" };

  const outcome = await runSchedule(row);
  revalidatePath("/schedules");
  if (outcome.status === "error") return { error: outcome.error };
  return { ok: true, postId: outcome.postId };
}

/** Recent generation jobs for the active workspace. */
export async function listRecentJobs(limit = 20) {
  const session = await getSession();
  const workspaceId = await getActiveWorkspaceId();
  if (!session?.user || !workspaceId) return [];
  return db
    .select()
    .from(job)
    .where(eq(job.workspaceId, workspaceId))
    .orderBy(desc(job.createdAt))
    .limit(limit);
}
