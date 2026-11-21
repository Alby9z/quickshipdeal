# Avant l'ouverture commerciale : points à valider

Ces éléments **ne peuvent pas être inventés** et doivent être fournis ou vérifiés par l'exploitant.

## Informations légales (Admin → Paramètres)

- [x] Entreprise : EI MARTIN Brian, nom commercial QUICKSHIPDEALS, micro-entreprise, SIREN 981 011 810, SIRET 981 011 810 00018, RCS Belfort, EUID FR9001.981011810, APE 47.91A (extrait du registre).
- [ ] **Adresse** : le siège inscrit au RCS est 42 B rue Voltaire, 90000 Belfort ; l'adresse de contact indiquée est 11 rue Anatole France, 70300 Luxeuil-les-Bains. Les mentions légales affichent les deux. Mettre à jour le registre (transfert de siège) puis aligner les réglages.
- [x] E-mail de contact : quickshipdeal@gmail.com ; téléphone 06 46 28 35 81.
- [ ] **Régime de TVA** : franchise en base (art. 293 B du CGI) ou assujetti avec numéro de TVA. À choisir dans Paramètres → Fiscalité. Tant que ce n'est pas fait, il est signalé partout.
- [ ] **Médiateur de la consommation** (obligatoire en vente aux particuliers) : adhérer à un médiateur agréé et renseigner nom + site.
- [ ] **Hébergeur** : nom et adresse (ex. Vercel Inc.) dans les réglages.
- [ ] **Adresse de retour** des colis.

## Textes juridiques (Admin → Pages)

CGV, politique de confidentialité, cookies, livraison, retours : modèles en brouillon avec mentions [À COMPLÉTER]. Ils ne constituent pas un conseil juridique : à compléter et faire relire (avocat, juriste, ou service type Legalstart / LegalPlace) avant publication.

## Comptes et services

- [ ] Dépôt GitHub (pour versionner le code et activer la CI)
- [ ] Nom de domaine
- [ ] Compte Vercel, base PostgreSQL de production, Redis, hébergement du worker
- [ ] Stripe (compte vérifié, webhook de production)
- [ ] Resend (domaine vérifié)
- [ ] Cloudflare R2 (images)
- [ ] Logo en haute définition (le fichier actuel fait 143 × 142 px)

## Catalogue

- [ ] Produits réels : photos, descriptions, prix, délais, informations de sécurité fournis par vos fournisseurs
- [ ] Tarifs de livraison réels (Admin → Transporteurs et tarifs) : sans tarif actif, le paiement est bloqué
