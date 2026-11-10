<div align="center">

# Lark Blog Studio

**The open-source, AI-native blog CMS.** Write with an AI agent, schedule posts,
and ship content to any site through a tiny SDK or a no-code embed.

Open core (MIT) · self-host or cloud · bring-your-own AI, storage, database and email.

</div>

---

## Why

Most "AI blog" tools lock you into one model, one database, one host. Lark is the
opposite: it's a real CMS you own, with **pluggable everything** and an editor
whose AI agent edits the document directly (not a chat box that spits out text).

| | Lark |
|---|---|
| **AI** | OpenAI · Anthropic · Google · xAI (Grok) · DeepSeek · Mistral · Groq · OpenRouter · Vercel AI Gateway · any OpenAI-compatible (Ollama, LM Studio, vLLM). Pick the provider **and** model in Settings. |
| **Database** | Any Postgres — Neon, Supabase, RDS, Railway, local Docker. |
| **Storage** | S3-compatible (AWS S3, Cloudflare R2, MinIO, B2, Spaces, Supabase, Tigris, **Neon Object Storage**), Vercel Blob, UploadThing, or local disk. |
| **Email** | Resend, SMTP, or **none** (invites become links, resets are logged). |
| **Editor** | Tiptap rich-text with an AI agent that writes section-by-section, **edits your current selection**, and can be **stopped mid-generation** (server-side abort). |
| **Delivery** | TypeScript SDK (`@larkup/blog-sdk`), REST API, or a no-code embed script. |

## Quick start (local)

```bash
git clone https://github.com/Larkup-AI/lark-blog
cd lark-blog
pnpm install
cp .env.example .env            # set DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY
pnpm migrate                    # apply database migrations
pnpm dev                        # http://localhost:3000
```

The first account you create becomes the owner. Configure your AI provider,
storage and email in **Settings** — all optional, all swappable later.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d            # app + Postgres + MinIO (S3) on :3000
```

## Deploy to Vercel

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (and optionally an AI
key) as environment variables, then deploy. Migrations run with `pnpm migrate`.

## Architecture

```
app/                 Next.js 16 app (studio UI + REST API under /api/v1)
components/          Editor, settings, blog rendering, UI kit
lib/
  config/            Branding + deployment config (env-driven, no hardcoded brand)
  ai/                Provider registry + model resolution + config resolver
  providers/
    storage/         S3 / Vercel Blob / UploadThing / local adapters
    email/           Resend / SMTP / none adapters
  crypto.ts          AES-256-GCM encryption for secrets at rest
  db/                Drizzle schema + migrations (Postgres)
ee/                  Enterprise features (separate commercial license)
packages/
  larkup-blog-sdk/   Client + React bindings (MIT)
docs/                Mintlify documentation site
```

## Pluggable providers

Everything is chosen at runtime (Settings) or via env — see
[`.env.example`](./.env.example) and [`docs/`](./docs). Adding a provider means
implementing one small adapter interface; the registry does the rest.

## Licensing

- **Core** (`app`, `components`, `lib`, `packages`) → **MIT**. Use it, fork it,
  ship it, sell your content with it.
- **Enterprise** (`ee/` — SSO, SCIM, custom roles, audit log, advanced
  scheduling) → **commercial license** (`ee/LICENSE`), unlocked with a key.

This is the open-core model (Langfuse / PostHog / Cal.com). The SDK is always MIT.
See [`DECISIONS.md`](./DECISIONS.md) for the full rationale and roadmap.

## Status

This repository is the distributable product, split from Larkup's internal
instance. The roadmap, decisions, and what's shipped vs scaffolded live in
[`DECISIONS.md`](./DECISIONS.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security issues: [`SECURITY.md`](./SECURITY.md).
