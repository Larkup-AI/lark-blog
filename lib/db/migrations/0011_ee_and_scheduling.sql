-- Enterprise (EE) tables + scheduled auto-generation (cron).
-- Hand-written (drizzle-kit generate needs a TTY). Idempotent where possible.
-- Everything new is scoped by workspaceId.

/* ------------------------------- EE: RBAC -------------------------------- */

CREATE TABLE IF NOT EXISTS "role" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "isSystem" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Optional custom role per member (EE). Nullable → core is unaffected.
ALTER TABLE "workspace_member" ADD COLUMN IF NOT EXISTS "customRoleId" text;

/* -------------------------------- EE: SSO -------------------------------- */

CREATE TABLE IF NOT EXISTS "sso_connection" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "type" text NOT NULL,
  "label" text NOT NULL,
  "domain" text,
  "issuer" text,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

/* ------------------------------- EE: SCIM -------------------------------- */

CREATE TABLE IF NOT EXISTS "scim_token" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "name" text NOT NULL,
  "tokenHash" text NOT NULL,
  "lastUsedAt" timestamp,
  "createdBy" text,
  "expiresAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "scim_token_tokenHash_unique" UNIQUE("tokenHash")
);

/* ----------------------------- EE: Audit log ----------------------------- */

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" text,
  "actorId" text,
  "actorEmail" text,
  "action" text NOT NULL,
  "targetType" text,
  "targetId" text,
  "metadata" jsonb,
  "ip" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

/* --------------------- Scheduled auto-generation (cron) ------------------- */

CREATE TABLE IF NOT EXISTS "schedule" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "name" text NOT NULL,
  "cron" text NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "prompt" text NOT NULL,
  "topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "topicCursor" integer DEFAULT 0 NOT NULL,
  "model" text,
  "length" text DEFAULT 'medium' NOT NULL,
  "category" text,
  "autoPublish" boolean DEFAULT false NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "lastRunAt" timestamp with time zone,
  "nextRunAt" timestamp with time zone,
  "createdBy" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "job" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "scheduleId" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "log" text,
  "postId" integer,
  "startedAt" timestamp with time zone,
  "finishedAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

/* ------------------------------ Foreign keys ----------------------------- */

DO $$ BEGIN
  ALTER TABLE "role" ADD CONSTRAINT "role_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "sso_connection" ADD CONSTRAINT "sso_connection_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "scim_token" ADD CONSTRAINT "scim_token_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "schedule" ADD CONSTRAINT "schedule_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "job" ADD CONSTRAINT "job_scheduleId_schedule_id_fk"
    FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;

/* -------------------------------- Indexes -------------------------------- */

CREATE INDEX IF NOT EXISTS "role_workspace_idx" ON "role" ("workspaceId");
CREATE INDEX IF NOT EXISTS "sso_connection_workspace_idx" ON "sso_connection" ("workspaceId");
CREATE INDEX IF NOT EXISTS "sso_connection_domain_idx" ON "sso_connection" ("domain");
CREATE INDEX IF NOT EXISTS "scim_token_workspace_idx" ON "scim_token" ("workspaceId");
CREATE INDEX IF NOT EXISTS "audit_log_workspace_created_idx" ON "audit_log" ("workspaceId","createdAt");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "schedule_workspace_idx" ON "schedule" ("workspaceId");
CREATE INDEX IF NOT EXISTS "schedule_next_run_idx" ON "schedule" ("enabled","nextRunAt");
CREATE INDEX IF NOT EXISTS "job_workspace_idx" ON "job" ("workspaceId");
CREATE INDEX IF NOT EXISTS "job_schedule_idx" ON "job" ("scheduleId");
