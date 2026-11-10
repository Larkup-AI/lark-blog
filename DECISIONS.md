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
- **Workspaces / multi-tenancy** (2026-11-10): `workspace` + `workspace_member`
  tables (owner/admin/member), `workspaceId` on `posts`/`settings`/`invitation`,
  active-workspace cookie + switcher, `/workspaces` members page, invite-to-workspace
  (existing user added directly; otherwise invite link/email), migration `0010`
  with a default-workspace backfill. **Custom layer, not the Better Auth org plugin**
  (kept the existing invite/auth working; org plugin is a future refactor).
- **First-run `/setup` wizard** (2026-11-10): tests DB + runs migrations, creates
  the first admin + default workspace, configures **storage / email / AI** providers
  at runtime (DB `app_config`, secrets encrypted) overriding env. `app/setup/*`,
  `app/actions/setup.ts`, `lib/app-config.ts`.
- **Presigned S3 upload wired into the editor** (2026-11-10): `/api/upload` +
  `lib/upload-client.ts`, with UploadThing fallback for non-presigned providers.
- **EE features (Phase 6)** (2026-11-10): migration `0011` adds `role`,
  `sso_connection`, `scim_token`, `audit_log` + a `workspace_member.customRoleId`
  column, all scoped by `workspaceId`.
  - **RBAC / custom roles** (`ee/rbac.ts`): a permission catalogue + fixed-role
    mapping (owner/admin/member) that ALWAYS works; `isEEEnabled("custom-roles")`
    additionally lets a workspace define custom roles and attach them to members.
    `can(user, workspace, permission)` is enforced in the schedules actions.
  - **SSO (OIDC)** (`ee/sso.ts`, `/api/sso/login` + `/api/sso/callback/[id]`):
    full authorization-code flow with discovery; provisions the user and
    establishes a Better Auth session (`ee/session.ts` reproduces Better Auth's
    signed-cookie format). SAML connection storage exists; OIDC is the wired path.
  - **SCIM 2.0** (`ee/scim.ts`, `/api/scim/v2/[...path]`): Bearer-token `/Users`
    list/create/get/deactivate for IdP provisioning. Tokens stored as SHA-256 hashes.
  - **Audit log** (`ee/audit.ts`): `recordAuditEvent()` (no-op without the license)
    wired into post publish/delete, workspace role/member changes, schedules and
    EE admin actions. Secrets are never recorded.
  - All EE tables exist in the single migration set; features are gated at runtime
    so the MIT core runs fully without a `LICENSE_KEY`.
- **Cron scheduled auto-generation (Phase 5)** (2026-11-10): migration `0011`
  adds `schedule` + `job`. `/api/cron/tick` (protected by `CRON_SECRET`, fails
  closed) runs due schedules via a Postgres-only poller — **no pg-boss/Redis**.
  Generation reuses the AI provider registry (`lib/ai/generate.ts`) and a
  dependency-free Markdown→Tiptap-JSON/HTML converter (`lib/markdown.ts`); cron
  parsing/next-run/timezone in `lib/cron/schedule.ts`. Settings → **Schedules**
  UI (`/schedules`) with presets, topic rotation, run-now and a run history.
  Basic scheduling is MIT core (1 schedule, drafts only); **advanced scheduling**
  (multiple schedules + auto-publish) is EE-gated. `vercel.json` cron added.

- **API keys v2 + strict build (2026-11-10)**: migration `0012` adds `api_key`
  (workspace-scoped, SHA-256 hashed, `pk_` publishable vs `sk_` secret, revocable).
  `lib/api-keys.ts` resolves a key from the `Authorization: Bearer` / `x-api-key`
  header — **query-string `?key=` is no longer accepted** (the old leak). Publishable
  keys can only read published posts; secret keys can read drafts. Legacy
  `settings.apiKey` values keep working (treated as secret) until rotated. New
  Settings → **API keys** panel (`components/settings/api-keys-panel.tsx`,
  `app/actions/api-keys.ts`); the SDK sends the key in the `Authorization` header.
  Separately, the TypeScript typing pass is done: `next.config.mjs` no longer sets
  `typescript.ignoreBuildErrors`, and `pnpm build` runs the checker and passes.
- **Testing plan (Phase 10)** added to `PRODUCT_PLAN.md` as the last step before
  1.0: Vitest unit tests, Postgres-backed integration tests, Playwright E2E smoke,
  and a CI gate — all runnable with zero cloud/EE env. (Not yet implemented.)

## Scaffolded / planned (not yet implemented)

These are designed and documented but intentionally **not** half-built, to keep
the app shippable. See `PRODUCT_PLAN.md` for the phased plan.

- **SAML assertion handling**: `sso_connection` stores SAML configs, but the
  assertion consumer is a stub — OIDC is the wired SSO path for now.
- **Custom-role assignment UI on the members page**: the `assignMemberRole`
  action + `customRoleId` exist; the `/workspaces` members UI still edits only
  the fixed role. (Roles are created/managed on `/enterprise`.)
- **Optimistic image upload** (the presigned path now exists; optimistic UX is next).
- **Workspace scoping of `post_views` / API keys**; `(workspaceId, slug)` uniqueness;
  per-workspace `settings` row; a dedicated Settings → Storage/Email panel
  (the setup wizard covers provider config today).
- **No-code**: hosted blog (custom domain) + embed script; SDK publishable vs
  secret API keys (`pk_`/`sk_`) and removing key-in-query-string.
- **Cloud**: billing, usage metering, plan limits.

## Known debt

- Migration `0009` is hand-written (drizzle-kit `generate` needs a TTY for the
  rename/add prompt); a future `generate` may want a fresh snapshot baseline.
- Migrations `0010`–`0012` are hand-written too, for the same reason.
- API keys v2 cover read access (`pk_`/`sk_`); **write scopes and per-key expiry**
  are still TODO (see `PRODUCT_PLAN.md` Phase 8).
- No automated tests yet — `PRODUCT_PLAN.md` Phase 10 is the plan to add them.
