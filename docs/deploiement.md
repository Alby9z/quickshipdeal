# Déploiement

Trois environnements distincts, chacun avec **sa propre base, ses propres clés** : développement (local), préproduction (Vercel Preview + clés Stripe test), production.

## 1. Base PostgreSQL

Neon, Supabase ou Railway. Créer une base de production et une de préproduction.
- `DATABASE_URL` : URL avec pooling (pgbouncer) pour le site.
- `DIRECT_URL` : URL directe (migrations).

## 2. Site sur Vercel

1. Importer le dépôt GitHub dans Vercel (framework Next.js détecté).
2. Variables d'environnement (Production et Preview séparément) : toutes celles de `.env.example`, avec `APP_ENV=production` / `preview`, `NEXT_PUBLIC_SITE_URL` et `BETTER_AUTH_URL` = URL publique.
3. Commande de build : `npm run build` (génère le client Prisma).
4. Migrations : `npx prisma migrate deploy` avec `DIRECT_URL` de production, avant chaque déploiement qui modifie le schéma (ou étape dédiée en CI).
5. Premier lancement : `npm run db:seed` une seule fois sur la base de production avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, puis retirer ces deux variables.
6. Domaine : ajouter le domaine dans Vercel, configurer le DNS, HTTPS automatique.

## 3. Worker (hors Vercel)

Railway, Render ou Fly.io, à partir de `Dockerfile.worker`, avec les **mêmes variables** que le site (au minimum `DATABASE_URL`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`). Une seule instance suffit au départ.

## 4. Services externes

Configurer Stripe (webhook de production), Resend (domaine vérifié), R2 : voir [configuration.md](configuration.md).

## 5. Vérifications après déploiement

- `GET /api/health` → `{"status":"ok"}`
- Admin → Paramètres : toutes les intégrations nécessaires « configuré », liste de contrôle d'ouverture vide.
- Commande test en mode Stripe test (préproduction) : paiement, webhook reçu (Admin → Paiements), facture, e-mails « Délivré ».
- Remboursement test depuis la fiche commande.

## CI

`.github/workflows/ci.yml` : typecheck, lint, migrations, tests unitaires et d'intégration, build, E2E Playwright, audit des dépendances. Activer la protection de la branche `main` pour exiger le passage de la CI.
