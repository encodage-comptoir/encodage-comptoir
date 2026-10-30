# API du site comptoir-materiaux.be

Petit serveur PHP (PlanetHoster) : comptes membres, outilthèque, réservations de la camionnette et de l'atelier
partagé, et depuis le 30/10/2026 la liaison de la caisse et de l'app d'encodage (qui passait avant par GitHub).
Le site l'appelle avec la session du membre ; la caisse et l'app d'encodage l'appellent avec la clé de la caisse.
Base SQLite (fichier `api/donnees/comptoir.sqlite`, créé tout seul) ou MySQL ; fichiers partagés dans `api/donnees/fichiers/`.

## Mise en ligne sur PlanetHoster

Tout tient dans un seul paquet : `python3 outils/paquet_planethoster.py <dossier>` produit `comptoir-materiaux.zip`
(contenu de `public_html/`, avec un `api/config.php` et une clé de caisse tirée au hasard) et `INSTALLATION.txt`
(les étapes et la clé). Organisation dans `public_html/` :

| Adresse | Contenu |
|---|---|
| `/` | le site (dossier `comptoir/`) |
| `/api/` | cette API (`config.php` jamais servi, `donnees/` jamais servi) |
| `/caisse/` | la caisse |
| `/encodage/` | l'app d'encodage (`index.html` de la racine du dépôt et `essai/` pour la reconnaissance photo) |

Vérifications : `https://www.comptoir-materiaux.be/api/index.php?a=outils` répond (liste JSON), et
`…/api/donnees/` et `…/api/config.php` sont refusés (403). Pour l'ouverture au public : retirer
`<meta name="robots" content="noindex">` et le bandeau « Maquette » des pages.

## Ce que fait l'API (`index.php?a=…`)

- Public : `outils`, `dispo&ref=` (créneaux pris, sans nom), `inscription`, `connexion`, `deconnexion`, `moi`,
  `profil`, `reserver`, `mes`, `annuler`.
- Caisse (en-tête `X-Cle-Caisse`) : `c_tout`, `c_outil`, `c_outils` (import), `c_statut` (confirmer, refuser, sortie,
  retour, annuler), `c_reserver` (au comptoir), `c_membre` (créer, adhésion, suspendre), `c_publier&f=stock.json`,
  et les fichiers partagés `c_fichiers&dossier=journaux|envois`, `c_lire&chemin=`, `c_ecrire&chemin=` : un journal par
  appareil de caisse (`journaux/journal-<appareil>.json`, ventes, mouvements, fiches) et les envois de l'app d'encodage
  (`envois/…json`, annonces et photos).
- Un créneau est bloqué par une réservation confirmée ou sortie ; une simple demande ne bloque pas (elle est signalée).
- E-mails (fonction `mail()` de PHP) : à l'équipe pour chaque compte et demande, au membre à la confirmation ou au refus.

## Camionnette : déverrouillage automatique

Quand une réservation de la camionnette est confirmée, l'API appelle `deverrouillage_url` (si rempli) en POST JSON :
`{"reservation": 12, "membre": {"nom", "email", "tel"}, "debut": "2026-11-05 09:00:00", "fin": "…"}`, avec
`Authorization: Bearer <deverrouillage_jeton>`. Si la réponse contient `code` ou `lien`, il est enregistré, envoyé au
membre dans l'e-mail de confirmation et affiché dans « Mon compte ». Il reste à brancher l'application de la
camionnette : soit elle accepte directement ce genre d'appel, soit on écrit un petit adaptateur vers son API.
Sans branchement, la clé reste dans la boîte à clé et l'équipe envoie le code à la main.

**Wibee (appli de la camionnette, état au 30/10/2026).** Wibee (wibee.be, Louvain-la-Neuve) ne publie ni API, ni
webhook, ni export de calendrier : on ne peut pas encore créer une réservation Wibee depuis ce site. Pistes, dans l'ordre :
1. demander à Wibee (info@wibee.be) un accès API ou un webhook ; si oui, un petit adaptateur PHP reçoit l'appel
   ci-dessus et crée la réservation Wibee (ou la clé virtuelle) ;
2. en attendant : à la confirmation dans la caisse, l'équipe valide le membre dans le groupe Wibee du Comptoir ;
   le membre réserve ensuite le même créneau dans l'appli Wibee, qui ouvre la camionnette (boîtier + smartphone).
