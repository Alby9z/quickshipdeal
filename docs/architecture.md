# Architecture

## Vue d'ensemble

```
Navigateur ──► Next.js (Vercel)  ──► PostgreSQL (Neon / Supabase / Railway…)
                 │  Server Components, Server Actions, routes API
                 ├──► Stripe Checkout ──(webhook signé)──► /api/webhooks/stripe
                 ├──► Resend (e-mails) ──(webhook)──► /api/webhooks/resend
                 ├──► Cloudflare R2 (images, URL présignées)
                 └──► Redis ◄── Worker BullMQ (Railway / Render / Fly.io)
```

Monolithe modulaire : `src/modules/<domaine>` contient la logique métier, `src/actions` les Server Actions (contrôle de permission côté serveur via `adminAction`), `src/app` les pages, `src/integrations` les clients externes, `worker/` le processus de fond.

| Dossier | Contenu |
|---|---|
| `src/modules/catalog`, `products`, `pricing` | Catalogue, fiches, calcul des prix et marges |
| `src/modules/cart`, `checkout`, `payments` | Panier, réservation de stock, session Stripe, webhook |
| `src/modules/orders` | Machine à états, numérotation sans trou, factures et avoirs |
| `src/modules/suppliers` | Adaptateurs fournisseurs, import CSV, synchronisations |
| `src/modules/shipping` | Expéditions, événements de suivi |
| `src/modules/emails` | Modèles, journal, envoi idempotent |
| `src/modules/maintenance` | Tâches planifiées du worker |
| `src/modules/settings` | Réglages (entreprise, TVA, boutique) et liste de contrôle d'ouverture |

## Décisions clés

- **Argent** : toujours en centimes (`Int`), euros, TVA en points de base (2000 = 20 %). Contraintes SQL `CHECK` sur les montants. Les lignes de commande figent prix, coût et TVA.
- **Paiement** : une commande ne passe « payée » que par le webhook Stripe signé. Idempotence par `ProcessedWebhookEvent` (clé = id d'événement), clés d'idempotence Stripe, contrôle montant/devise. Les statuts payé/remboursé ne peuvent pas être posés à la main.
- **Stock** : réservé atomiquement au checkout, sorti au paiement, libéré à l'expiration (webhook ou tâche de rapprochement).
- **Commandes** : machine à états (`ORDER_TRANSITIONS`) ; chaque changement crée un `OrderEvent` et une entrée d'audit.
- **Factures** : numéros séquentiels sans trou (`Sequence`), instantanés vendeur/acheteur/lignes. Mention « TVA non applicable, art. 293 B du CGI » uniquement si le régime « franchise » est choisi.
- **Fournisseurs** : contrat `SupplierAdapter`. BigBuy / CJ sont des squelettes **non opérationnels** tant que les accès ne sont pas fournis et l'appel testé. Le mode manuel fonctionne toujours. Une hausse de prix d'achat ne modifie jamais le prix de vente sauf règle de marge automatique explicitement activée ; sinon une alerte est créée.
- **Suivi** : saisi à la main (transporteur + numéro + événements). 17TRACK / AfterShip non opérationnels tant que non configurés ; aucune étape n'est inventée.
- **E-mails** : journalisés (`EmailLog`, clé d'idempotence unique), envoyés par le worker avec tentatives, ou en direct sans Redis. Sans Resend : statut « non envoyé (non configuré) ». E-mails marketing seulement avec consentement.
- **Sécurité** : en-têtes CSP/HSTS, contrôle de permission serveur sur chaque action admin, rôles stockés en base, limitation de débit (Redis, repli mémoire), échappement JSON-LD, Markdown sans HTML brut, aucun secret côté client.

## Modèle de données

Voir `prisma/schema.prisma` (≈ 55 modèles) : utilisateurs/rôles/permissions, catalogue (produits, variantes, images, catégories, historique de prix, stock), fournisseurs (références, synchronisations), panier, commandes (lignes, événements, paiements, remboursements, factures), livraison (transporteurs, tarifs, expéditions, événements), promotions/coupons, avis (achat vérifié obligatoire), retours, support, e-mails, contenu (blog, pages, SEO), système (audit, notifications, réglages, webhooks traités).

## Worker

`worker/index.ts` consomme les files `emails`, `supplier-orders`, `supplier-sync`, `tracking-sync`, `maintenance` et planifie :

| Tâche | Fréquence |
|---|---|
| Publication des articles programmés | 5 min |
| Rapprochement des commandes impayées (interroge Stripe, libère le stock) | 30 min |
| Relance panier abandonné (si activée et consentement) | 1 h |
| Alertes stock faible | chaque jour 8 h |
| Synchronisation des fournisseurs API actifs | toutes les 6 h |
| Suivi automatique des colis (si un service est configuré) | 2 h |
