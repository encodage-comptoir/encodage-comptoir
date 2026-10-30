<?php
// Page de connexion des pages réservées à l'équipe (/caisse/ et /encodage/).
// Le .htaccess de ces dossiers renvoie ici tant que le cookie comptoir_acces n'a pas la bonne valeur.
$CFG = is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$retour = $_GET['retour'] ?? $_POST['retour'] ?? '/caisse/';
if (!in_array($retour, ['/caisse/', '/encodage/'], true)) $retour = '/caisse/';
$erreur = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($CFG['acces_jeton'])) {
  $mdp = trim($_POST['mdp'] ?? '');
  if (hash_equals($CFG['acces_hash'], hash('sha256', $CFG['acces_sel'] . $mdp))) {
    setcookie('comptoir_acces', $CFG['acces_jeton'], ['expires' => time() + 400 * 86400, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    header('Location: ' . $retour);
    exit;
  }
  sleep(2);
  $erreur = 'Mot de passe incorrect.';
}
header('Cache-Control: no-store');
?><!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Comptoir des Matériaux · équipe</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#009fac;font-family:system-ui,sans-serif;color:#1d2b2d}
form{background:#fff;border-radius:14px;padding:28px 24px;width:min(340px,calc(100vw - 32px));box-sizing:border-box;box-shadow:0 8px 30px #0003}
h1{font-size:1.25rem;margin:0 0 6px}p{margin:0 0 18px;color:#556}
input{width:100%;box-sizing:border-box;font-size:1.1rem;padding:12px;border:2px solid #cfd8da;border-radius:10px}
button{margin-top:14px;width:100%;font-size:1.1rem;font-weight:700;padding:12px;border:0;border-radius:10px;background:#f6c213;color:#1d2b2d;cursor:pointer}
.err{color:#b00020;margin:10px 0 0}
</style></head><body>
<form method="post">
  <h1>Comptoir des Matériaux</h1>
  <p><?= $retour === '/encodage/' ? "App d'encodage" : 'Caisse' ?> : réservé à l'équipe.</p>
  <input type="hidden" name="retour" value="<?= htmlspecialchars($retour) ?>">
  <input type="password" name="mdp" placeholder="Mot de passe" autocomplete="current-password" autofocus required>
  <?= $erreur ? '<p class="err">' . $erreur . '</p>' : '' ?>
  <button>Entrer</button>
</form>
</body></html>
