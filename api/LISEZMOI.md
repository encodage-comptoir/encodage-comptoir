# API du site comptoir-materiaux.be

Petit serveur PHP (PlanetHoster) pour ce que GitHub Pages ne sait pas faire : comptes membres, outilthèque,
réservations de la camionnette et de l'atelier partagé. Le site l'appelle avec la session du membre ; la caisse
(onglet Locations) l'appelle avec sa clé. Base SQLite (fichier `api/donnees/comptoir.sqlite`, créé tout seul) ou MySQL.

## Mise en ligne sur PlanetHoster

1. Envoyer le contenu de `comptoir/` à la racine du site (`public_html/`), et le dossier `api/` dans `public_html/api/`.
2. Copier `api/config.exemple.php` en `api/config.php` et remplir : `cle_caisse` (longue phrase aléatoire),
   `mail_equipe` (reçoit les demandes), `mail_expediteur` (une adresse @comptoir-materiaux.be créée dans PlanetHoster).
3. Vérifier que `https://www.comptoir-materiaux.be/api/index.php?a=outils` répond `[]`, et que
   `…/api/donnees/` et `…/api/config.php` sont refusés (403).
4. Dans la caisse : onglet Locations, indiquer `https://www.comptoir-materiaux.be/api/` et la clé, puis
   « Reprendre l'ancienne outilthèque » (les 45 outils lus sur outils.la-pile.be le 30/10/2026).
5. Retirer `<meta name="robots" content="noindex">` des pages et changer `BASE` dans `outils/site_comptoir.py`.

## Ce que fait l'API (`index.php?a=…`)

- Public : `outils`, `dispo&ref=` (créneaux pris, sans nom), `inscription`, `connexion`, `deconnexion`, `moi`,
  `profil`, `reserver`, `mes`, `annuler`.
- Caisse (en-tête `X-Cle-Caisse`) : `c_tout`, `c_outil`, `c_outils` (import), `c_statut` (confirmer, refuser, sortie,
  retour, annuler), `c_reserver` (au comptoir), `c_membre` (créer, adhésion, suspendre), `c_publier&f=stock.json`.
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
