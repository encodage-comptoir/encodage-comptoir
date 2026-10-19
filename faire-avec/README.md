# Faire avec (prototype)

Moteur de recherche « faire avec » du Comptoir des Matériaux : partir des matériaux en stock
plutôt que d'un plan fixé d'avance. Quatre entrées : chercher un matériau (filtres),
une fonction (séparer, couvrir, planter…), un projet (coin potager, coin WC, sapin de Noël)
et des ambiances complètes (petite chambre).

Site statique, sans serveur ni IA : il lit les fichiers du dossier `donnees/`.

| Fichier | Contenu | Mise à jour |
| --- | --- | --- |
| `stock.csv` | Export stock d'Impulsion (Référence ; Nom ; Stock ; PV particulier TVAc) | Remplacer par un nouvel export. Retirer d'abord les colonnes de prix d'achat : ce dépôt est public. |
| `familles.csv` | Familles de matériaux, reconnues par mots du nom puis par préfixe de référence, avec leurs fonctions et usages détournés | Rarement |
| `fiches.csv` | Détails par référence, mêmes colonnes que l'export « caractéristiques » (mesures L1 ≥ L2 ≥ L3 en cm) de l'app d'encodage (Emplacement compris ; + Famille, Fonctions, Usages détournés, Bricolage, Mesuré). Les valeurs actuelles sont des exemples (`Mesuré` = non) | Coller les lignes de l'export de l'app |
| `fonctions.csv` | Fonctions et leurs synonymes | Rarement |
| `projets.csv` | Une ligne par poste de projet : familles, fonction ou mots du nom à chercher | Après chaque atelier |
| `ambiances.csv` | Pièces complètes : une ligne par rôle (référence, calcul `sol` / `murs` / `plinthes` / `perimetre` ou quantité fixe, couverture par unité de stock), dimensions de pièce par défaut | Quand le stock change |
| `idees.csv` | Illustrations des usages détournés : Idée (même texte que dans familles ou fiches) ; Image (fichier de `photos/` ou lien) ; Crédit ; Lien | Au fil des photos |
| `photos/` | Photos des articles, nommées comme dans l'app d'encodage (SA139-1.jpg) et listées dans la colonne Photos de `fiches.csv` | À chaque encodage |

Dans `familles.csv`, une fonction peut être limitée à certains noms : `Revêtir un sol (pave|klinker|dalle)` ne s'applique qu'aux articles dont le nom contient un de ces mots.

Le bouton « Être guidé » utilise le téléphone et l'e-mail de `CONTACT`, en haut de `index.html`.

Les fichiers se modifient dans un tableur (séparateur « ; »). Plus tard, chaque fichier pourra
être un onglet d'un Google Sheet publié en CSV : il suffira de changer les liens dans `SOURCES`
en haut de `index.html`.

Les références sont comparées telles quelles (espaces compris), car « SA 70 » et « SA70 »
désignent aujourd'hui deux produits différents.
