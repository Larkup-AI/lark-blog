# Decisions & Roadmap

This file records the product decisions for distributing Lark Blog Studio, what
is **shipped** in this repo today, and what is **scaffolded / planned**. It is the
companion to `PRODUCT_PLAN.md` (the full multi-phase plan).

> Context: this repo (`lark-blog`, remote `Larkup-AI/lark-blog`) is the
> distributable product, copied from Larkup's internal instance (`larkup-blog`).
> Larkup will become a *configured deployment* of this product, not a fork.

---

## Locked-in decisions

| Decision | Choice | Rationale |
|---|---|---|
| **License** | MIT core + `ee/` commercial, unlocked by a license key | Open-core (Langfuse/PostHog/Cal.com). Maximises adoption; EE + Cloud are the revenue. SDK stays MIT so customers embed freely. |
| **Database** | Any **Postgres** (not multi-dialect SQL) | Drizzle schemas are dialect-specific; `jsonb`/`serial` are used throughout. One schema, one migration set. Neon/Supabase/RDS/Railway/Docker all work. |
| **Object storage** | S3-compatible adapter + Vercel Blob + UploadThing + local | One S3 adapter covers AWS, R2, MinIO, B2, Spaces, Supabase, Tigris **and Neon Object Storage** (now S3-compatible, GA 2026). |
| **Email** | Resend · SMTP · **none** | "none" keeps the app fully usable (invites as links, resets logged). No vendor lock-in. |
| **AI providers** | Registry over OpenAI-compatible + Vercel Gateway | OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Groq, OpenRouter, gateway, Ollama/LM Studio/custom — **zero per-vendor SDK packages**, because all expose an OpenAI-compatible surface. User picks provider *and* model in Settings. |
| **Cloud ↔ local** | Same codebase, `DEPLOYMENT_MODE` flag (Langfuse/Strapi model) | No magic "sync". Cloud is a hosted multi-tenant deployment; moving between instances is export/import. Simpler and honest. |
| **Secrets** | AES-256-GCM at rest (`ENCRYPTION_KEY`) | AI keys / storage creds were stored in plaintext; now encrypted, plaintext-migration-safe. |
| **Scheduling** | Basic cron in core, advanced in EE | Scheduling is a strong adoption driver; approval workflows / content calendars are the paid upsell. |
| **No-code** | Hosted blog + embed script, then CLI/React for devs | Non-technical users get a subdomain blog or an embed `<script>`; developers get the SDK. |

---

## Shipped in this repo (this pass)

- **Config/branding layer** (`lib/config`) — app name, logo, URLs, deployment
  mode are env-driven. No more hardcoded `larkup.de`, logo, or `ADMIN_EMAIL`-only owner.
- **AI provider registry** (`lib/ai/providers.ts`, `lib/ai/config.ts`) — 12
  providers + model lists (live `/models` with curated fallback).
- **Settings → AI** rebuilt: provider dropdown, model picker (with refresh),
  API key, base URL for local/custom. Keys **encrypted at rest** (`lib/crypto.ts`).
- **AI agent v2** (`app/api/write-agent`): provider-agnostic, **server-side stop**
  (`abortSignal`), and a **`replaceSelection`** tool so the agent edits the text
  you've selected instead of only appending.
- **Storage adapters** (`lib/providers/storage`): S3-compatible (presigned
  direct-to-bucket) + factory; UploadThing kept as default.
- **Email adapters** (`lib/providers/email`): Resend / SMTP / none.
- **Theme**: refined black/light palette (Payload-style neutral), `next-themes`
  wired, light/dark toggle in the header.
- **Perf**: dashboard queries parallelised; Better Auth session cookie cache.
- **Distribution**: MIT `LICENSE`, `ee/LICENSE` + `ee/license.ts` gate, `README`,
  `.env.example`, `Dockerfile` + `docker-compose.yml` (app + Postgres + MinIO),
  Mintlify `docs/` scaffold, `CONTRIBUTING`, `SECURITY`.

## Scaffolded / planned (not yet implemented)

These are designed and documented but intentionally **not** half-built, to keep
the app shippable. See `PRODUCT_PLAN.md` for the phased plan.

- **Workspaces & multi-tenancy** (Better Auth organization plugin) — prerequisite
  for teams/RBAC/cloud. Biggest next PR.
- **First-run `/setup` wizard** replacing `ADMIN_EMAIL`.
- **EE features**: RBAC/custom roles, SSO (SAML/OIDC), SCIM, audit log — the
  `ee/license.ts` gate exists; the features do not yet.
- **Cron auto-generation**: tables + `/api/cron/tick` worker + Settings UI.
- **Optimistic image upload** + full presigned S3 wire-up in the editor.
- **No-code**: hosted blog (custom domain) + embed script; SDK publishable vs
  secret API keys (`pk_`/`sk_`) and removing key-in-query-string.
- **Cloud**: billing, usage metering, plan limits.

## Known debt

- `next.config.mjs` still has `typescript.ignoreBuildErrors: true` — inherited
  loose `any` usage. Remove after a typing pass.
- Migration `0009` is hand-written (drizzle-kit `generate` needs a TTY for the
  rename/add prompt); a future `generate` may want a fresh snapshot baseline.
- SDK API key is still a single key readable via query string — split into
  publishable/secret before promoting browser use.
