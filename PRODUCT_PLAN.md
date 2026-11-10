# Blog Studio — Product Plan (open-source + EE + Cloud)

> Status: draft for discussion · Created 2026-11-10
> This repo (`larkup-blog`) stays **Larkup's own instance**. The distributable product
> lives in a **new repo** created in Phase 0. Every phase below targets the new repo
> unless marked *(Larkup instance)*.

---

## 0. Where we are today (audit summary)

What exists:
- Next.js 16 + React 19, Drizzle + `pg` (Postgres), Better Auth (email/password), Resend email,
  UploadThing for images/videos, Tiptap editor, AI SDK v6 agent (`/api/write-agent`), analytics,
  teams/invites, `@larkup/blog-sdk` (client + React bindings), API `v1/blogs`.

Things that block distribution (must fix in the new repo):
| Problem | Where | Why it matters |
|---|---|---|
| Single-tenant data model: `posts.userId`, `settings.userId`, roles on `user` | `lib/db/schema.ts` | No workspaces → no teams/RBAC/cloud |
| Owner decided by `ADMIN_EMAIL` env | `lib/admin.ts` | Needs a first-run setup instead |
| Hardcoded `blog-studio.larkup.de`, logo, "Larkup" branding | `lib/auth.ts`, `app/page.tsx` | Must be config |
| AI keys stored **plaintext** (`vercelAiGatewayKey`, `customAiKey`) | schema | Must encrypt at rest |
| AI model hardcoded `google/gemini-2.5-pro` | `app/api/write-agent/route.ts` | Should be user-selected |
| One API key per user; the same key can read **drafts** (`?preview=true`), and the key is accepted in the query string | `app/api/v1/blogs/route.ts` | If the SDK runs in a browser, the key leaks and so do drafts → split publishable vs secret keys |
| `typescript.ignoreBuildErrors: true` | `next.config.mjs` | Ship-blocker for OSS |
| Storage locked to UploadThing, email locked to Resend | `app/api/uploadthing`, `app/actions/resend.ts` | Need adapters |
| `force-dynamic` + sequential awaits + `router.refresh()` after saves | `app/page.tsx`, `post-editor.tsx` | Main source of slowness |
| AI agent tools only **append** to the end of the doc | write-agent route | No way to edit a specific section, table, or image |

---

## Phase 0: Split the repo and set up the foundation

**0.1 Create the product repo** (decision: name, e.g. `blog-studio`, `larkup-studio`, something brandable)
- [ ] Copy this repo **with git history** (`git clone` → new remote), so the history stays.
- [ ] Strip Larkup-specific bits: domain, logo, `.vercel`, env values, Larkup copy.
- [ ] Introduce a `config`/branding layer (app name, logo, colors, base URL) via env + DB settings.

**0.2 How the Larkup instance relates to the product (important)**
- Recommended: Larkup becomes **a deployment of the product** (same code, Larkup config/branding,
  maybe a small `larkup` plugin folder). Bugs get fixed once.
- Avoid: a long-lived diverging fork. If you must fork, add the product repo as `upstream` and
  merge regularly. Keep Larkup changes in separate files so merges stay painless.
- [ ] Larkup keeps running on this repo until the product reaches parity, then switches over.

**0.3 Monorepo layout** (pnpm workspaces + Turborepo)
```
apps/
  studio/          # the Next.js app (MIT)
  docs/            # Mintlify docs
packages/
  sdk/             # @<scope>/blog-sdk (MIT)
  db/              # drizzle schema + migrations
  ai/              # provider registry + agent tools (shared by editor + cron)
  storage/         # storage adapters
  email/           # email adapters
ee/                # enterprise code, separate commercial LICENSE
```

**0.4 Hygiene**
- [x] Fix TS errors and drop `ignoreBuildErrors` (2026-11-10). Build runs the
      TypeScript checker and passes; `next.config.mjs` no longer sets the flag.
- [ ] Validate env with zod (`@t3-oss/env-nextjs`) so it fails fast with clear messages.
- [ ] Encrypt secrets at rest (AES-256-GCM with an `ENCRYPTION_KEY` env) for AI keys, storage creds, and SSO secrets.
- [ ] CI: typecheck, lint, unit tests, Playwright smoke test, Docker build.
- [ ] `LICENSE`, `ee/LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, changelog (changesets).

---

## Phase 1: Workspaces, setup wizard, optional email

Everything later (teams, RBAC, SSO, cloud, API keys) depends on this. Do it first.

> **Shipped 2026-11-10** (this phase is largely DONE — see notes). Implementation
> chose a **lightweight custom workspace layer** instead of swapping in the Better
> Auth organization plugin, to avoid ripping out the working custom `invitation`
> table / auth hooks and to keep the build stable. The org plugin remains a valid
> future refactor; the data model here (`workspace`, `workspace_member`,
> `workspaceId` on `posts`/`settings`/`invitation`) maps onto it cleanly.

**1.1 Multi-tenancy** — ✅ core done
- [x] Workspace data model: `workspace` + `workspace_member` tables (roles: owner/admin/member),
      migration `0010_add_workspaces_and_app_config.sql`. *(Custom layer, not the org plugin — see note above.)*
- [x] Added `workspaceId` to `posts`, `settings`, `invitation`. Posts are scoped to the active
      workspace (`lib/workspace.ts` + `postScope()` in `app/actions/posts.ts`).
- [x] Workspace switcher in the app shell (`components/workspace/workspace-switcher.tsx`) + a
      members/roles management page (`/workspaces`).
- [x] Data migration backfills a default workspace for existing installs and attaches all users/posts/settings.
- [ ] Still TODO: scope `post_views`, API keys and (future) `schedules` by workspace; make slug
      uniqueness `(workspaceId, slug)`; per-workspace `settings` row (currently per-user).

**1.2 First-run setup (replaces `ADMIN_EMAIL`)** — ✅ done
- [x] `/setup` wizard runs when no admin exists: test DB + run migrations, create the owner account
      and default workspace, then configure storage / email / AI. Locked to admins after the first owner exists.
      (`app/setup/*`, `app/actions/setup.ts`.)
- [ ] `DISABLE_SIGNUP` env for self-hosters (flag exists in `lib/config`; not yet enforced in auth).

**1.3 Email is optional**
- [ ] Email adapter interface: `resend | smtp (nodemailer) | none`.
- [ ] With `none`: invites become **copyable links**, password reset happens by owner/CLI
      (`pnpm studio reset-password`), and email verification is off.
- [ ] Optional OAuth logins (GitHub/Google) through Better Auth social providers.

---

## Phase 2: Pluggable infrastructure

**2.1 Database: "any Postgres", not "any SQL"** *(my recommendation, open for discussion)*
- Drizzle schemas are dialect-specific (`pgTable` vs `mysqlTable` vs `sqliteTable`), and you use
  `jsonb`, `serial`, and Postgres-only queries. Supporting MySQL and SQLite means 3 schemas and 3 migration
  sets, plus tripled testing, for little gain. Langfuse, Cal.com, and Plausible are all single-DB.
- [ ] Support **any Postgres URL**: Neon, Supabase, RDS, Railway, local Docker.
- [ ] Auto-pick the driver: `pg` by default, `@neondatabase/serverless` when the URL is Neon (edge/serverless friendly).
- [ ] Optional later: **PGlite** for zero-config local/dev ("try it without a DB").
- [ ] Run migrations automatically on container start (`migrate` step in the entrypoint).

**2.2 Object storage adapters** — ✅ mostly done
- [x] `StorageProvider` interface: `createUpload()` (presigned), `delete()`, `publicUrl()` (`lib/providers/storage`).
- [x] S3-compatible adapter (AWS S3, R2, MinIO, B2, DO Spaces, Supabase S3, Tigris, Neon Object Storage).
      Vercel Blob / UploadThing / local kept via their own hooks.
- [x] Browser uploads **straight to the bucket via a presigned URL** — editor wired through
      `/api/upload` + `lib/upload-client.ts`, falling back to UploadThing for non-presigned providers.
- [x] Configurable at runtime from the **setup wizard** (DB-backed `app_config`, creds encrypted),
      overriding env. Env remains the fallback. *(A dedicated Settings → Storage panel is still TODO; the wizard covers it for now.)*

**2.3 AI providers + model picker**
- [ ] Provider registry in `packages/ai` using AI SDK providers:
      OpenAI, Anthropic, Google, xAI (Grok), DeepSeek, Mistral, **Vercel AI Gateway**, **OpenRouter**,
      and OpenAI-compatible (Ollama, LM Studio, vLLM, custom URL).
- [ ] Settings → AI: add one or more providers (encrypted keys) and test the connection.
- [ ] **Model list**: fetch from each provider's `/models` endpoint (or the gateway's model list),
      cache it for about 24h, and merge with a curated default list (capabilities: tools, vision, image-gen).
- [ ] Choose models **per task**: `writer` (long-form), `editor` (fast inline edits), `image` (optional).
- [ ] Mark models without tool-calling and keep the existing markdown fallback for them.

---

## Phase 3: Speed and optimistic UX (quick wins first)

**3.1 Data/navigation (biggest impact, low effort)**
- [ ] `loading.tsx` skeletons for every route (only `/blogs/[id]` has one now).
- [ ] Run independent queries with `Promise.all` (e.g. `getPostCounts` + `getPaginatedPosts`).
- [ ] Better Auth `session.cookieCache` to skip a DB hit for the session on every request.
- [ ] Drop blanket `force-dynamic`. Use `revalidateTag` after mutations instead of `router.refresh()`.
- [ ] Prefetch the editor route on hover in the post list.
- [ ] Client data layer: **TanStack Query** (or React 19 `useOptimistic` + server actions) for
      lists/settings with optimistic mutations and rollback on error.

**3.2 Optimistic editor**
- [ ] Images: insert right away with a local `blob:` URL plus an "uploading" overlay. Swap in the real
      URL when the upload finishes, and show a retry button on failure. The same applies to the cover image.
- [ ] Debounced background autosave with a status indicator (Saved · Saving… · Offline).
      Don't block the UI or re-render the route.
- [ ] Publish/unpublish/delete: update the UI instantly and roll back if the request fails.

**3.3 UI refresh**
- [ ] App shell: sidebar (workspace switcher, Posts, Analytics, Schedules, Team, Settings).
- [ ] Design pass: tokens, backgrounds, empty states, polished settings sections.
- [ ] Do the visual redesign **after** 1.1 so the shell includes workspaces from the start.

---

## Phase 4: AI agent v2 (Notion-AI-like)

Today the tools run on the client and can only **append**. The goal is targeted, reviewable edits.

**4.1 Control**
- [ ] Stop button already exists on the client. Also pass `abortSignal: req.signal` to `streamText`
      so the server stops generating (and billing) too.
- [ ] Group each AI run into **one undo step**, so Cmd+Z reverts the whole run.
- [ ] Save chat history per post.

**4.2 Document awareness**
- [ ] Give every top-level block a stable ID (Tiptap `UniqueID` extension).
- [ ] Send the model a compact, block-ID-annotated outline. Add tools to read the full text of specific blocks
      (`readBlocks`) so large posts don't overflow the context.
- [ ] Send the current **selection** (block IDs + text) with each request.

**4.3 Targeted edit tools** (replace append-only tools)
- `replaceBlocks(ids, content)`, `insertAfter(id, content)`, `deleteBlocks(ids)`, `moveBlock`
- `rewriteSelection(instruction)`
- `updateTable(id, ops)`: add/remove rows/cols, set cells, sort
- `insertImage(afterId, {source: upload|url|generate|stock, alt, caption})`
- `insertChart`, `insertCallout`, `insertCode`, …, `setTitle/Category/Cover/SEO`
- Content in Markdown, converted to ProseMirror JSON in **shared code** (`packages/ai`),
  so the editor and the server-side cron (Phase 5) use the same tool implementations.

**4.4 Review UX**
- [ ] **Suggestion mode**: AI changes appear as a diff (green inserts, red deletions) with
      Accept / Reject per change and Accept all.
- [ ] Inline "Ask AI" in the bubble menu and `/ai` slash command, with quick actions: improve, shorten, expand,
      fix grammar, change tone, translate, summarize, make table, add image.
- [ ] Note: Tiptap sells a paid "AI Toolkit/Content AI" extension that does much of this. Building it
      ourselves keeps it MIT and provider-agnostic, but it takes more work. Decide before starting 4.3.

---

## Phase 5: Scheduled auto-generation (cron)

> **Shipped 2026-11-10** — migration `0011` (`schedule` + `job`). Basic scheduling
> is MIT core; advanced (multiple schedules + auto-publish) is EE-gated.

- [x] Tables: `schedule` (cron expr/presets, timezone, prompt/topic pool + round-robin
      cursor, model, length, category, **draft vs auto-publish**, enabled, lastRun/nextRun)
      and `job` (status, logs, resulting postId). Scoped by `workspaceId`.
- [x] One endpoint `/api/cron/tick` (protected by `CRON_SECRET`, fails closed) picks up due
      schedules and runs them.
  - Vercel: `vercel.json` cron calls it (sends `CRON_SECRET` as a Bearer token). Docker: a
    sidecar / system cron does the same `curl`.
  - Queue: **none** — a dependency-free Postgres poller (`nextRunAt <= now`), honouring the
    "Postgres-only, no new deps" rule. (pg-boss remains an option if throughput ever needs it.)
- [x] Generation runs server-side (`lib/ai/generate.ts`) reusing the AI provider registry, with
      a long `maxDuration` on the route. Markdown→Tiptap-JSON/HTML via `lib/markdown.ts` (no deps).
      (Optional research/image steps: future.)
- [x] Settings → Schedules UI (`/schedules`) with a human-readable preview ("Every Monday 09:00
      Europe/Berlin"), presets, topic rotation, enable/pause, **run now**, and a run history.
- [ ] Still TODO: notify on completion (email/webhook/Slack) and a dedicated "Review queue" view.

**Core or EE?** Decided: **basic scheduling in core** (1 schedule, drafts only). **Advanced**
(multiple schedules + auto-publish) is EE (`advanced-scheduling`). Cloud can limit usage by plan.

---

## Phase 6: Enterprise (`ee/`)

> **Shipped 2026-11-10** — migration `0011` adds `role`, `sso_connection`,
> `scim_token`, `audit_log` + `workspace_member.customRoleId`. All features are
> gated by `ee/license.ts` `isEEEnabled()`; the MIT core works without a key.
> Implemented as a **custom RBAC layer** (not the Better Auth org plugin) to stay
> consistent with the existing custom workspace layer (Phase 1).

- [x] **RBAC / custom roles / permissions** (`ee/rbac.ts`): a permission catalogue
      (`post:*`, `settings:*`, `members:*`, `schedules:*`, `apiKeys:manage`, `audit:read`,
      `sso:manage`, `scim:manage`, `roles:manage`) with a fixed-role mapping that always works;
      EE adds **custom roles** (create/edit/delete on `/enterprise`, attach via `customRoleId`).
      `can()` is enforced in the schedules actions; presets Editor/Writer/Viewer provided.
- [x] **SSO**: OIDC authorization-code flow with discovery (`ee/sso.ts`, `/api/sso/login` +
      `/api/sso/callback/[id]`), domain routing, JIT provisioning, session via `ee/session.ts`.
      SAML config storage present (assertion handler = future). (Not the `@better-auth/sso` plugin.)
- [x] **SCIM** user provisioning (`ee/scim.ts`, `/api/scim/v2/[...path]`): `/Users`
      list/create/get/deactivate, Bearer tokens stored hashed.
- [x] **Audit log** (`ee/audit.ts`): who did what, when; wired into posts, workspace membership,
      schedules and EE admin actions; viewer on `/enterprise`. (Export = future.)
- [x] **License key** scaffold: `LICENSE_KEY` env, `isEEEnabled(feature)` helper, and a graceful
      "upgrade" UI on `/enterprise` when no key is set. (Signature verification is still a TODO in
      `ee/license.ts` — currently decodes an unverified payload; replace with the bundled public key.)
- [ ] **Team management**: teams inside workspaces, per-team post ownership.
- [ ] Security: enforce 2FA, session policies, IP allowlist, data retention, API key scopes/expiry.
- [ ] Content workflows: review/approval before publish.

---

## Phase 7: Distribution and docs

**7.1 Self-host packaging**
- [ ] Dockerfile (Next.js standalone output), `docker-compose.yml` (studio + Postgres + MinIO).
- [ ] One-click deploy: Vercel button, Railway/Render templates.
- [ ] Versioned releases, GHCR images, upgrade notes, opt-out anonymous telemetry.

**7.2 Mintlify docs** (`apps/docs`)
```
Get started:  Introduction · Quickstart (Cloud) · Quickstart (Self-host)
Self-hosting: Docker · Vercel · Env vars · Database · Storage · Email · AI providers · Upgrading
Guides:       Writing with AI · Scheduling · Teams & roles · Custom domain · Webhooks
Integrate:    Next.js · React · Any site (embed) · WordPress/Webflow/Framer · REST API
Reference:    SDK reference · API reference (generated from OpenAPI)
Enterprise:   SSO · SCIM · Custom roles · Audit log · License
```
- [ ] Write an OpenAPI spec for `/api/v1/*` (generated from zod with `zod-openapi`) so Mintlify
      renders the API playground.

---

## Phase 8: Cloud (hosted SaaS)

- [ ] Same codebase, `DEPLOYMENT_MODE=cloud|selfhost`.
- [ ] Open signup, workspaces, managed S3 storage, plan limits, usage metering (posts, AI tokens,
      storage, API requests).
- [ ] Billing: Stripe (or Polar/Lemon Squeezy as merchant of record, which handles EU VAT for you).
- [x] API keys v2 (2026-11-10): multiple per workspace, **hashed** (SHA-256),
      revocable, `pk_` publishable (read published only, safe in the browser) vs
      `sk_` secret (drafts). Migration `0012` (`api_key` table), `lib/api-keys.ts`,
      Settings → **API keys** panel. Keys read from the `Authorization: Bearer` /
      `x-api-key` header only — **query-string keys removed**. Legacy single keys
      (`settings.apiKey`) keep working (treated as secret) until rotated.
      Still TODO: write scopes and per-key expiry.
- [ ] Rate limiting, CDN caching for public read endpoints, per-workspace webhooks on publish.
- [ ] Offer "bring your own AI key" on every plan to keep AI costs off your margin.

---

## Phase 9: SDK v2 and no-code

Order matters: non-technical users get the most value from options **A** and **B**.

- **A. Hosted blog (zero code, best SEO)**: render the blog for them at
  `blog.theirdomain.com` (CNAME, auto TLS) or `theirdomain.com/blog` (reverse-proxy snippets
  for Vercel/Netlify/Cloudflare). Themes, custom CSS, sitemap, RSS, OG images.
- **B. Embed script (works on Wix, Webflow, Framer, WordPress, Shopify)**:
  `<script src=".../embed.js" data-key="pk_...">` + `<div id="blog"></div>`. Easy, but weaker for SEO
  because it renders client-side. Document this tradeoff.
- **C. Platform plugins**: WordPress plugin, Webflow CMS sync, Framer plugin (later, demand-driven).
- **D. Developers**:
  - `npx create-blog` / `npx <cli> init`: detects Next.js and scaffolds `/blog` + `/blog/[slug]`
    with metadata, sitemap, and revalidation webhook.
  - `@scope/blog-next`: `<BlogIndex/>`, `<BlogPost/>`, `generateMetadata`, `sitemap()` helpers.
  - Headless theming via CSS variables, plus unstyled mode.
  - Later: Astro, Nuxt, SvelteKit adapters.
- [x] SDK must default to **publishable keys**. Remove key-in-query-string.
      (2026-11-10) — SDK sends the key in the `Authorization` header; the API no
      longer accepts `?key=`. Publishable `pk_` keys are the documented default.

---

## Phase 10: Testing (unit + integration) — last step before 1.0

No release is "done" until the critical paths are covered. Keep it Postgres-only
and runnable in CI with zero cloud/EE env set.

**10.1 Tooling**
- [ ] **Vitest** for unit tests (fast, native TS/ESM). Add `pnpm test` + `pnpm test:watch`.
- [ ] **Playwright** for end-to-end smoke tests against a built app + a disposable
      Postgres (Docker service in CI). Add `pnpm test:e2e`.
- [ ] Test DB helper: spin up Postgres, run migrations, truncate between tests.

**10.2 Unit tests (pure logic first — highest value, no DB)**
- [ ] `lib/api-keys.ts`: `generateKey` prefixes (`pk_`/`sk_`), `hashApiKey` stability,
      `readKeyFromRequest` (Authorization vs x-api-key, **ignores `?key=`**),
      and `resolveApiKey` permission mapping (publishable ⇒ no drafts; legacy ⇒ secret).
- [ ] `lib/crypto.ts`: encrypt→decrypt round-trip, `isEncrypted`, plaintext fallback.
- [ ] `lib/cron/schedule.ts`: cron parsing, next-run, timezone math, presets.
- [ ] `lib/markdown.ts`: Markdown → Tiptap-JSON/HTML conversion.
- [ ] `lib/ai/providers.ts`: provider registry + model-list merge/fallback.
- [ ] `ee/rbac.ts`: `can()` for fixed roles and custom roles (gated vs ungated).

**10.3 Integration tests (API + DB, no network)**
- [ ] `/api/v1/blogs*`: a `pk_` key returns only published posts and **cannot**
      read drafts via `?preview=true`; an `sk_` key can; a revoked key → 401;
      a legacy `settings.apiKey` still works; **no key in query string is accepted**.
- [ ] Workspace scoping: a key for workspace A never returns workspace B's posts.
- [ ] `/api/cron/tick`: rejects without `CRON_SECRET`, runs a due schedule when authorized.
- [ ] `/api/sso/*` and `/api/scim/*`: no-op/401 without a license key; happy path with one.
- [ ] Setup wizard action: first-run creates owner + default workspace; locked after.

**10.4 E2E smoke (Playwright)**
- [ ] First-run `/setup` → create owner → land on dashboard.
- [ ] Create a post, publish it, fetch it through the public API with a `pk_` key.
- [ ] Create + revoke an API key in Settings.

**10.5 CI gate**
- [ ] GitHub Actions: `typecheck → lint → unit → integration → e2e → docker build`,
      all green with **zero cloud/EE env**, required before merge to `main`.

---

## Licensing and business model

**Recommended: open core in the style of Langfuse/PostHog**
- `apps/*`, `packages/*` → **MIT**. The **SDK must be MIT/Apache** in any case so customers can embed it freely.
- `ee/` → **commercial license** (source-available; usable in dev/test, a license key is required in production).
- Revenue: **Cloud subscriptions** (main) + **self-host EE licenses** (enterprise).

Alternatives:
| Option | Pros | Cons | Used by |
|---|---|---|---|
| MIT core + `ee/` | Most adoption, simplest, easy for contributors | Someone can host your core as a competing SaaS | Langfuse, PostHog |
| AGPLv3 core + `ee/` | Blocks closed SaaS clones | Some companies ban AGPL, which slows adoption | Cal.com, Plausible |
| FSL (Fair Source) | Blocks competing use for 2 yrs, then becomes Apache/MIT | Not OSI "open source", some community friction | Sentry, Codecov |

My take: the bigger risk at your stage is **nobody finding the product**, not someone cloning it. Go MIT core + `ee/`.
If you'd rather be protected from clones, choose FSL for the studio and keep the SDK MIT.
*(Not legal advice. Have a lawyer review the EE license text and terms before selling.)*

**Starting price points (to validate):**
- Self-host core: free.
- Cloud Free: 1 workspace, limited posts, BYO AI key, "Powered by" badge.
- Cloud Pro (~$19–29/mo): custom domain, scheduling, no badge.
- Cloud Team (~$79–99/mo): seats, roles, analytics, multiple schedules.
- Enterprise (custom, annual): SSO/SCIM, custom roles, audit log, self-host EE license, SLA.

---

## Open decisions (need your call)

1. Product name and where the new repo lives (new org repo? `Larkup-AI/<name>`?).
2. License: MIT core + EE (recommended), or AGPL/FSL?
3. Database: any Postgres only (recommended), or truly multi-dialect?
4. Scheduling: basic in core (recommended), or fully EE?
5. Build or buy Tiptap's AI extension for Phase 4?
6. Order after Phase 3: **Cloud first** (revenue, hosted blog for non-technical users) or **self-host
   release first** (community, GitHub stars)? I suggest self-host + docs first, because it's cheaper to run and
   builds trust, with Cloud right after.

## Suggested execution order

`0 → 1 → 3.1 (quick perf wins) → 2 → 4 → 3.2/3.3 → 5 → 7 (public launch) → 6 → 8 → 9 → 10 (testing gate before 1.0)`

Each numbered item should be **one PR**. We work through them one at a time and tick the boxes here.
