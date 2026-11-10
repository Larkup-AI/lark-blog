import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscription, usageCounter, apiKey, posts } from "@/lib/db/schema";
import { deployment } from "@/lib/config";
import {
  getPlan,
  isUnlimited,
  type Plan,
  type PlanId,
  type UsageMetric,
} from "@/lib/plans";

/**
 * Usage metering + plan-limit enforcement. Everything here is a **no-op on
 * self-host** — limits only apply when `DEPLOYMENT_MODE=cloud`. The MIT core
 * never meters or gates.
 */

/** Current UTC billing period key, e.g. "2026-11". */
export function currentPeriod(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Resolve a workspace's active plan (free on self-host / no subscription). */
export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  if (!deployment.isCloud()) return getPlan("enterprise"); // self-host = unlimited
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.workspaceId, workspaceId));
  if (!sub) return getPlan("free");
  // Downgrade to free if the subscription lapsed.
  const active = sub.status === "active" || sub.status === "trialing";
  return getPlan(active ? sub.plan : "free");
}

/** Increment a monthly counter (metered metrics). Safe no-op on self-host. */
export async function incrementUsage(
  workspaceId: string,
  metric: UsageMetric,
  by = 1,
  period = currentPeriod(),
): Promise<void> {
  if (!deployment.isCloud() || !workspaceId) return;
  // Upsert on (workspaceId, metric, period).
  await db
    .insert(usageCounter)
    .values({
      id: randomUUID(),
      workspaceId,
      metric,
      period,
      value: by,
    })
    .onConflictDoNothing();
  await db
    .update(usageCounter)
    .set({ value: sql`${usageCounter.value} + ${by}`, updatedAt: new Date() })
    .where(
      and(
        eq(usageCounter.workspaceId, workspaceId),
        eq(usageCounter.metric, metric),
        eq(usageCounter.period, period),
      ),
    );
}

async function readCounter(
  workspaceId: string,
  metric: UsageMetric,
  period = currentPeriod(),
): Promise<number> {
  const [row] = await db
    .select({ value: usageCounter.value })
    .from(usageCounter)
    .where(
      and(
        eq(usageCounter.workspaceId, workspaceId),
        eq(usageCounter.metric, metric),
        eq(usageCounter.period, period),
      ),
    );
  return row?.value ?? 0;
}

/** Count posts the workspace currently holds (not period-based). */
async function countPosts(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId));
  return Number(row?.n ?? 0);
}

async function countApiKeys(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(apiKey)
    .where(and(eq(apiKey.workspaceId, workspaceId), sql`${apiKey.revokedAt} is null`));
  return Number(row?.n ?? 0);
}

export type LimitCheck = {
  allowed: boolean;
  limit: number;
  used: number;
  plan: PlanId;
  reason?: string;
};

/**
 * Check whether the workspace may consume one more of `metric`. Always allowed
 * on self-host. For metered metrics (`ai_tokens`) pass the amount you're about
 * to consume as `amount`.
 */
export async function checkLimit(
  workspaceId: string,
  metric: UsageMetric | "posts" | "api_keys",
  amount = 1,
): Promise<LimitCheck> {
  const plan = await getWorkspacePlan(workspaceId);
  const ok = (limit: number, used: number): LimitCheck => ({
    allowed: isUnlimited(limit) || used + amount <= limit,
    limit,
    used,
    plan: plan.id,
    reason:
      !isUnlimited(limit) && used + amount > limit
        ? `${metric} limit reached on the ${plan.name} plan (${limit}). Upgrade to continue.`
        : undefined,
  });

  if (!deployment.isCloud()) return { allowed: true, limit: -1, used: 0, plan: plan.id };

  switch (metric) {
    case "posts":
      return ok(plan.limits.posts, await countPosts(workspaceId));
    case "api_keys":
      return ok(plan.limits.apiKeys, await countApiKeys(workspaceId));
    case "ai_tokens":
      return ok(plan.limits.aiTokensPerMonth, await readCounter(workspaceId, "ai_tokens"));
    case "storage_bytes":
      return ok(plan.limits.storageBytes, await readCounter(workspaceId, "storage_bytes"));
    default:
      return { allowed: true, limit: -1, used: 0, plan: plan.id };
  }
}

/** Throw a user-facing error if the workspace is over the limit. */
export async function enforceLimit(
  workspaceId: string,
  metric: UsageMetric | "posts" | "api_keys",
  amount = 1,
): Promise<void> {
  const check = await checkLimit(workspaceId, metric, amount);
  if (!check.allowed) throw new Error(check.reason || "Plan limit reached.");
}

/** A snapshot of usage vs limits for the billing UI. */
export async function getUsageSummary(workspaceId: string) {
  const plan = await getWorkspacePlan(workspaceId);
  const [postsUsed, aiTokens, storageBytes, apiKeys] = await Promise.all([
    countPosts(workspaceId),
    readCounter(workspaceId, "ai_tokens"),
    readCounter(workspaceId, "storage_bytes"),
    countApiKeys(workspaceId),
  ]);
  return {
    plan: plan.id,
    planName: plan.name,
    period: currentPeriod(),
    metrics: {
      posts: { used: postsUsed, limit: plan.limits.posts },
      ai_tokens: { used: aiTokens, limit: plan.limits.aiTokensPerMonth },
      storage_bytes: { used: storageBytes, limit: plan.limits.storageBytes },
      api_keys: { used: apiKeys, limit: plan.limits.apiKeys },
    },
  };
}
