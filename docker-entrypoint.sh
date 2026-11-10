#!/bin/sh
set -e

# Run database migrations before starting the server (idempotent).
if [ "${SKIP_MIGRATIONS}" != "true" ]; then
  echo "→ Running database migrations…"
  node ./scripts/migrate.js 2>/dev/null \
    || npx tsx ./scripts/migrate.ts 2>/dev/null \
    || echo "⚠ Could not run migrations automatically; run them manually."
fi

echo "→ Starting Lark Blog Studio on :${PORT:-3000}"
exec node server.js
