# Configuration des services

Toutes les clés vont dans les **variables d'environnement** (fichier `.env` en local, réglages du projet Vercel et de l'hébergeur du worker en production). Jamais dans la base, le code ou le dépôt. L'état de chaque intégration est visible dans **Admin → Paramètres → Intégrations**.

## Stripe (obligatoire pour vendre)

1. Créer le compte Stripe au nom de l'entreprise, activer les paiements (vérification d'identité).
2. Développeurs → Clés API : copier `STRIPE_SECRET_KEY` (sk_live_… en production, sk_test_… en préproduction) et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Développeurs → Webhooks → Ajouter un endpoint : `https://VOTRE-DOMAINE/api/webhooks/stripe`, événements :
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, `refund.created`, `refund.updated`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`.
   Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
4. Activer les moyens de paiement souhaités (carte, Apple Pay, Google Pay) dans le tableau de bord Stripe.
5. Test local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Resend (e-mails)

1. Ajouter et vérifier votre domaine (enregistrements DNS SPF/DKIM fournis par Resend).
2. `RESEND_API_KEY`, `EMAIL_FROM="QuickShipDeals <commandes@votre-domaine.fr>"`, `EMAIL_REPLY_TO`.
3. Webhook Resend → `https://VOTRE-DOMAINE/api/webhooks/resend` (événements `email.delivered`, `email.bounced`, `email.failed`), secret dans `RESEND_WEBHOOK_SECRET`.

## Cloudflare R2 (images)

1. Créer un bucket, activer l'accès public (domaine personnalisé conseillé, ex. `images.votre-domaine.fr`).
2. Créer un jeton API R2 (lecture/écriture sur ce bucket).
3. `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL=https://images.votre-domaine.fr`.
4. Règle CORS du bucket : autoriser `PUT` depuis votre domaine.
5. Vérifier que le domaine des images est autorisé par la directive `img-src` de la CSP (`next.config.ts`).

## Redis

Redis géré (Upstash, Railway, Render…). `REDIS_URL=rediss://…`. Même valeur pour le site et le worker.

## Fournisseurs

- **Manuel** : toujours disponible. Les commandes payées apparaissent « à transmettre » ; vous passez la commande chez le fournisseur et saisissez sa référence.
- **Import CSV** : Admin → Fournisseurs → fiche → Import CSV (`sku;titre;prix_achat;stock;disponibilite`).
- **BigBuy / CJ Dropshipping** : clés `BIGBUY_API_KEY`, `CJ_API_EMAIL` + `CJ_API_KEY`. ⚠️ Les adaptateurs sont des squelettes : l'appel API doit être implémenté et testé avec votre compte (`src/integrations/suppliers/`), puis le drapeau `IMPLEMENTED` passé à `true`. D'ici là, ils restent « non configurés ».

## Suivi de colis

`TRACK17_API_KEY` ou `AFTERSHIP_API_KEY` : même remarque, adaptateurs à finaliser dans `src/integrations/tracking/index.ts`. En attendant, le suivi est saisi depuis la fiche commande.

## API REST et monitoring

- `API_V1_TOKEN` : `openssl rand -hex 32`, voir [api.md](api.md).
- `SENTRY_DSN` : facultatif. `LOG_LEVEL` : `info` en production.
