-- Multi-provider AI configuration + default provider rename.
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "aiModel" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "aiApiKey" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "aiBaseUrl" text;
-- Existing installs used 'vercel' to mean the Vercel AI Gateway; keep that value
-- working. New default for fresh rows is 'gateway'.
ALTER TABLE "settings" ALTER COLUMN "aiProvider" SET DEFAULT 'gateway';
