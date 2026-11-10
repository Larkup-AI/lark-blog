/**
 * Enterprise audit log.
 *
 * `recordAuditEvent` appends a non-sensitive record of an action to the
 * `audit_log` table. It is a NO-OP unless the EE `audit-log` feature is
 * licensed, so the MIT core carries no audit overhead and the call is safe to
 * sprinkle through core server actions.
 *
 * SECURITY: never pass secrets (API keys, passwords, tokens) in `metadata`.
 * Callers pass only ids, changed field names, and similar safe context.
 */
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, type AuditLog } from "@/lib/db/schema";
import { isEEEnabled } from "./license";

export type AuditEvent = {
  workspaceId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

/** Append an audit event. Silent no-op without the EE license. Never throws. */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  if (!isEEEnabled("audit-log")) return;
  try {
    await db.insert(auditLog).values({
      workspaceId: event.workspaceId ?? null,
      actorId: event.actorId ?? null,
      actorEmail: event.actorEmail ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId != null ? String(event.targetId) : null,
      metadata: (event.metadata ?? null) as never,
      ip: event.ip ?? null,
    });
  } catch (err) {
    // Auditing must never break the primary action.
    console.error("[audit] failed to record event", event.action, err);
  }
}

/** Read recent audit events for a workspace (EE). Newest first. */
export async function listAuditEvents(
  workspaceId: string,
  opts: { limit?: number; action?: string } = {},
): Promise<AuditLog[]> {
  if (!isEEEnabled("audit-log")) return [];
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const where = opts.action
    ? and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.action, opts.action))
    : eq(auditLog.workspaceId, workspaceId);
  return db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/** Distinct action names seen in a workspace (for the filter dropdown). */
export async function listAuditActions(workspaceId: string): Promise<string[]> {
  if (!isEEEnabled("audit-log")) return [];
  const rows = await db
    .selectDistinct({ action: auditLog.action })
    .from(auditLog)
    .where(eq(auditLog.workspaceId, workspaceId))
    .orderBy(auditLog.action);
  return rows.map((r) => r.action);
}
