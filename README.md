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

## Caisse & stock (v2, essai)

`caisse/` : caisse et gestion du stock pour le PC du comptoir, aux couleurs de La Pile (comme le site), sans serveur.
Fichiers : `index.html` (coquille), `style.css` (charte), `app.js` (écrans), `sync.js` (liaison), `poids.js` (poids estimé).

- **Caisse** : la douchette QR ajoute l'article au ticket où que soit le curseur (lien `…/a/REF`, `?r=REF` ou
  référence seule ; une douchette restée en QWERTY est corrigée). Recherche par nom, référence ou emplacement,
  prix et poids modifiables, article sans fiche, livraison 0,50 €/km, espèces / QR code / virement / facture, ticket
  envoyé par e-mail ou SMS. En mode QR code, la caisse affiche un QR de virement européen (EPC) avec le montant et la
  communication (IBAN de La Pile à saisir dans Réglages ; `qrcode.js` : qrcode-generator 1.4.4, licence MIT).
- **Stock** (comme Impulsion) : tableau triable et filtrable (statut, catégorie, sans prix, sans poids, sans
  emplacement), fiche article en panneau avec entrées, sorties (casse, don, usage interne, rendu) et comptages,
  création de fiches, import des fiches de l'app d'encodage. Stock = départ + entrées − ventes − sorties, remis à la
  valeur comptée à chaque comptage.
- **Mouvements**, **Carnet** (le carnet papier, mois par mois) et **Rapports** à tout moment, sur une période au
  choix : statistiques (ventes, poids par matière et catégorie), comptabilité (journal des recettes avec TVA, Z du
  jour, factures en attente), Intradel (kg réemployés par matière, déchets), Impulsion (stock à jour, articles à
  retirer), site (`stock.json`). Formats compta et Intradel standard en attendant leurs modèles.
- **Liaison** (Réglages) : avec un jeton GitHub à grain fin (Contents : lecture et écriture sur ce dépôt) et la
  phrase secrète du Comptoir, chaque appareil publie `comptoir/stock.json` (lu par le site : articles partis
  retirés, quantités et emplacements à jour) et son journal chiffré `donnees/journal-<appareil>.json` (AES-GCM, le
  dépôt étant public), et reprend les journaux des autres. Le jeton et la phrase restent dans le navigateur.

`caisse/historique.json` reprend les ventes du carnet papier de janvier à septembre 2026 (comptées dans les
statistiques, case à décocher). Rien n'est écrit dans Impulsion.
Adresse : https://encodage-comptoir.github.io/encodage-comptoir/caisse/

## Version en ligne (23/10/2026)
L'app à la racine est la 6.6 : copie de `essai/index.html` dont les chemins `poids.js`, `vendor/`, `modeles/` et `annonces.json` pointent vers `essai/` (pas de doublon des 35 Mo du modèle). Elle garde les fiches déjà encodées (même base « comptoir » sur le téléphone). L'ancienne 5.2 reste disponible dans `v5/`.
Pour remettre la dernière version d'essai en ligne : refaire la copie avec ces chemins, et changer le nom du cache dans `sw.js`.
