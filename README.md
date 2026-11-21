# QuickShipDeals

Boutique en ligne française (dropshipping) : boutique publique, comptes clients, paiement Stripe, back-office complet, worker de tâches de fond.

> **Règle du projet : aucune donnée inventée.** Pas de faux produits, prix, avis, commandes, suivis ou informations légales. Une intégration sans clé est affichée « non configuré » et sa fonctionnalité est désactivée, jamais simulée.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Framer Motion · Prisma 6 / PostgreSQL · Better Auth · Stripe Checkout + webhooks signés · Resend · Cloudflare R2 (API S3) · Redis + BullMQ · Vitest · Playwright · GitHub Actions.

## Démarrage rapide (développement)

```bash
cp .env.example .env              # puis renseigner BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d              # PostgreSQL 16 + Redis 7
npm install
npx prisma migrate deploy
npm run db:seed                   # rôles, transporteurs, pages brouillon (aucun produit)
npm run dev                       # http://localhost:3000
npm run worker                    # dans un 2e terminal (facultatif en dev)
```

Pour créer le premier administrateur : renseigner `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` dans `.env` puis relancer `npm run db:seed`. Le back-office est sur `/admin`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Site Next.js |
| `npm run worker` | Worker BullMQ (e-mails, fournisseurs, suivi, tâches planifiées) |
| `npm test` | Tests unitaires + intégration (base `qsd_test`) |
| `npm run db:test:prepare` | Applique les migrations sur la base de test |
| `npm run test:e2e` | Tests navigateur (build de production sur la base de test) |
| `npm run lint` | ESLint |

## Documentation

- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Configuration des services et clés](docs/configuration.md)
- [Déploiement](docs/deploiement.md)
- [Guide administrateur](docs/guide-admin.md)
- [API REST v1](docs/api.md)
- [Avant l'ouverture : points à valider](docs/avant-ouverture.md)
