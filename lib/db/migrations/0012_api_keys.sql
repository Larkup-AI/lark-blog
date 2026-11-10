-- API keys v2: workspace-scoped, hashed, publishable (pk_) vs secret (sk_).
-- Hand-written (drizzle-kit generate needs a TTY). Idempotent where possible.
-- Legacy single keys in settings.apiKey keep working until rotated (see
-- lib/api-keys.ts graceful fallback) — no destructive data migration here.

CREATE TABLE IF NOT EXISTS "api_key" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "userId" text NOT NULL,
  "name" text DEFAULT 'API key' NOT NULL,
  "type" text NOT NULL,
  "prefix" text NOT NULL,
  "keyHash" text NOT NULL,
  "lastFour" text NOT NULL,
  "createdByUserId" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "lastUsedAt" timestamp with time zone,
  "revokedAt" timestamp with time zone
);

DO $$ BEGIN
  ALTER TABLE "api_key"
    ADD CONSTRAINT "api_key_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "api_key" ADD CONSTRAINT "api_key_keyHash_unique" UNIQUE ("keyHash");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "api_key_workspace_idx" ON "api_key" ("workspaceId");
CREATE INDEX IF NOT EXISTS "api_key_hash_idx" ON "api_key" ("keyHash");
