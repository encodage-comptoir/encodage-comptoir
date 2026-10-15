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
| `fiches.csv` | Détails par référence (dimensions en cm, matière, état…). Les valeurs actuelles sont des exemples (`Mesuré` = non) | Au fil de l'encodage |
| `fonctions.csv` | Fonctions et leurs synonymes | Rarement |
| `projets.csv` | Une ligne par poste de projet : familles, fonction ou mots du nom à chercher | Après chaque atelier |
| `ambiances.csv` | Aménagements complets : un rôle et une référence par ligne | Quand le stock change |

Les fichiers se modifient dans un tableur (séparateur « ; »). Plus tard, chaque fichier pourra
être un onglet d'un Google Sheet publié en CSV : il suffira de changer les liens dans `SOURCES`
en haut de `index.html`.

Les références sont comparées telles quelles (espaces compris), car « SA 70 » et « SA70 »
désignent aujourd'hui deux produits différents.
