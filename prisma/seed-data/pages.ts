/**
 * Pages de contenu. Les pages juridiques (CGV, confidentialité, cookies, livraison, retours) sont rédigées
 * et publiées. Les balises {{...}} sont remplacées à l'affichage par les Réglages (admin → Réglages) :
 * aucune information légale n'est écrite en dur ; un réglage vide s'affiche « [à compléter] ».
 * Voir src/modules/settings/legal-tokens.ts pour la liste des balises.
 */
export const SEED_PAGES: { key: string; title: string; slug: string; legal: boolean; publish?: boolean; content: string }[] = [
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
    key: "terms",
    title: "Conditions générales de vente",
    slug: "cgv",
    legal: true,
    publish: true,
    content: `*Version en vigueur au 22 novembre 2026.*

## Article 1 — Identification du vendeur
Le site {{nom_commercial}} est exploité par :

- **{{exploitant}}**, {{forme}}, exerçant sous le nom commercial {{nom_commercial}} ;
- SIREN : {{siren}} — SIRET : {{siret}} — {{rcs}} ;
- Siège (inscrit au registre) : {{siege}} ;
- Adresse de correspondance : {{adresse}} ;
- E-mail : {{email}} — Téléphone : {{telephone}} ;
- TVA : {{mention_tva}}.

Ci-après « le Vendeur ».

## Article 2 — Champ d'application
Les présentes conditions générales de vente (CGV) s'appliquent à toutes les ventes de produits conclues à distance sur le site {{nom_commercial}} entre le Vendeur et toute personne physique agissant à des fins qui n'entrent pas dans le cadre de son activité commerciale, industrielle, artisanale, libérale ou agricole (« le Client » ou « le consommateur »).

Le Client déclare avoir la capacité juridique de contracter. Les CGV sont accessibles à tout moment sur le site et peuvent être enregistrées ou imprimées. Le Client les accepte en cochant la case prévue avant de valider sa commande. Les CGV applicables sont celles en vigueur à la date de la commande.

## Article 3 — Produits
Les produits proposés sont ceux présentés sur le site au jour de la consultation, dans la limite des stocks disponibles chez le Vendeur ou ses fournisseurs. Leurs caractéristiques essentielles (description, photos, dimensions, composition, consignes de sécurité le cas échéant) figurent sur chaque fiche produit, conformément à l'article L111-1 du Code de la consommation.

Les produits sont expédiés directement depuis les entrepôts des fournisseurs partenaires du Vendeur. Le pays d'expédition et le délai estimé de livraison sont indiqués sur la fiche produit et rappelés avant le paiement.

Les photographies sont aussi fidèles que possible ; de légères différences de couleur dues à l'affichage de l'écran peuvent exister.

## Article 4 — Prix
Les prix sont indiqués en euros, toutes taxes comprises le cas échéant ({{mention_tva}}), hors frais de livraison. Les frais de livraison sont indiqués dans le panier puis récapitulés avant la validation de la commande, avec le prix total à payer.

Le Vendeur peut modifier ses prix à tout moment ; le prix facturé est celui affiché au moment de la validation de la commande. Si des droits ou taxes d'importation pouvaient s'appliquer à un produit, cette information est indiquée sur la fiche produit avant la commande.

## Article 5 — Commande
Pour commander, le Client :

1. ajoute les produits au panier ;
2. renseigne ses coordonnées et l'adresse de livraison (avec ou sans création de compte) ;
3. choisit le mode de livraison ;
4. vérifie le récapitulatif de la commande (produits, quantités, prix, frais, total) et peut corriger d'éventuelles erreurs ;
5. accepte les présentes CGV ;
6. valide la commande par le bouton « Commander avec obligation de paiement » (ou formule équivalente) puis procède au paiement.

Le contrat est conclu à la validation du paiement. Une confirmation de commande récapitulant l'ensemble des informations du contrat est envoyée par e-mail au Client.

Le Vendeur se réserve le droit d'annuler ou de refuser une commande en cas de litige existant avec le Client, de suspicion de fraude ou d'indisponibilité du produit ; dans ce dernier cas, le Client est informé et remboursé sans délai, au plus tard dans les 14 jours.

**Archivage :** pour toute commande d'un montant égal ou supérieur à 120 € TTC, le Vendeur conserve l'écrit constatant le contrat pendant 10 ans à compter de la livraison et en garantit l'accès au Client sur simple demande (articles L213-1 et D213-1 du Code de la consommation).

## Article 6 — Paiement
Le paiement est exigible à la commande. Il s'effectue par carte bancaire, ou par Apple Pay / Google Pay lorsque l'appareil le permet, via le prestataire de paiement sécurisé Stripe. Les données de carte sont transmises de manière chiffrée directement à Stripe et ne sont jamais conservées par le Vendeur. Une facture est mise à disposition du Client dans son espace client ou envoyée par e-mail.

## Article 7 — Livraison
Les produits sont livrés à l'adresse indiquée par le Client lors de la commande, dans les zones de livraison proposées sur le site. Les modes, tarifs et délais sont détaillés sur la page Livraison et dans la [politique de livraison](/politique-de-livraison).

À défaut d'indication d'une date ou d'un délai de livraison, le Vendeur livre au plus tard 30 jours après la conclusion du contrat (article L216-1 du Code de la consommation). En cas de dépassement, le Client peut mettre en demeure le Vendeur de livrer dans un délai supplémentaire raisonnable puis, à défaut, résoudre le contrat par lettre recommandée ou par écrit sur un autre support durable ; il est alors remboursé de la totalité des sommes versées au plus tard dans les 14 jours (articles L216-6 et L216-7).

Le risque de perte ou d'endommagement des produits est transféré au Client au moment où lui-même, ou un tiers qu'il a désigné, prend physiquement possession des produits (article L216-4).

## Article 8 — Droit de rétractation
Conformément aux articles L221-18 et suivants du Code de la consommation, le Client dispose d'un délai de **14 jours** pour exercer son droit de rétractation, sans avoir à motiver sa décision ni à supporter d'autres coûts que ceux prévus ci-dessous.

**Point de départ :** le délai court à compter de la réception du bien par le Client (ou un tiers désigné par lui). Pour une commande de plusieurs biens livrés séparément, il court à compter de la réception du dernier bien. Le Client peut se rétracter dès la conclusion du contrat.

**Comment se rétracter :** le Client informe le Vendeur de sa décision avant l'expiration du délai :

- depuis son espace client, rubrique « Mes commandes », bouton « Demander un retour » ;
- ou par e-mail à {{email}} ;
- ou par courrier à {{adresse}} ;
- en utilisant, s'il le souhaite, le formulaire type figurant à la fin des présentes CGV, ou toute autre déclaration dénuée d'ambiguïté exprimant sa volonté de se rétracter.

Un accusé de réception de la rétractation est adressé au Client sur un support durable (e-mail).

**Renvoi des produits :** le Client renvoie les produits, sans retard excessif et au plus tard 14 jours après avoir communiqué sa décision de se rétracter, à l'adresse de retour suivante : {{adresse_retour}}. **Les frais directs de renvoi sont à la charge du Client**, sauf si le produit livré est défectueux, endommagé ou ne correspond pas à la commande.

**Remboursement :** le Vendeur rembourse la totalité des sommes versées, y compris les frais de livraison initiaux (dans la limite du tarif de livraison standard le moins cher proposé), au plus tard 14 jours à compter de la date à laquelle il est informé de la décision de rétractation. Le Vendeur peut différer le remboursement jusqu'à la récupération des biens ou jusqu'à ce que le Client ait fourni une preuve de leur expédition, la date retenue étant celle du premier de ces faits. Le remboursement est effectué avec le même moyen de paiement que celui utilisé pour la commande, sauf accord exprès du Client pour un autre moyen, et sans frais pour lui.

**Responsabilité :** la responsabilité du Client n'est engagée qu'en cas de dépréciation des biens résultant de manipulations autres que celles nécessaires pour établir leur nature, leurs caractéristiques et leur bon fonctionnement.

**Exceptions (article L221-28) :** le droit de rétractation ne peut pas être exercé notamment pour :

- les biens confectionnés selon les spécifications du Client ou nettement personnalisés ;
- les biens susceptibles de se détériorer ou de se périmer rapidement ;
- les biens descellés par le Client après la livraison et qui ne peuvent être renvoyés pour des raisons d'hygiène ou de protection de la santé ;
- les biens qui, après avoir été livrés, sont, de par leur nature, mélangés de manière indissociable avec d'autres articles ;
- les enregistrements audio ou vidéo ou les logiciels informatiques descellés après la livraison.

Lorsqu'un produit relève de l'une de ces exceptions, cela est indiqué sur sa fiche produit.

## Article 9 — Garanties légales
Indépendamment du droit de rétractation, le Vendeur est tenu des défauts de conformité du bien dans les conditions des articles L217-1 et suivants du Code de la consommation et des défauts cachés de la chose vendue dans les conditions des articles 1641 et suivants du Code civil.

> **Garantie légale de conformité**
>
> Le consommateur dispose d'un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en œuvre de la garantie légale de conformité en cas d'apparition d'un défaut de conformité. Durant ce délai, le consommateur n'est tenu d'établir que l'existence du défaut de conformité et non la date d'apparition de celui-ci.
>
> Lorsque le contrat de vente du bien prévoit la fourniture d'un contenu numérique ou d'un service numérique de manière continue pendant une durée supérieure à deux ans, la garantie légale est applicable à ce contenu numérique ou ce service numérique tout au long de la période de fourniture prévue. Durant ce délai, le consommateur n'est tenu d'établir que l'existence du défaut de conformité affectant le contenu numérique ou le service numérique et non la date d'apparition de celui-ci.
>
> La garantie légale de conformité emporte obligation pour le professionnel, le cas échéant, de fournir toutes les mises à jour nécessaires au maintien de la conformité du bien.
>
> La garantie légale de conformité donne au consommateur droit à la réparation ou au remplacement du bien dans un délai de trente jours suivant sa demande, sans frais et sans inconvénient majeur pour lui.
>
> Si le bien est réparé dans le cadre de la garantie légale de conformité, le consommateur bénéficie d'une extension de six mois de la garantie initiale.
>
> Si le consommateur demande la réparation du bien, mais que le vendeur impose le remplacement, la garantie légale de conformité est renouvelée pour une période de deux ans à compter de la date de remplacement du bien.
>
> Le consommateur peut obtenir une réduction du prix d'achat en conservant le bien ou mettre fin au contrat en se faisant rembourser intégralement contre restitution du bien, si :
>
> 1° Le professionnel refuse de réparer ou de remplacer le bien ;
>
> 2° La réparation ou le remplacement du bien intervient après un délai de trente jours ;
>
> 3° La réparation ou le remplacement du bien occasionne un inconvénient majeur pour le consommateur, notamment lorsque le consommateur supporte définitivement les frais de reprise ou d'enlèvement du bien non conforme, ou s'il supporte les frais d'installation du bien réparé ou de remplacement ;
>
> 4° La non-conformité du bien persiste en dépit de la tentative de mise en conformité du vendeur restée infructueuse.
>
> Le consommateur a également droit à une réduction du prix du bien ou à la résolution du contrat lorsque le défaut de conformité est si grave qu'il justifie que la réduction du prix ou la résolution du contrat soit immédiate. Le consommateur n'est alors pas tenu de demander la réparation ou le remplacement du bien au préalable.
>
> Le consommateur n'a pas droit à la résolution de la vente si le défaut de conformité est mineur.
>
> Toute période d'immobilisation du bien en vue de sa réparation ou de son remplacement suspend la garantie qui restait à courir jusqu'à la délivrance du bien remis en état.
>
> Les droits mentionnés ci-dessus résultent de l'application des articles L. 217-1 à L. 217-32 du code de la consommation.
>
> Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt une amende civile d'un montant maximal de 300 000 euros, qui peut être porté jusqu'à 10 % du chiffre d'affaires moyen annuel (article L. 241-5 du code de la consommation).
>
> Le consommateur bénéficie également de la garantie légale des vices cachés en application des articles 1641 à 1649 du code civil, pendant une durée de deux ans à compter de la découverte du défaut. Cette garantie donne droit à une réduction de prix si le bien est conservé ou à un remboursement intégral contre restitution du bien.

Pour mettre en œuvre une garantie légale, le Client contacte le service client ({{email}}, {{telephone}}) ou utilise le formulaire de contact en précisant son numéro de commande et le défaut constaté. Les frais de retour d'un produit non conforme sont à la charge du Vendeur.

Le Vendeur ne propose pas de garantie commerciale en plus des garanties légales, sauf mention contraire sur la fiche produit.

## Article 10 — Service client et réclamations
Le service client est joignable par e-mail à {{email}}, par téléphone au {{telephone}}, via le formulaire de contact du site ou par courrier à {{adresse}}.

## Article 11 — Médiation de la consommation
Conformément aux articles L611-1 et suivants et R612-1 et suivants du Code de la consommation, en cas de litige non résolu après une réclamation écrite adressée au service client, le Client peut recourir gratuitement au médiateur de la consommation suivant : {{mediateur}}.

Le Client doit saisir le médiateur dans un délai d'un an à compter de sa réclamation écrite auprès du Vendeur. Le Client reste libre de saisir les juridictions compétentes.

## Article 12 — Responsabilité
Le Vendeur n'est pas responsable de l'inexécution du contrat imputable au Client, au fait imprévisible et insurmontable d'un tiers au contrat, ou à un cas de force majeure au sens de l'article 1218 du Code civil. Le site peut contenir des liens vers d'autres sites dont le Vendeur ne contrôle pas le contenu.

## Article 13 — Données personnelles
Les données collectées lors de la commande sont nécessaires à son traitement. Leur utilisation et les droits du Client sont décrits dans la [politique de confidentialité](/confidentialite). Le Client peut s'inscrire gratuitement sur la liste d'opposition au démarchage téléphonique Bloctel (www.bloctel.gouv.fr).

## Article 14 — Propriété intellectuelle
Les éléments du site (textes, logo, visuels, mise en page) sont protégés par le droit de la propriété intellectuelle. Toute reproduction sans autorisation est interdite.

## Article 15 — Droit applicable et litiges
Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le Client peut saisir, à son choix, outre l'une des juridictions territorialement compétentes en vertu du Code de procédure civile, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (article R631-3 du Code de la consommation).

## Annexe — Formulaire de rétractation
*(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)*

À l'attention de {{exploitant}} — {{nom_commercial}}, {{adresse}} — e-mail : {{email}}

Je/Nous (\\*) vous notifie/notifions (\\*) par la présente ma/notre (\\*) rétractation du contrat portant sur la vente du bien (\\*) ci-dessous :

- Commandé le (\\*) / reçu le (\\*) :
- Numéro de commande :
- Nom du (des) consommateur(s) :
- Adresse du (des) consommateur(s) :
- Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :
- Date :

(\\*) Rayez la mention inutile.`,
  },
  {
    key: "privacy",
    title: "Politique de confidentialité",
    slug: "politique-de-confidentialite",
    legal: true,
    publish: true,
    content: `*Version en vigueur au 22 novembre 2026.*

La présente politique explique comment {{nom_commercial}} collecte et utilise vos données personnelles, conformément au Règlement général sur la protection des données (RGPD, règlement UE 2016/679) et à la loi n° 78-17 du 6 janvier 1978 modifiée « Informatique et Libertés ».

## 1. Responsable du traitement
**{{exploitant}}**, {{forme}}, exerçant sous le nom commercial {{nom_commercial}} — SIRET {{siret}}.
Adresse : {{adresse}} — E-mail : {{email}} — Téléphone : {{telephone}}.

Pour toute question relative à vos données, écrivez à {{email}} en précisant « Données personnelles ».

## 2. Données collectées
Nous collectons uniquement les données nécessaires :

- **Identité et contact** : nom, prénom, adresse e-mail, téléphone (facultatif), adresses de livraison et de facturation ;
- **Compte client** : identifiants de connexion (le mot de passe est stocké sous forme chiffrée et irréversible), historique de commandes, retours ;
- **Commande et paiement** : produits, montants, statut du paiement. Les données de carte bancaire sont saisies directement chez Stripe : nous n'y avons jamais accès ;
- **Échanges** : messages envoyés via le formulaire de contact ou par e-mail ;
- **Newsletter** : adresse e-mail et preuve de votre consentement ;
- **Données techniques** : adresse IP, journaux de connexion et de sécurité, préférences de cookies.

## 3. Finalités et bases légales

| Finalité | Base légale |
|---|---|
| Création et gestion du compte client | Exécution du contrat |
| Traitement des commandes, paiement, livraison, retours, service client | Exécution du contrat |
| Facturation et comptabilité | Obligation légale |
| Gestion des garanties légales, réclamations et litiges | Obligation légale / intérêt légitime |
| Envoi de la newsletter et d'offres commerciales | Consentement (retirable à tout moment) |
| Sécurité du site, prévention de la fraude, journaux techniques | Intérêt légitime |
| Mesure d'audience (si activée) | Consentement |

## 4. Destinataires
Vos données sont destinées à {{nom_commercial}} et, pour ce qui les concerne, à ses prestataires (sous-traitants) :

- **Vercel Inc.** — hébergement du site ;
- **Neon** — hébergement de la base de données (serveurs situés dans l'Union européenne, Francfort) ;
- **Stripe** — paiement sécurisé et prévention de la fraude ;
- **Resend** — envoi des e-mails transactionnels (confirmation de commande, expédition, etc.) ;
- **fournisseurs et transporteurs** — uniquement les informations nécessaires à la préparation et à la livraison de votre commande (nom, adresse, téléphone) ;
- les autorités administratives ou judiciaires, uniquement lorsque la loi l'exige.

Vos données ne sont jamais vendues ni louées.

## 5. Transferts hors de l'Union européenne
Certains prestataires (notamment Vercel, Stripe et Resend) sont établis aux États-Unis, et certains fournisseurs peuvent être situés hors de l'Union européenne. Ces transferts sont encadrés par les garanties prévues par le RGPD : décision d'adéquation de la Commission européenne (Data Privacy Framework UE–États-Unis) pour les entreprises certifiées et/ou clauses contractuelles types de la Commission européenne. Vous pouvez obtenir une copie de ces garanties en nous écrivant.

## 6. Durées de conservation

| Données | Durée |
|---|---|
| Compte client | Jusqu'à la suppression du compte, ou 3 ans après la dernière activité |
| Commandes et preuves de transaction | 5 ans après la commande (prescription civile et commerciale) |
| Factures et pièces comptables | 10 ans (article L123-22 du Code de commerce) |
| Contrat d'une commande ≥ 120 € | 10 ans après la livraison (article L213-1 du Code de la consommation) |
| Newsletter / prospection | 3 ans après le dernier contact ou jusqu'au désabonnement |
| Messages au service client | 3 ans après le dernier échange |
| Journaux de connexion et de sécurité | 12 mois maximum |
| Choix en matière de cookies | 6 mois |

À l'issue de ces durées, les données sont supprimées ou anonymisées.

## 7. Vos droits
Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité de vos données, ainsi que du droit de retirer votre consentement à tout moment et de définir des directives relatives au sort de vos données après votre décès.

Vous pouvez exercer ces droits :

- depuis votre espace client (export de vos données et demande de suppression du compte) ;
- par e-mail à {{email}} ;
- par courrier à {{adresse}}.

Nous répondons dans un délai d'un mois. Une pièce justificative d'identité peut être demandée en cas de doute raisonnable sur votre identité.

Pour la newsletter, chaque e-mail contient un lien de désinscription.

Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la **CNIL** : 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.

## 8. Sécurité
Le site est accessible uniquement en HTTPS. Les mots de passe sont chiffrés, les accès à l'administration sont restreints et journalisés, et les paiements sont traités par un prestataire certifié PCI-DSS.

## 9. Cookies
Voir notre [politique de cookies](/cookies).

## 10. Mineurs
Le site s'adresse aux personnes majeures. Les mineurs de moins de 15 ans ne peuvent pas créer de compte sans l'accord de leur représentant légal.

## 11. Modification
Cette politique peut être mise à jour ; la date de version figure en haut de page.`,
  },
  {
    key: "cookies",
    title: "Politique de cookies",
    slug: "politique-de-cookies",
    legal: true,
    publish: true,
    content: `*Version en vigueur au 22 novembre 2026.*

## Qu'est-ce qu'un cookie ?
Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, mobile, tablette) lors de la visite d'un site. Il permet par exemple de garder votre panier ou votre session de connexion.

## Les cookies que nous utilisons

### Cookies strictement nécessaires (sans consentement)
Conformément à l'article 82 de la loi Informatique et Libertés, ces cookies sont indispensables au fonctionnement du site et ne nécessitent pas votre accord :

| Cookie | Rôle | Durée |
|---|---|---|
| Session de connexion (better-auth) | Vous garder connecté à votre espace client de façon sécurisée | 30 jours |
| qsd_cart | Conserver le contenu de votre panier | 60 jours |
| qsd_consent | Mémoriser vos choix en matière de cookies | 6 mois |

Le paiement s'effectue sur une page sécurisée hébergée par Stripe : Stripe y dépose ses propres cookies, nécessaires à la sécurité du paiement et à la prévention de la fraude (voir la politique de cookies de Stripe).

### Cookies de mesure d'audience et marketing (avec consentement)
**Aucun cookie de mesure d'audience, publicitaire ou de réseau social n'est utilisé aujourd'hui.** Si nous en ajoutons, ils ne seront déposés qu'après votre accord explicite, et cette page sera mise à jour avec leur liste.

## Votre consentement
Lors de votre première visite, un bandeau vous permet d'**accepter**, de **refuser** ou de **personnaliser** vos choix. Refuser est aussi simple qu'accepter. Votre choix est conservé 6 mois, puis vous est redemandé.

Vous pouvez modifier vos choix à tout moment avec le lien **« Gérer les cookies »** en bas de chaque page.

## Paramétrer votre navigateur
Vous pouvez aussi bloquer ou supprimer les cookies depuis les réglages de votre navigateur (Chrome, Firefox, Safari, Edge…). Bloquer les cookies strictement nécessaires peut empêcher le panier ou la connexion de fonctionner.

## En savoir plus
Site de la CNIL : www.cnil.fr/fr/cookies-et-autres-traceurs. Pour toute question : {{email}}.`,
  },
  {
    key: "shipping",
    title: "Politique de livraison",
    slug: "politique-de-livraison",
    legal: true,
    publish: true,
    content: `*Version en vigueur au 22 novembre 2026.*

## Zones de livraison
Les pays desservis, les modes de livraison et leurs tarifs sont affichés sur la page [Livraison](/livraison) et proposés lors de la commande selon votre adresse.

## Préparation et expédition
Nos produits sont expédiés directement depuis les entrepôts de nos fournisseurs partenaires. Pour chaque produit, la fiche indique :

- le délai de préparation avant expédition ;
- le délai estimé de livraison ;
- le pays d'expédition.

Ces informations sont rappelées avant le paiement. Si une commande contient plusieurs produits, elle peut être livrée en plusieurs colis, sans frais supplémentaires pour vous.

À défaut de délai indiqué, la livraison intervient au plus tard **30 jours** après la commande (article L216-1 du Code de la consommation).

## Frais de livraison
Les frais dépendent du mode de livraison choisi et sont affichés dans le panier, puis récapitulés avant la validation de la commande. Aucun frais n'est ajouté après le paiement.

## Suivi du colis
Dès l'expédition, vous recevez un e-mail avec le numéro de suivi et le lien du transporteur. Vous pouvez aussi suivre votre colis depuis votre espace client ou la page [Suivi de commande](/suivi-commande).

## Retard de livraison
Si votre colis n'est pas arrivé à la date prévue, contactez-nous à {{email}} ou au {{telephone}}. En cas de dépassement du délai, vous pouvez nous demander de livrer dans un délai supplémentaire raisonnable puis, à défaut, annuler la commande et être remboursé intégralement sous 14 jours (articles L216-6 et L216-7 du Code de la consommation).

## Colis endommagé, incomplet ou non reçu
Les risques liés au transport sont à notre charge jusqu'à ce que vous preniez possession du colis. Si le colis est abîmé, nous vous conseillons de le signaler au livreur et de prendre des photos. Contactez-nous dès que possible avec votre numéro de commande et des photos : nous organisons le remplacement ou le remboursement du produit concerné. Vos droits au titre de la garantie légale de conformité restent acquis (voir les [CGV](/cgv)).

## Adresse incorrecte ou colis non retiré
Vérifiez bien votre adresse avant de valider. Si un colis nous revient parce que l'adresse fournie était erronée ou qu'il n'a pas été retiré, nous vous contactons pour convenir d'un nouvel envoi (frais de réexpédition à votre charge) ou d'un remboursement des produits.`,
  },
  {
    key: "returns",
    title: "Politique de retour et de remboursement",
    slug: "politique-de-retour",
    legal: true,
    publish: true,
    content: `*Version en vigueur au 22 novembre 2026.*

## 14 jours pour changer d'avis
Conformément aux articles L221-18 et suivants du Code de la consommation, vous disposez de **14 jours à compter de la réception** de votre commande pour exercer votre droit de rétractation, sans avoir à vous justifier. Si votre commande est livrée en plusieurs colis, le délai court à partir de la réception du dernier.

## Comment faire un retour
1. **Faites votre demande** avant la fin du délai : depuis votre espace client (« Mes commandes » → « Demander un retour »), par e-mail à {{email}}, ou par courrier à {{adresse}}. Vous pouvez utiliser le formulaire de rétractation figurant dans les [CGV](/cgv), mais ce n'est pas obligatoire.
2. **Recevez la confirmation** : nous accusons réception de votre demande par e-mail et vous indiquons comment renvoyer le produit.
3. **Renvoyez le produit** au plus tard 14 jours après votre demande, à l'adresse : {{adresse_retour}}. Conservez la preuve d'envoi (numéro de suivi).
4. **Soyez remboursé** (voir ci-dessous).

## État des produits
Les produits doivent être renvoyés complets (accessoires, notice) et, si possible, dans leur emballage d'origine. Vous pouvez manipuler le produit comme en magasin pour l'examiner ; une dépréciation résultant d'un autre usage peut être déduite du remboursement.

## Frais de retour
- **Rétractation (changement d'avis)** : les frais de renvoi sont à votre charge.
- **Produit défectueux, endommagé ou erroné** : les frais de retour sont à notre charge ; contactez-nous avant tout envoi.

## Remboursement
Nous remboursons **la totalité des sommes payées, y compris les frais de livraison initiaux** (dans la limite du mode de livraison standard le moins cher), au plus tard **14 jours** après avoir été informés de votre rétractation. Nous pouvons attendre d'avoir reçu le produit ou une preuve de son expédition. Le remboursement est fait sur le moyen de paiement utilisé lors de la commande, sans frais.

## Produits non retournables
Certains produits ne peuvent pas faire l'objet d'une rétractation (article L221-28) : produits personnalisés, produits d'hygiène descellés, produits périssables, enregistrements audio/vidéo ou logiciels descellés. Cette restriction est indiquée sur la fiche produit concernée.

## Garanties légales
En plus du droit de rétractation, vous bénéficiez de la **garantie légale de conformité** (2 ans à compter de la livraison, articles L217-1 et suivants du Code de la consommation) et de la **garantie des vices cachés** (articles 1641 et suivants du Code civil). Le détail figure dans les [CGV](/cgv).`,
  },
];
