-- Workspaces / multi-tenancy + runtime app_config (setup wizard).
-- Hand-written (drizzle-kit generate needs a TTY). Idempotent where possible.

CREATE TABLE IF NOT EXISTS "workspace" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo" text,
  "createdBy" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "workspace_member" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_config" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "storageProvider" text,
  "storageConfig" jsonb,
  "emailProvider" text,
  "emailConfig" jsonb,
  "aiProvider" text,
  "aiConfig" jsonb,
  "setupCompletedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- New nullable columns (non-breaking).
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "workspaceId" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "workspaceId" text;
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "workspaceId" text;

-- Foreign keys (guarded so re-runs don't error).
DO $$ BEGIN
  ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_userId_user_id_fk"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "workspace_slug_idx" ON "workspace" ("slug");
CREATE INDEX IF NOT EXISTS "workspace_member_workspace_idx" ON "workspace_member" ("workspaceId");
CREATE INDEX IF NOT EXISTS "workspace_member_user_idx" ON "workspace_member" ("userId");
CREATE INDEX IF NOT EXISTS "workspace_member_unique_idx" ON "workspace_member" ("workspaceId","userId");

-- Backfill: create a single default workspace and attach existing data + users.
-- Only runs when there is at least one user and no workspace yet.
DO $$
DECLARE
  ws_id text := 'ws_default_0000000000';
  owner_id text;
BEGIN
  IF (SELECT count(*) FROM "workspace") = 0
     AND (SELECT count(*) FROM "user") > 0 THEN

    SELECT "id" INTO owner_id FROM "user"
      ORDER BY ("role" = 'full_admin') DESC, "createdAt" ASC
      LIMIT 1;

    INSERT INTO "workspace" ("id","name","slug","createdBy")
      VALUES (ws_id, 'Default workspace', 'default', owner_id);

    -- Everyone becomes a member; the chosen owner gets 'owner', rest 'member'.
    INSERT INTO "workspace_member" ("id","workspaceId","userId","role")
      SELECT 'wm_' || "id", ws_id, "id",
             CASE WHEN "id" = owner_id THEN 'owner'
                  WHEN "role" IN ('full_admin','admin') THEN 'admin'
                  ELSE 'member' END
      FROM "user";

    UPDATE "posts" SET "workspaceId" = ws_id WHERE "workspaceId" IS NULL;
    UPDATE "settings" SET "workspaceId" = ws_id WHERE "workspaceId" IS NULL;
  END IF;
END $$;
