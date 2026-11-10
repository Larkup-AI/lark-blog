-- Cloud SaaS: billing (subscription), usage metering (usage_counter) and custom
-- domains. Hand-written (drizzle-kit generate needs a TTY). All cloud-only —
-- self-host never writes these tables. Everything is scoped by workspaceId.

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "plan" text DEFAULT 'free' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "provider" text,
  "customerId" text,
  "subscriptionId" text,
  "priceId" text,
  "seats" integer DEFAULT 1 NOT NULL,
  "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
  "currentPeriodEnd" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "usage_counter" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "metric" text NOT NULL,
  "period" text NOT NULL,
  "value" integer DEFAULT 0 NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "custom_domain" (
  "id" text PRIMARY KEY NOT NULL,
  "workspaceId" text NOT NULL,
  "domain" text NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "verificationToken" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "verifiedAt" timestamp with time zone
);

DO $$ BEGIN
  ALTER TABLE "subscription" ADD CONSTRAINT "subscription_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "custom_domain" ADD CONSTRAINT "custom_domain_workspaceId_workspace_id_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "custom_domain" ADD CONSTRAINT "custom_domain_domain_unique" UNIQUE ("domain");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "subscription_workspace_idx" ON "subscription" ("workspaceId");
CREATE INDEX IF NOT EXISTS "subscription_customer_idx" ON "subscription" ("customerId");
CREATE INDEX IF NOT EXISTS "usage_counter_lookup_idx" ON "usage_counter" ("workspaceId","metric","period");
CREATE INDEX IF NOT EXISTS "custom_domain_workspace_idx" ON "custom_domain" ("workspaceId");
