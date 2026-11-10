# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities. Instead,
email the maintainers (see the repository owner's profile) with:

- a description of the issue and its impact,
- steps to reproduce,
- any suggested remediation.

We aim to acknowledge reports within 72 hours.

## Handling of secrets

- Provider API keys, storage credentials and SMTP passwords are **encrypted at
  rest** with AES-256-GCM (`lib/crypto.ts`). Set a dedicated `ENCRYPTION_KEY` in
  production (`openssl rand -base64 32`).
- Secrets are never logged. The email "none" provider logs reset *links* (not
  credentials) so operators can relay them when no mail transport is configured.
- The studio API key grants read access to your posts. Treat it as a secret and
  rotate it from Settings if exposed. (A publishable/secret key split is on the
  roadmap — see `DECISIONS.md`.)

## Supported versions

Until a 1.0 release, only the latest `main` is supported with security fixes.
