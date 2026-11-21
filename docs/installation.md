# Installation

## Prérequis

- Node.js 22, npm
- Docker (pour PostgreSQL 16 et Redis 7 en local) ou instances équivalentes

## Étapes

1. `cp .env.example .env`, puis :
   - `BETTER_AUTH_SECRET` : `openssl rand -base64 32`
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` : votre compte administrateur (mot de passe fort)
2. `docker compose up -d`
3. `npm install`
4. `npx prisma migrate deploy`
5. `npm run db:seed` : crée les rôles et permissions, les réglages (informations légales connues, TVA « non choisie »), les transporteurs usuels, les modèles d'e-mails et les pages en brouillon. **Aucun produit, aucune commande, aucun avis.**
6. `npm run dev` puis ouvrir http://localhost:3000 et http://localhost:3000/admin
7. Facultatif : `npm run worker` dans un second terminal.

## Base de test

```bash
createdb -h localhost -U qsd qsd_test   # ou via docker exec
npm run db:test:prepare
npm test
npm run build && npm run test:e2e
```

Les tests refusent de tourner sur une autre base que `qsd_test` et la vident avant chaque test.
