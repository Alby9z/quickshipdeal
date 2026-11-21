# API REST v1

Destinée aux intégrations externes (logistique, comptabilité). Lecture seule.

- Authentification : en-tête `Authorization: Bearer <API_V1_TOKEN>` (comparaison en temps constant). Sans `API_V1_TOKEN` configuré, l'API répond 503.
- Limite : 120 requêtes par minute et par IP (429 au-delà).
- Montants en **centimes**, devise EUR.

## GET /api/v1/products

Produits publiés.

| Paramètre | Description |
|---|---|
| `page` | 1 par défaut |
| `perPage` | 1 à 48, 24 par défaut |
| `q` | recherche texte |
| `category` | slug de catégorie |

Réponse : `{ data: [{ id, sku, slug, name, category, priceCents, compareAtCents, availability, image }], meta: { page, perPage, total, pages } }`

## GET /api/v1/orders

Commandes dont le paiement a été confirmé par Stripe (50 par page).

| Paramètre | Description |
|---|---|
| `page` | 1 par défaut |
| `status` | statut de commande (ex. `CONFIRMED`, `SHIPPED`) ; 400 si inconnu |
| `since` | date ISO, commandes créées depuis |

Réponse : `{ data: [{ number, status, paymentStatus, totalCents, currency, createdAt, paidAt, shippingAddress, items: [{ sku, productName, quantity, unitPriceCents, supplierReference, supplierOrderRef }], shipments: [{ carrierName, trackingNumber, status }] }], meta: { page, perPage, total } }`

## Autres routes

| Route | Rôle |
|---|---|
| `GET /api/health` | État du site et de la base (`{ status: "ok", db: "ok" }`) |
| `POST /api/webhooks/stripe` | Webhook Stripe (signature obligatoire) |
| `POST /api/webhooks/resend` | Webhook Resend (statut de délivrance) |
| `GET /api/compte/export` | Export RGPD des données du client connecté |
