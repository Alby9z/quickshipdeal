/**
 * Pages de contenu initiales. Elles sont créées en BROUILLON et marquées « à valider » :
 * elles donnent la structure et les obligations à couvrir, mais ne constituent pas
 * des textes juridiques définitifs. Les éléments [À COMPLÉTER] doivent être renseignés
 * puis la page relue par un professionnel avant publication.
 */
export const SEED_PAGES: { key: string; title: string; slug: string; legal: boolean; content: string }[] = [
  {
    key: "about",
    title: "À propos",
    slug: "a-propos",
    legal: false,
    content: `## QuickShipDeals

QuickShipDeals est une boutique en ligne de vente à distance sur catalogue général, exploitée par une entreprise individuelle française.

[À COMPLÉTER : votre histoire, votre sélection de produits, vos engagements.]`,
  },
  {
    key: "faq",
    title: "Questions fréquentes",
    slug: "faq",
    legal: false,
    content: `## Commandes

### Comment suivre ma commande ?
Depuis votre espace client, rubrique « Mes commandes », ou via la page « Suivi de commande » avec votre numéro de commande et votre adresse e-mail.

### Quels moyens de paiement acceptez-vous ?
Le paiement est réalisé de manière sécurisée par Stripe : carte bancaire, et Apple Pay ou Google Pay lorsque votre appareil le permet. Nous ne conservons jamais vos données de carte.

## Livraison

### Quels sont les délais ?
Le délai estimé est indiqué sur chaque fiche produit et avant le paiement. [À COMPLÉTER selon vos fournisseurs.]

## Retours

### Puis-je retourner un article ?
Oui, vous disposez d'un délai légal de rétractation de 14 jours à compter de la réception. Voir notre politique de retour.`,
  },
  {
    key: "shipping",
    title: "Politique de livraison",
    slug: "politique-de-livraison",
    legal: true,
    content: `## Zones de livraison
[À COMPLÉTER : pays desservis.]

## Délais
Les délais de traitement et de livraison dépendent du produit et du fournisseur. Ils sont affichés sur la fiche produit et rappelés avant le paiement. [À COMPLÉTER : délais par fournisseur / zone.]

## Frais de livraison
Les frais sont calculés dans le panier selon le mode de livraison choisi, et affichés avant la validation de la commande.

## Suivi
Dès l'expédition, un numéro de suivi vous est communiqué par e-mail et dans votre espace client.

## Colis endommagé ou non reçu
[À COMPLÉTER : procédure et délai de signalement.]`,
  },
  {
    key: "returns",
    title: "Politique de retour et de remboursement",
    slug: "politique-de-retour",
    legal: true,
    content: `## Droit de rétractation
Conformément aux articles L221-18 et suivants du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la réception du bien pour exercer votre droit de rétractation, sans avoir à justifier de motif.

## Comment faire
Depuis votre espace client (« Demander un retour ») ou en nous contactant. Un formulaire type de rétractation est disponible dans les CGV.

## Frais de retour
[À COMPLÉTER : frais de retour à la charge du client ou du vendeur.]

## Adresse de retour
[À COMPLÉTER : l'adresse de retour vous est communiquée lors de l'acceptation du retour.]

## Remboursement
Le remboursement intervient au plus tard 14 jours après la rétractation, sur le moyen de paiement utilisé ; il peut être différé jusqu'à la récupération des biens ou la preuve de leur expédition.

## Garanties légales
Les garanties légales de conformité (articles L217-3 et suivants du Code de la consommation, 2 ans) et des vices cachés (articles 1641 et suivants du Code civil) s'appliquent.`,
  },
  {
    key: "terms",
    title: "Conditions générales de vente",
    slug: "cgv",
    legal: true,
    content: `> Document en cours de rédaction : à faire valider par un professionnel du droit avant l'ouverture commerciale.

## 1. Identité du vendeur
Voir les mentions légales.

## 2. Champ d'application
[À COMPLÉTER]

## 3. Produits
[À COMPLÉTER : caractéristiques essentielles, conformité, informations de sécurité.]

## 4. Prix
Les prix sont indiqués en euros, toutes taxes comprises le cas échéant. [À COMPLÉTER selon le régime de TVA : mention « TVA non applicable, art. 293 B du CGI » en cas de franchise.] Les frais de livraison sont indiqués avant la validation de la commande.

## 5. Commande
[À COMPLÉTER : étapes, acceptation des CGV, confirmation par e-mail.]

## 6. Paiement
Paiement sécurisé par Stripe. La commande est confirmée après validation du paiement.

## 7. Livraison
Voir la politique de livraison.

## 8. Droit de rétractation
[À COMPLÉTER : conditions, exceptions (article L221-28), formulaire type de rétractation.]

## 9. Garanties légales
[À COMPLÉTER : reproduction des articles exigés par le Code de la consommation.]

## 10. Réclamations et médiation
Toute réclamation peut être adressée au service client. En cas de litige, le consommateur peut recourir gratuitement au médiateur de la consommation : [À COMPLÉTER : nom et coordonnées du médiateur]. Plateforme européenne de règlement en ligne des litiges : à vérifier selon la réglementation en vigueur.

## 11. Données personnelles
Voir la politique de confidentialité.

## 12. Droit applicable
Droit français.`,
  },
  {
    key: "privacy",
    title: "Politique de confidentialité",
    slug: "politique-de-confidentialite",
    legal: true,
    content: `> Document en cours de rédaction : à faire valider avant l'ouverture commerciale.

## Responsable du traitement
Voir les mentions légales.

## Données collectées et finalités
- Gestion du compte client (base légale : contrat).
- Traitement des commandes, paiements, livraisons et retours (contrat, obligations légales).
- Facturation et comptabilité (obligation légale, conservation 10 ans).
- Newsletter, uniquement avec votre consentement (double confirmation).
- Sécurité du site et prévention de la fraude (intérêt légitime).

## Destinataires / sous-traitants
Stripe (paiement), Resend (e-mails), hébergeur du site et de la base de données, fournisseurs et transporteurs pour la livraison. [À COMPLÉTER : liste définitive et transferts hors UE.]

## Durées de conservation
[À COMPLÉTER]

## Vos droits
Accès, rectification, effacement, limitation, opposition, portabilité. Vous pouvez exporter vos données et demander la suppression de votre compte depuis votre espace client, ou nous contacter. Vous pouvez introduire une réclamation auprès de la CNIL.`,
  },
  {
    key: "cookies",
    title: "Politique de cookies",
    slug: "politique-de-cookies",
    legal: true,
    content: `## Cookies strictement nécessaires
Session de connexion, panier, préférence de consentement. Ils ne nécessitent pas de consentement.

## Cookies de mesure d'audience et marketing
Aucun n'est déposé sans votre consentement préalable. [À COMPLÉTER si des outils de mesure sont ajoutés.]

## Gérer vos choix
Vous pouvez modifier vos choix à tout moment via le lien « Gérer les cookies » en bas de page.`,
  },
];
