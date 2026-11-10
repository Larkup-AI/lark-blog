# Contributing to Lark Blog Studio

Thanks for your interest! This is an open-core project: the core is MIT, and the
`ee/` directory is commercially licensed (see `ee/LICENSE`).

## Development

```bash
pnpm install
cp .env.example .env     # set DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY
pnpm migrate
pnpm dev
```

- **Stack:** Next.js 16, React 19, Drizzle (Postgres), Better Auth, Tiptap, AI SDK v6.
- **Conventions:** TypeScript, server actions for mutations, adapter interfaces
  for anything pluggable (AI, storage, email).

## Adding a provider

- **AI:** add an entry to `AI_PROVIDERS` in `lib/ai/providers.ts`. Most vendors
  just need a `baseURL`; the OpenAI-compatible client handles the rest.
- **Storage:** implement `StorageAdapter` (`lib/providers/storage/types.ts`) and
  register it in `lib/providers/storage/index.ts`.
- **Email:** add a branch in `lib/providers/email/index.ts`.

## Pull requests

- Keep PRs focused (one feature/fix). Reference the relevant phase in
  `PRODUCT_PLAN.md` where applicable.
- Don't put core features behind the EE license, and don't move EE code into core.
- Run `pnpm build` before opening a PR.

## Reporting bugs

Open an issue with repro steps. For security issues, follow `SECURITY.md` instead.
