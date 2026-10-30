<?php
// API du site comptoir-materiaux.be (PlanetHoster) : comptes membres, outilthèque, réservations de la camionnette
// et de l'atelier partagé. Le site l'appelle avec la session du membre ; la caisse l'appelle avec sa clé (X-Cle-Caisse).
// Une seule entrée : index.php?a=<action>. Réponses en JSON. Voir LISEZMOI.md.
declare(strict_types=1);
$CFG = (is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : []) + require __DIR__ . '/config.exemple.php';
const STATUTS = ['demandee', 'confirmee', 'refusee', 'annulee', 'en_cours', 'rendue'];
const OCCUPE = ['confirmee', 'en_cours'];   // ce qui bloque un créneau
const TYPES = ['outil', 'camionnette', 'atelier'];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
// La caisse tourne sur une autre adresse (GitHub Pages ou PC) : elle a le droit d'appeler l'API, sans cookie.
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: Content-Type, X-Cle-Caisse');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

function rep($d, int $code = 200): never { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function err(string $m, int $code = 400): never { rep(['erreur' => $m], $code); }
function corps(): array { static $c; return $c ??= (json_decode(file_get_contents('php://input') ?: '[]', true) ?: []) + $_POST; }
function champ(string $k, int $max = 500): string { return mb_substr(trim((string)(corps()[$k] ?? '')), 0, $max); }
function maintenant(): string { return date('Y-m-d H:i:s'); }

function db(): PDO {
  global $CFG; static $db;
  if ($db) return $db;
  $dsn = $CFG['dsn'] ?: 'sqlite:' . __DIR__ . '/donnees/comptoir.sqlite';
  $db = new PDO($dsn, $CFG['db_user'] ?? null, $CFG['db_pass'] ?? null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $auto = str_starts_with($dsn, 'sqlite') ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INTEGER PRIMARY KEY AUTO_INCREMENT';
  $db->exec("CREATE TABLE IF NOT EXISTS membres (id $auto, email VARCHAR(190) UNIQUE NOT NULL, nom VARCHAR(190) NOT NULL,
    tel VARCHAR(40), adresse VARCHAR(300), mdp VARCHAR(255) NOT NULL, statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    jusqua DATE NULL, note TEXT, cree DATETIME NOT NULL)");
  // Outils, camionnette et atelier : une seule table, la caisse les crée et les modifie.
  $db->exec("CREATE TABLE IF NOT EXISTS outils (ref VARCHAR(40) PRIMARY KEY, type VARCHAR(20) NOT NULL DEFAULT 'outil',
    nom VARCHAR(190) NOT NULL, cat VARCHAR(80), descr TEXT, prix_jour DECIMAL(8,2), prix_we DECIMAL(8,2), prix_periode DECIMAL(8,2), tarif INTEGER NULL,
    caution DECIMAL(8,2), qte INTEGER NOT NULL DEFAULT 1, etat VARCHAR(80), photos TEXT, en_ligne INTEGER NOT NULL DEFAULT 1, maj DATETIME NOT NULL)");
  $db->exec("CREATE TABLE IF NOT EXISTS reservations (id $auto, membre INTEGER NOT NULL, ref VARCHAR(40) NOT NULL,
    debut DATETIME NOT NULL, fin DATETIME NOT NULL, statut VARCHAR(20) NOT NULL DEFAULT 'demandee', message TEXT,
    note TEXT, code_acces VARCHAR(80), cree DATETIME NOT NULL, maj DATETIME NOT NULL)");
  // Propositions de dépôt (dons de matériaux) envoyées depuis le site, traitées dans la caisse.
  $db->exec("CREATE TABLE IF NOT EXISTS depots (id $auto, nom VARCHAR(190) NOT NULL, tel VARCHAR(40), email VARCHAR(190),
    quoi TEXT NOT NULL, lieu VARCHAR(190), enlevement INTEGER NOT NULL DEFAULT 0, photos TEXT, statut VARCHAR(20) NOT NULL DEFAULT 'nouveau',
    note TEXT, cree DATETIME NOT NULL, maj DATETIME NOT NULL)");
  return $db;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }

function session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 60, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
  session_name('comptoir');
  session_start();
}
function membre(bool $obligatoire = true): ?array {
  session();
  $m = !empty($_SESSION['m']) ? q('SELECT * FROM membres WHERE id=?', [$_SESSION['m']])->fetch() : null;
  if (!$m && $obligatoire) err('Connectez-vous d\'abord.', 401);
  return $m ?: null;
}
function public_membre(array $m): array { unset($m['mdp'], $m['note']); return $m; }
function caisse(): void {
  global $CFG;
  $c = $_SERVER['HTTP_X_CLE_CAISSE'] ?? '';
  if (strlen($CFG['cle_caisse']) < 20 || str_starts_with($CFG['cle_caisse'], 'à-remplacer') || !hash_equals($CFG['cle_caisse'], $c)) { usleep(500000); err('Clé de la caisse refusée.', 403); }
}
function outil_public(array $o): array {
  $o['photos'] = json_decode($o['photos'] ?: '[]', true) ?: [];
  foreach (['prix_jour', 'prix_we', 'prix_periode', 'caution'] as $k) $o[$k] = $o[$k] === null ? null : (float)$o[$k];
  $o['qte'] = (int)$o['qte']; $o['tarif'] = $o['tarif'] === null ? null : (int)$o['tarif']; $o['en_ligne'] = (int)$o['en_ligne'];
  return $o;
}
function date_ok(string $d): ?string {
  $t = strtotime($d);
  return $t ? date('Y-m-d H:i:s', $t) : null;
}
// Combien d'exemplaires sont déjà pris sur la période (réservations confirmées ou en cours).
function pris(string $ref, string $debut, string $fin, int $sauf = 0): int {
  $in = implode(',', array_map(fn($s) => "'$s'", OCCUPE));
  return (int)q("SELECT COUNT(*) FROM reservations WHERE ref=? AND id<>? AND statut IN ($in) AND debut<? AND fin>?", [$ref, $sauf, $fin, $debut])->fetchColumn();
}
function envoyer_mail(string $a, string $sujet, string $texte): void {
  global $CFG;
  if (!$a) return;
  @mail($a, '=?UTF-8?B?' . base64_encode($sujet) . '?=', $texte,
    "From: Comptoir des Matériaux <{$CFG['mail_expediteur']}>\r\nContent-Type: text/plain; charset=utf-8");
}
// Photos envoyées (dépôts, outils, camionnette, atelier) : rangées dans photos/ du site, sous un nom aléatoire.
function sauver_photo(string $tmp, string $sous = ''): ?string {
  global $CFG;
  $info = @getimagesize($tmp);
  $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? null;
  if (!$ext || filesize($tmp) > 8 * 1024 * 1024) return null;
  $dos = __DIR__ . '/' . $CFG['dossier_site'] . '/photos/' . $sous;
  if (!is_dir($dos) && !@mkdir($dos, 0755, true)) return null;
  $nom = bin2hex(random_bytes(10)) . '.' . $ext;
  return move_uploaded_file($tmp, "$dos/$nom") ? 'photos/' . ($sous ? "$sous/" : '') . $nom : null;
}
// Adresse publique du site (pour les liens dans les e-mails et les fiches).
function base_site(): string {
  $s = (!empty($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
  return $s . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/') . '/';
}
function fichiers(string $champ): array {
  $f = $_FILES[$champ] ?? null; if (!$f) return [];
  if (!is_array($f['tmp_name'])) return $f['error'] === UPLOAD_ERR_OK ? [$f['tmp_name']] : [];
  return array_values(array_filter($f['tmp_name'], fn($t, $i) => $f['error'][$i] === UPLOAD_ERR_OK, ARRAY_FILTER_USE_BOTH));
}
function libelle(array $r): string {
  $o = q('SELECT nom FROM outils WHERE ref=?', [$r['ref']])->fetchColumn() ?: $r['ref'];
  return $o . ' du ' . date('d/m/Y H\hi', strtotime($r['debut'])) . ' au ' . date('d/m/Y H\hi', strtotime($r['fin']));
}
// Camionnette confirmée : on demande un code d'accès au service de déverrouillage, s'il est branché.
function deverrouillage(array $r, array $m): ?string {
  global $CFG;
  if (!$CFG['deverrouillage_url']) return null;
  $ctx = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 15, 'ignore_errors' => true,
    'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$CFG['deverrouillage_jeton']}\r\n",
    'content' => json_encode(['reservation' => (int)$r['id'], 'membre' => ['nom' => $m['nom'], 'email' => $m['email'], 'tel' => $m['tel']], 'debut' => $r['debut'], 'fin' => $r['fin']])]]);
  $t = @file_get_contents($CFG['deverrouillage_url'], false, $ctx);
  $j = $t ? json_decode($t, true) : null;
  return is_array($j) ? (string)($j['code'] ?? $j['lien'] ?? '') ?: null : null;
}

$a = $_GET['a'] ?? '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
if (in_array($a, ['inscription', 'connexion', 'deconnexion', 'reserver', 'annuler', 'profil', 'depot']) || str_starts_with($a, 'c_')) {
  if (!$post) err('Méthode non permise.', 405);
}

switch ($a) {

  // ——— Public ———
  case 'outils':   // catalogue public : outils, camionnette, atelier
    rep(array_map('outil_public', q('SELECT * FROM outils WHERE en_ligne=1 ORDER BY type, cat, nom')->fetchAll()));

  case 'dispo':    // créneaux pris pour une ressource (sans nom de membre)
    $ref = (string)($_GET['ref'] ?? '');
    $de = date_ok((string)($_GET['de'] ?? 'today')) ?? maintenant();
    $au = date_ok((string)($_GET['a_'] ?? '+90 days')) ?? date('Y-m-d H:i:s', strtotime('+90 days'));
    $in = implode(',', array_map(fn($s) => "'$s'", [...OCCUPE, 'demandee']));
    $l = q("SELECT debut, fin, statut FROM reservations WHERE ref=? AND statut IN ($in) AND fin>? AND debut<? ORDER BY debut", [$ref, $de, $au])->fetchAll();
    rep(['ref' => $ref, 'qte' => (int)(q('SELECT qte FROM outils WHERE ref=?', [$ref])->fetchColumn() ?: 1), 'pris' => $l]);

  case 'inscription':
    $email = strtolower(champ('email', 190)); $nom = champ('nom', 190); $mdp = (string)(corps()['mdp'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) err('Adresse e-mail invalide.');
    if (mb_strlen($nom) < 2) err('Indiquez votre nom.');
    if (strlen($mdp) < 8) err('Mot de passe : 8 caractères au moins.');
    if (q('SELECT 1 FROM membres WHERE email=?', [$email])->fetch()) err('Un compte existe déjà avec cette adresse : connectez-vous.');
    q('INSERT INTO membres (email, nom, tel, adresse, mdp, cree) VALUES (?,?,?,?,?,?)',
      [$email, $nom, champ('tel', 40), champ('adresse', 300), password_hash($mdp, PASSWORD_DEFAULT), maintenant()]);
    session(); session_regenerate_id(true); $_SESSION['m'] = (int)db()->lastInsertId();
    global $CFG;
    envoyer_mail($CFG['mail_equipe'], 'Nouveau compte : ' . $nom, "$nom ($email, " . champ('tel', 40) . ") a créé un compte sur le site.\nÀ activer dans la caisse (onglet Locations > Membres) une fois l'adhésion réglée.");
    rep(['membre' => public_membre(membre())]);

  case 'connexion':
    $m = q('SELECT * FROM membres WHERE email=?', [strtolower(champ('email', 190))])->fetch();
    if (!$m || !password_verify((string)(corps()['mdp'] ?? ''), $m['mdp'])) { usleep(800000); err('E-mail ou mot de passe incorrect.', 401); }
    session(); session_regenerate_id(true); $_SESSION['m'] = (int)$m['id'];
    rep(['membre' => public_membre($m)]);

  case 'deconnexion':
    session(); $_SESSION = []; session_destroy(); rep(['ok' => true]);

  case 'moi':
    $m = membre(false);
    rep(['membre' => $m ? public_membre($m) : null]);

  case 'profil':
    $m = membre();
    q('UPDATE membres SET nom=?, tel=?, adresse=? WHERE id=?', [champ('nom', 190) ?: $m['nom'], champ('tel', 40), champ('adresse', 300), $m['id']]);
    rep(['membre' => public_membre(membre())]);

  case 'reserver':   // demande de location d'un outil, de la camionnette ou de l'atelier
    $m = membre();
    if ($m['statut'] === 'suspendu') err('Votre compte est suspendu : contactez le Comptoir.', 403);
    $o = q('SELECT * FROM outils WHERE ref=? AND en_ligne=1', [champ('ref', 40)])->fetch();
    if (!$o) err('Cet outil n\'existe pas ou n\'est plus proposé.');
    $d = date_ok(champ('debut', 40)); $f = date_ok(champ('fin', 40));
    if (!$d || !$f || $f <= $d) err('Dates invalides.');
    if ($d < date('Y-m-d H:i:s', strtotime('-1 hour'))) err('La date de début est passée.');
    if (pris($o['ref'], $d, $f) >= (int)$o['qte']) err('Déjà réservé sur cette période : choisissez d\'autres dates.', 409);
    q('INSERT INTO reservations (membre, ref, debut, fin, message, cree, maj) VALUES (?,?,?,?,?,?,?)',
      [$m['id'], $o['ref'], $d, $f, champ('message', 1000), maintenant(), maintenant()]);
    $r = q('SELECT * FROM reservations WHERE id=?', [db()->lastInsertId()])->fetch();
    global $CFG;
    envoyer_mail($CFG['mail_equipe'], 'Demande de réservation : ' . $o['nom'], "{$m['nom']} ({$m['email']}, {$m['tel']}) demande : " . libelle($r) . "\n" . ($r['message'] ? "Message : {$r['message']}\n" : '') . "À confirmer dans la caisse, onglet Locations.");
    envoyer_mail($m['email'], 'Votre demande au Comptoir des Matériaux', "Bonjour {$m['nom']},\n\nNous avons bien reçu votre demande : " . libelle($r) . ".\nNous vous confirmons au plus vite par e-mail.\n\nComptoir des Matériaux · La Pile asbl");
    rep(['reservation' => $r]);

  case 'mes':
    $m = membre();
    rep(q('SELECT r.id, r.ref, r.debut, r.fin, r.statut, r.message, r.code_acces, o.nom, o.type FROM reservations r LEFT JOIN outils o ON o.ref=r.ref WHERE r.membre=? ORDER BY r.debut DESC', [$m['id']])->fetchAll());

  case 'annuler':
    $m = membre();
    $r = q('SELECT * FROM reservations WHERE id=? AND membre=?', [(int)(corps()['id'] ?? 0), $m['id']])->fetch();
    if (!$r || !in_array($r['statut'], ['demandee', 'confirmee'])) err('Cette réservation ne peut plus être annulée en ligne.');
    q("UPDATE reservations SET statut='annulee', maj=? WHERE id=?", [maintenant(), $r['id']]);
    global $CFG;
    envoyer_mail($CFG['mail_equipe'], 'Réservation annulée', "{$m['nom']} a annulé : " . libelle($r));
    rep(['ok' => true]);

  case 'depot':   // proposition de dons de matériaux (sans compte), avec photos
    if (champ('site') !== '') rep(['ok' => true]);   // champ piège : robot
    $quoi = champ('quoi', 3000); $nom = champ('nom', 190); $tel = champ('tel', 40); $email = strtolower(champ('email', 190));
    if (mb_strlen($quoi) < 3 || mb_strlen($nom) < 2) err('Décrivez les matériaux et indiquez votre nom.');
    if (!$tel && !filter_var($email, FILTER_VALIDATE_EMAIL)) err('Indiquez un téléphone ou un e-mail valide.');
    $ph = array_values(array_filter(array_map(fn($t) => sauver_photo($t, 'depots'), array_slice(fichiers('photos'), 0, 5))));
    q('INSERT INTO depots (nom, tel, email, quoi, lieu, enlevement, photos, cree, maj) VALUES (?,?,?,?,?,?,?,?,?)',
      [$nom, $tel, $email, $quoi, champ('lieu', 190), champ('enlevement') ? 1 : 0, json_encode($ph, JSON_UNESCAPED_SLASHES), maintenant(), maintenant()]);
    global $CFG;
    envoyer_mail($CFG['mail_equipe'], 'Proposition de dépôt : ' . mb_substr($quoi, 0, 60), "$nom ($tel $email) propose :\n$quoi\n" . (champ('lieu') ? 'Lieu : ' . champ('lieu') . "\n" : '') . (champ('enlevement') ? "Demande un enlèvement.\n" : '') . implode("\n", array_map(fn($p) => base_site() . $p, $ph)) . "\nÀ traiter dans la caisse, onglet Locations > Dépôts.");
    rep(['ok' => true]);

  // ——— Caisse (clé X-Cle-Caisse) ———
  case 'c_tout':   // tout ce que l'onglet Locations de la caisse affiche
    caisse();
    rep(['outils' => array_map('outil_public', q('SELECT * FROM outils ORDER BY type, cat, nom')->fetchAll()),
      'membres' => array_map('public_membre', q('SELECT * FROM membres ORDER BY nom')->fetchAll()),
      'reservations' => q("SELECT * FROM reservations WHERE fin > ? OR statut IN ('demandee','en_cours') ORDER BY debut", [date('Y-m-d', strtotime('-120 days'))])->fetchAll(),
      'depots' => array_map(fn($d) => ['photos' => array_map(fn($p) => base_site() . $p, json_decode($d['photos'] ?: '[]', true) ?: [])] + $d,
        q("SELECT * FROM depots WHERE statut IN ('nouveau','accepte') OR maj > ? ORDER BY cree DESC", [date('Y-m-d', strtotime('-60 days'))])->fetchAll()),
      'heure' => maintenant()]);

  case 'c_depot':  // suite donnée à une proposition de dépôt
    caisse();
    $c = corps();
    if (!in_array($c['statut'] ?? '', ['nouveau', 'accepte', 'refuse', 'recu'])) err('Statut inconnu.');
    q('UPDATE depots SET statut=?, note=?, maj=? WHERE id=?', [$c['statut'], (string)($c['note'] ?? ''), maintenant(), (int)($c['id'] ?? 0)]);
    rep(['ok' => true]);

  case 'c_photo':  // photo d'un outil, de la camionnette ou de l'atelier, envoyée depuis la caisse
    caisse();
    $p = ($t = fichiers('photo')) ? sauver_photo($t[0], 'outils') : null;
    if (!$p) err('Photo refusée (JPEG, PNG ou WebP, 8 Mo au plus).');
    rep(['url' => base_site() . $p]);

  case 'c_outil':  // créer ou modifier un outil (ou la camionnette, l'atelier)
    caisse();
    $c = corps(); $ref = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', (string)($c['ref'] ?? '')));
    if (!$ref || empty($c['nom'])) err('Référence et nom obligatoires.');
    $num = fn($k) => isset($c[$k]) && $c[$k] !== '' && $c[$k] !== null ? (float)str_replace(',', '.', (string)$c[$k]) : null;
    $v = [in_array($c['type'] ?? '', TYPES) ? $c['type'] : 'outil', mb_substr((string)$c['nom'], 0, 190), mb_substr((string)($c['cat'] ?? ''), 0, 80),
      (string)($c['descr'] ?? ''), $num('prix_jour'), $num('prix_we'), $num('prix_periode'), ($c['tarif'] ?? '') === '' ? null : (int)$c['tarif'], $num('caution'), max(1, (int)($c['qte'] ?? 1)),
      mb_substr((string)($c['etat'] ?? ''), 0, 80), json_encode(array_values((array)($c['photos'] ?? [])), JSON_UNESCAPED_SLASHES), empty($c['en_ligne']) ? 0 : 1, maintenant()];
    if (q('SELECT 1 FROM outils WHERE ref=?', [$ref])->fetch())
      q('UPDATE outils SET type=?, nom=?, cat=?, descr=?, prix_jour=?, prix_we=?, prix_periode=?, tarif=?, caution=?, qte=?, etat=?, photos=?, en_ligne=?, maj=? WHERE ref=?', [...$v, $ref]);
    else q('INSERT INTO outils (type, nom, cat, descr, prix_jour, prix_we, prix_periode, tarif, caution, qte, etat, photos, en_ligne, maj, ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [...$v, $ref]);
    rep(outil_public(q('SELECT * FROM outils WHERE ref=?', [$ref])->fetch()));

  case 'c_outils':  // import en bloc (reprise de l'ancienne outilthèque)
    caisse();
    $n = 0;
    foreach ((array)(corps()['outils'] ?? []) as $o) {
      if (empty($o['ref']) || empty($o['nom']) || q('SELECT 1 FROM outils WHERE ref=?', [$o['ref']])->fetch()) continue;
      q('INSERT INTO outils (ref, type, nom, cat, descr, prix_jour, prix_we, prix_periode, tarif, caution, qte, etat, photos, en_ligne, maj) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [$o['ref'], $o['type'] ?? 'outil', $o['nom'], $o['cat'] ?? '', $o['descr'] ?? '', $o['prix_jour'] ?? null, $o['prix_we'] ?? null, $o['prix_periode'] ?? null, $o['tarif'] ?? null,
          $o['caution'] ?? null, (int)($o['qte'] ?? 1), $o['etat'] ?? '', json_encode($o['photos'] ?? [], JSON_UNESCAPED_SLASHES), (int)($o['en_ligne'] ?? 1), maintenant()]);
      $n++;
    }
    rep(['ajoutes' => $n]);

  case 'c_statut':  // confirmer, refuser, sortie, retour… d'une réservation
    caisse();
    $c = corps(); $r = q('SELECT * FROM reservations WHERE id=?', [(int)($c['id'] ?? 0)])->fetch();
    if (!$r) err('Réservation introuvable.', 404);
    $st = (string)($c['statut'] ?? '');
    if (!in_array($st, STATUTS)) err('Statut inconnu.');
    $d = date_ok((string)($c['debut'] ?? '')) ?? $r['debut']; $f = date_ok((string)($c['fin'] ?? '')) ?? $r['fin'];
    $o = q('SELECT * FROM outils WHERE ref=?', [$r['ref']])->fetch();
    if (in_array($st, OCCUPE) && !in_array($r['statut'], OCCUPE) && pris($r['ref'], $d, $f, (int)$r['id']) >= (int)($o['qte'] ?? 1))
      err('Conflit : déjà réservé sur cette période.', 409);
    $m = q('SELECT * FROM membres WHERE id=?', [$r['membre']])->fetch();
    $code = $r['code_acces']; $ancien = $r['statut'];
    if ($st === 'confirmee' && ($o['type'] ?? '') === 'camionnette' && !$code) $code = deverrouillage($r + ['debut' => $d, 'fin' => $f], $m);
    q('UPDATE reservations SET statut=?, debut=?, fin=?, note=?, code_acces=?, maj=? WHERE id=?', [$st, $d, $f, (string)($c['note'] ?? $r['note']), $code, maintenant(), $r['id']]);
    $r = q('SELECT * FROM reservations WHERE id=?', [$r['id']])->fetch();
    if ($st !== $ancien && in_array($st, ['confirmee', 'refusee']) && $m) {
      $t = $st === 'confirmee'
        ? "Bonne nouvelle : votre réservation est confirmée : " . libelle($r) . ".\n" . ($code ? "Accès à la camionnette : $code\n" : '') . (($o['type'] ?? '') === 'camionnette' ? "La clé est dans la boîte à clé à l'entrée du Comptoir.\n" : '')
        : "Nous ne pouvons malheureusement pas accepter votre demande : " . libelle($r) . ".\n" . ($r['note'] ? "Motif : {$r['note']}\n" : '');
      envoyer_mail($m['email'], 'Votre réservation au Comptoir des Matériaux', "Bonjour {$m['nom']},\n\n$t\nComptoir des Matériaux · La Pile asbl");
    }
    rep($r);

  case 'c_reserver':  // réservation prise au comptoir ou au téléphone, pour un membre
    caisse();
    $c = corps(); $o = q('SELECT * FROM outils WHERE ref=?', [(string)($c['ref'] ?? '')])->fetch();
    $d = date_ok((string)($c['debut'] ?? '')); $f = date_ok((string)($c['fin'] ?? ''));
    if (!$o || !$d || !$f || $f <= $d || !q('SELECT 1 FROM membres WHERE id=?', [(int)($c['membre'] ?? 0)])->fetch()) err('Outil, membre ou dates invalides.');
    if (pris($o['ref'], $d, $f) >= (int)$o['qte']) err('Conflit : déjà réservé sur cette période.', 409);
    q("INSERT INTO reservations (membre, ref, debut, fin, statut, message, cree, maj) VALUES (?,?,?,?,'confirmee',?,?,?)", [(int)$c['membre'], $o['ref'], $d, $f, 'Pris au comptoir', maintenant(), maintenant()]);
    rep(q('SELECT * FROM reservations WHERE id=?', [db()->lastInsertId()])->fetch());

  case 'c_membre':  // créer (au comptoir) ou activer / prolonger / suspendre un membre
    caisse();
    $c = corps();
    if (empty($c['id'])) {
      $email = strtolower(trim((string)($c['email'] ?? '')));
      if (!filter_var($email, FILTER_VALIDATE_EMAIL) || empty($c['nom'])) err('Nom et e-mail obligatoires.');
      if (q('SELECT 1 FROM membres WHERE email=?', [$email])->fetch()) err('Un membre existe déjà avec cet e-mail.');
      // Mot de passe à définir par le membre (« mot de passe oublié » à venir) : on met un aléa.
      q('INSERT INTO membres (email, nom, tel, adresse, mdp, statut, jusqua, cree) VALUES (?,?,?,?,?,?,?,?)', [$email, (string)$c['nom'], (string)($c['tel'] ?? ''), (string)($c['adresse'] ?? ''),
        password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT), 'actif', ($c['jusqua'] ?? '') ?: null, maintenant()]);
      $c['id'] = db()->lastInsertId();
    } else {
      $m = q('SELECT * FROM membres WHERE id=?', [(int)$c['id']])->fetch() ?: err('Membre introuvable.', 404);
      q('UPDATE membres SET nom=?, tel=?, adresse=?, statut=?, jusqua=?, note=? WHERE id=?', [(string)($c['nom'] ?? $m['nom']), (string)($c['tel'] ?? $m['tel']), (string)($c['adresse'] ?? $m['adresse']),
        in_array($c['statut'] ?? '', ['en_attente', 'actif', 'suspendu']) ? $c['statut'] : $m['statut'], array_key_exists('jusqua', $c) ? (($c['jusqua'] ?: null)) : $m['jusqua'], (string)($c['note'] ?? $m['note']), $m['id']]);
    }
    rep(public_membre(q('SELECT * FROM membres WHERE id=?', [(int)$c['id']])->fetch()));

  case 'c_publier':  // la caisse dépose stock.json ou outils.json dans le site
    caisse();
    global $CFG;
    $nom = (string)($_GET['f'] ?? '');
    if (!in_array($nom, ['stock.json', 'outils.json'])) err('Fichier non permis.');
    $t = file_get_contents('php://input');
    if (!is_array(json_decode($t, true))) err('JSON invalide.');
    if (file_put_contents(__DIR__ . '/' . $CFG['dossier_site'] . '/' . $nom, $t, LOCK_EX) === false) err('Écriture impossible dans le dossier du site.', 500);
    rep(['ok' => true, 'octets' => strlen($t)]);

  default:
    err('Action inconnue.', 404);
}
