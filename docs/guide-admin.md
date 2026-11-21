# Guide administrateur

Back-office : `/admin`. Chaque membre de l'équipe a son propre compte ; les droits dépendent de son rôle (Administrateurs, Rôles et permissions).

## Avant d'ouvrir la boutique

Le tableau de bord affiche la **liste de contrôle d'ouverture** (TVA, médiateur, hébergeur, pages juridiques…). Voir aussi [avant-ouverture.md](avant-ouverture.md).

## Catalogue

1. **Catégories** : créer l'arborescence (nom, parent, ordre, SEO).
2. **Fournisseurs** : créer le fournisseur (type Manuel si pas d'API), délais réels de préparation et de transport, règle de marge éventuelle.
3. **Produits → Nouveau** : nom, SKU, descriptions, **photos réelles** avec texte alternatif, prix de vente TTC, prix d'achat HT (jamais affiché), TVA, stock, délais, poids, informations de sécurité (GPSR : personne responsable dans l'UE, avertissements). Un produit ne peut être publié sans image.
4. **Prix** : modification rapide, marge en direct ; chaque changement est historisé. Un prix barré doit correspondre au prix le plus bas pratiqué dans les 30 jours précédents.
5. **Stocks** : quantité, seuil d'alerte, disponibilité affichée. Le stock « réservé » correspond aux paiements en cours.
6. **Import CSV** (fiche fournisseur) puis lier chaque référence fournisseur au SKU boutique.

## Commandes

Une commande apparaît « payée » uniquement après confirmation Stripe. Sur la fiche commande :
1. **Commande fournisseur** : passer la commande chez le fournisseur, saisir la référence obtenue → statut « commande fournisseur transmise », e-mail client.
2. **Expédition** : transporteur + numéro de suivi réel → statut « expédiée », e-mail avec lien transporteur.
3. **Événements de suivi** : recopier les étapes indiquées par le transporteur (livré → statut « livrée » + e-mail).
4. **Remboursement** : montant + motif → envoyé à Stripe ; confirmé par webhook, avoir émis automatiquement.
5. **Notes internes** : visibles uniquement par l'équipe.

## Service client

- **Retours** : accepter (avec instructions et adresse de retour réelles), marquer reçu, rembourser.
- **Support** : répondre aux tickets (e-mail au client), changer le statut.
- **Avis** : seuls les acheteurs vérifiés peuvent écrire ; modérer sans écarter un avis au seul motif qu'il est négatif.
- **E-mails** : historique, statut réel, renvoi en cas d'échec ; personnalisation de l'objet et de l'introduction de chaque modèle.

## Marketing et contenu

Coupons (code, %, montant, livraison offerte, limites), promotions datées, blog (brouillon / programmé / publié), pages (les pages juridiques exigent une confirmation de relecture et l'absence de mentions [À COMPLÉTER] avant publication), vue SEO (métadonnées manquantes).

## Clients et RGPD

Fiche client : commandes, adresses, note interne, export JSON, blocage, anonymisation (les factures sont conservées pour les obligations comptables).

## Suivi

Statistiques (CA net, marge, panier moyen, meilleurs produits, pays), Paiements (avec derniers webhooks reçus), Livraisons (colis sans nouvelles depuis 7 jours), Journal d'audit.
