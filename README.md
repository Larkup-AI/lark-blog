<div align="center">

# Lark Blog Studio

**The open-source, AI-native blog CMS you own.**
Write with an AI agent that edits the document directly, schedule posts, and ship
them to any site through a tiny SDK, a REST API, or a no-code embed.

Open core (MIT) · self-host or cloud · bring your own AI, database, storage and email.

</div>

---

## What it is

A real, self-hostable CMS for blogs — not a chat box that spits out text, and not
a tool that locks you into one model, one database, or one host. Everything is
**pluggable** and chosen at runtime, and the Tiptap editor's AI agent writes
section-by-section, edits your current selection, and can be stopped mid-generation.

| | Lark |
|---|---|
| **AI** | OpenAI · Anthropic · Google · xAI · DeepSeek · Mistral · Groq · OpenRouter · Vercel AI Gateway · any OpenAI-compatible (Ollama, LM Studio, vLLM). Pick provider **and** model in Settings. |
| **Database** | Any Postgres — Neon, Supabase, RDS, Railway, local Docker. |
| **Storage** | S3-compatible (S3, R2, MinIO, B2, Spaces, Supabase, Tigris, Neon), Vercel Blob, UploadThing, or local disk. |
| **Email** | Resend, SMTP, or none (invites become links, resets are logged). |
| **Delivery** | TypeScript SDK (`@larkup/blog-sdk`), REST API (`/api/v1`), or a no-code embed. |
| **Teams** | Workspaces, roles, invites. SSO/SCIM/custom roles/audit log via EE. |

## Quick start

```bash
git clone https://github.com/Larkup-AI/lark-blog
cd lark-blog
pnpm install

# Create .env with the three required vars (generate secrets: openssl rand -base64 32):
#   DATABASE_URL=postgresql://user:pass@localhost:5432/lark
#   BETTER_AUTH_SECRET=...
#   ENCRYPTION_KEY=...
pnpm migrate      # apply database migrations
pnpm dev          # http://localhost:3000 → open /setup
```

The `/setup` wizard creates the first owner + workspace and configures AI, storage
and email from the UI (stored encrypted in the DB). Everything is optional and
swappable later in **Settings**. Full env reference lives in `docs/`.

**Docker:** `docker compose up -d` brings up app + Postgres + MinIO on `:3000`.
**Vercel:** set the three env vars above and deploy; run `pnpm migrate` against the DB.

## Using your content elsewhere

Create a key in **Settings → API keys**:

- `pk_…` **publishable** — reads published posts only, safe in a browser/embed.
- `sk_…` **secret** — also reads drafts; keep it server-side.

```ts
import { LarkupBlogClient } from "@larkup/blog-sdk";

const blog = new LarkupBlogClient({
  apiKey: process.env.BLOG_PK_KEY!, // sent in the Authorization header
  studioUrl: "https://studio.example.com",
});
const posts = await blog.getPosts();
```

## Project layout

```
app/                 Next.js app (studio UI + REST API under /api/v1)
components/          Editor, settings, blog rendering, UI kit
lib/                 config · ai registry · storage/email adapters · crypto · db (Drizzle/Postgres)
ee/                  Enterprise features — separate commercial license
packages/sdk         @larkup/blog-sdk — client + React bindings (MIT)
docs/                Mintlify documentation site
```

## Licensing

- **Core** (`app`, `components`, `lib`, `packages`) → **MIT**.
- **Enterprise** (`ee/` — SSO, SCIM, custom roles, audit log, advanced scheduling)
  → commercial license (`ee/LICENSE`), unlocked with a key. The core runs fully
  without it.

Open-core model (Langfuse / PostHog / Cal.com); the SDK is always MIT. See
[`DECISIONS.md`](./DECISIONS.md) for the roadmap and what's shipped vs planned,
and [`CONTRIBUTING.md`](./CONTRIBUTING.md) / [`SECURITY.md`](./SECURITY.md) to help.
