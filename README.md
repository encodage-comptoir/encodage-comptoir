# Encodage Comptoir des Matériaux

Petite app web (PWA) pour relever les matériaux qui arrivent au Comptoir des Matériaux de La Pile :
photos, catégorie, nom, mesures, quantité. Elle prépare un fichier d'import pour Impulsion
(Gestion des produits > Importation) et des photos nommées d'après la référence (ex. SA139-1.jpg).

- Les données restent sur le téléphone (aucun serveur, aucun compte).
- Fichier d'import : séparateur « ; », encodage Windows-1252, colonnes
  Référence ; Nom ; Catégories ; Stock ; Prix de vente TTC ; Description.
- Les derniers numéros de référence se règlent dans Réglages.

Hébergement : GitHub Pages (Settings > Pages > Deploy from branch > main / root).

## Version d'essai (v6)

`essai/` : photos guidées (3 photos + contrôle flou / sombre), reconnaissance photo sur le téléphone
(catégorie, nom, matière, couleur proposés), écran « Détails » (matière, couleur, intérieur / extérieur),
et fichier `caracteristiques-AAAA-MM-JJ.csv` pour l'outil « Faire avec ». v6.3 : poids (pesé, ou estimé
par `poids.js` d'après la matière et les mesures ; même calcul que la caisse, copie identique dans `caisse/poids.js`). Ses fiches sont stockées à part
des vraies. Adresse : https://encodage-comptoir.github.io/encodage-comptoir/essai/

## Caisse (premier jet, essai)

`caisse/` : caisse sur le téléphone du comptoir, sans serveur. Recherche d'un article par nom, référence ou
emplacement (catalogue tiré de l'export de stock Impulsion du 14/10/2026 et des annonces du site), panier avec
prix modifiable, article sans fiche, livraison à 0,50 €/km, paiement espèces / QR code / virement / facture, ticket
à envoyer au client. L'onglet « Carnet de caisse » reprend le carnet papier : une page par mois, une ligne par
article, colonnes Recettes / Entrée caisse / Sortie caisse, report, dépôts banque, solde et comptage de la caisse,
liste des articles à mettre hors ligne / VENDU, export pour tableur. L'onglet « Stock » calcule ce qui reste
(export Impulsion + fiches de l'app d'encodage faites sur le même téléphone − ventes, corrigé par les comptages
sur place) et exporte un fichier « stock à jour » à reporter dans Impulsion. L'onglet « Chiffres » montre les ventes
par mois, catégorie, jour de la semaine et mode de paiement, le poids vendu par matière et par catégorie
(poids pesé dans l'app d'encodage, sinon estimé par `poids.js` d'après la matière et les dimensions
— masse volumique × volume × part pleine de l'objet — ou d'après le type d'article ; corrigeable à la vente ; export mois × matière × catégorie), et le stock par catégorie. `caisse/historique.json` reprend les ventes du carnet papier de janvier à septembre 2026 (recopiées des photos du carnet, catégorie et matière d'après le libellé, poids estimé d'après le type d'article ou, à défaut, le prix) : comptées dans les Chiffres (case à décocher), jamais dans le carnet ni le stock. Rien n'est écrit dans Impulsion.
Adresse : https://encodage-comptoir.github.io/encodage-comptoir/caisse/
