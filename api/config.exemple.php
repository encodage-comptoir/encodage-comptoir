<?php
// Copier ce fichier en config.php sur PlanetHoster (jamais dans le dépôt GitHub) et remplir les valeurs.
return [
  // Clé secrète de la caisse : la même que dans Réglages > Site de la caisse. Longue et aléatoire.
  'cle_caisse' => 'à-remplacer-par-une-longue-phrase-aléatoire',
  // Adresse qui reçoit les nouvelles demandes, et expéditeur des e-mails aux membres.
  'mail_equipe' => 'audrey@la-pile.be',
  'mail_expediteur' => 'comptoir@comptoir-materiaux.be',
  // Base de données : SQLite par défaut (fichier dans api/donnees/, protégé). Pour MySQL :
  // 'dsn' => 'mysql:host=localhost;dbname=xxx;charset=utf8mb4', 'db_user' => 'xxx', 'db_pass' => 'xxx',
  'dsn' => null,
  // Dossier du site où la caisse publie outils.json et stock.json (relatif à api/).
  'dossier_site' => '..',
  // Déverrouillage de la camionnette : laissé vide tant que l'application n'est pas connue.
  // Quand une réservation de la camionnette est confirmée, l'API appelle cette adresse (POST JSON) avec
  // {reservation, membre, debut, fin} et l'en-tête Authorization: Bearer <jeton>. Voir LISEZMOI.md.
  'deverrouillage_url' => '',
  'deverrouillage_jeton' => '',
];
