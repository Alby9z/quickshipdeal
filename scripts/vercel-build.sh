#!/usr/bin/env bash
# Build Vercel : génère Prisma, applique les migrations et le seed (production uniquement), puis build Next.js.
# L'intégration Neon fournit DATABASE_URL_UNPOOLED ; Prisma Migrate l'utilise via DIRECT_URL.
set -euo pipefail

# Base Europe (préfixe DATABASE_EU) prioritaire si elle est connectée.
if [ -n "${DATABASE_EU_URL:-}" ]; then
  export DATABASE_URL="$DATABASE_EU_URL"
  export DIRECT_URL="${DATABASE_EU_URL_UNPOOLED:-$DATABASE_EU_URL}"
else
  export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-}}"
fi

npx prisma generate

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${DATABASE_URL:-}" ] || [ -z "${DIRECT_URL:-}" ]; then
    echo "DATABASE_URL / DIRECT_URL manquants : base de données non configurée." >&2
    exit 1
  fi
  npx prisma migrate deploy
  npx tsx prisma/seed.ts
fi

npx next build
