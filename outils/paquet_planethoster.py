# Paquet à déposer dans public_html chez PlanetHoster (www.comptoir-materiaux.be).
# Usage : python3 outils/paquet_planethoster.py <dossier de sortie>
# Produit comptoir-materiaux.zip (contenu de public_html) et INSTALLATION.txt (avec la clé de la caisse, à garder pour soi).
#   /            le site (dossier comptoir/)
#   /api/        l'API PHP, avec un config.php prêt (clé de la caisse tirée au hasard)
#   /caisse/     la caisse
#   /encodage/   l'app d'encodage (index.html de la racine du dépôt + essai/ pour le modèle de reconnaissance)
import sys, os, zipfile, secrets, glob, datetime, subprocess

racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sortie = sys.argv[1]
os.makedirs(sortie, exist_ok=True)
zp = os.path.join(sortie, 'comptoir-materiaux.zip')
cle = os.environ.get('CLE_CAISSE') or secrets.token_urlsafe(24)   # garder la même clé d'un paquet à l'autre
# Mot de passe des pages /caisse/ et /encodage/ (le navigateur le demande une fois puis le retient).
UTIL = 'comptoir'
mdp = os.environ.get('MDP_ACCES') or '-'.join(secrets.choice(['pile', 'bois', 'brique', 'porte', 'tuile', 'chene', 'vis', 'clou', 'evier', 'poutre', 'dalle', 'zinc']) + str(secrets.randbelow(90) + 10) for _ in range(3))
HTPASSWD = UTIL + ':' + subprocess.run(['openssl', 'passwd', '-apr1', mdp], capture_output=True, text=True, check=True).stdout.strip() + '\n'
PROTEGE = """# Accès réservé à l'équipe du Comptoir (identifiant et mot de passe dans INSTALLATION.txt).
AuthType Basic
AuthName "Comptoir des Materiaux - equipe"
AuthUserFile /home/hebkdjjkdw/public_html/api/donnees/.htpasswd
Require valid-user
"""

HTACCESS = """# www.comptoir-materiaux.be : https et adresse avec www.
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^www\\. [NC]
RewriteRule ^ https://www.comptoir-materiaux.be%{REQUEST_URI} [L,R=301]
Options -Indexes
DirectoryIndex index.html index.php
# Les fichiers de l'app et de la caisse changent : le navigateur redemande toujours le HTML et le JS.
<FilesMatch "\\.(html|js|json|webmanifest)$">
  Header set Cache-Control "no-cache"
</FilesMatch>
"""

CONFIG = f"""<?php
// Configuration de l'API sur PlanetHoster. Ce fichier n'est jamais servi au public (voir api/.htaccess).
return [
  'cle_caisse' => '{cle}',
  'mail_equipe' => 'audrey@la-pile.be',
  'mail_expediteur' => 'info@comptoir-materiaux.be',
  'dsn' => null,
  'dossier_site' => '..',
  'deverrouillage_url' => '',
  'deverrouillage_jeton' => '',
];
"""

def ajouter(z, src, dest):
    if os.path.isdir(src):
        for d, _, fs in os.walk(src):
            for f in fs:
                p = os.path.join(d, f)
                z.write(p, os.path.join(dest, os.path.relpath(p, src)))
    else:
        z.write(src, dest)

with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('.htaccess', HTACCESS)
    ajouter(z, os.path.join(racine, 'comptoir'), '')
    for f in ['index.php', '.htaccess', '.user.ini', 'config.exemple.php', 'LISEZMOI.md', 'donnees/.htaccess']:
        ajouter(z, os.path.join(racine, 'api', f), 'api/' + f)
    z.writestr('api/config.php', CONFIG)
    # Les envois de l'app déjà faits pendant l'essai (chiffrés : lisibles avec l'ancienne phrase secrète).
    for f in glob.glob(os.path.join(racine, 'donnees', 'envois', '*.json')):
        z.write(f, 'api/donnees/fichiers/envois/' + os.path.basename(f))
    ajouter(z, os.path.join(racine, 'caisse'), 'caisse')
    z.writestr('api/donnees/.htpasswd', HTPASSWD)
    z.writestr('caisse/.htaccess', PROTEGE)
    z.writestr('encodage/.htaccess', PROTEGE)
    for f in ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']:
        ajouter(z, os.path.join(racine, f), 'encodage/' + f)
    for f in ['poids.js', 'annonces.json', 'vendor', 'modeles']:
        ajouter(z, os.path.join(racine, 'essai', f), 'encodage/essai/' + f)

open(os.path.join(sortie, 'INSTALLATION.txt'), 'w').write(f"""Comptoir des Matériaux : installation sur PlanetHoster
Paquet du {datetime.date.today().strftime('%d/%m/%Y')}

1. Dans le panneau PlanetHoster (N0C), ouvrir le Gestionnaire de fichiers, dossier public_html.
2. Téléverser comptoir-materiaux.zip, puis clic droit > Extraire, directement dans public_html.
3. Ouvrir https://www.comptoir-materiaux.be : le site doit s'afficher.

Clé de la caisse (à garder pour soi, ne pas l'envoyer par mail ni la publier) :

    {cle}

4. Sur le PC du comptoir, AVANT de changer d'adresse : dans l'ancienne caisse (encodage-comptoir.github.io/…/caisse/),
   Réglages > « Télécharger une sauvegarde ». Le navigateur range les ventes par adresse : la nouvelle caisse démarre vide.
   Puis ouvrir https://www.comptoir-materiaux.be/caisse/ > Réglages > « Restaurer » ce fichier,
   et Liaison avec le site : nom de l'appareil + la clé ci-dessus > Enregistrer et synchroniser.
   La caisse envoie alors tout ce qu'elle contient (ventes, stock) au serveur. À faire sur chaque appareil de caisse.
5. Sur les téléphones (Audrey, Saïd) : d'abord envoyer les fiches « À envoyer » depuis l'ancienne app (elles ne
   suivent pas le changement d'adresse). Puis ouvrir https://www.comptoir-materiaux.be/encodage/
   Réglages > Liaison avec la caisse : la même clé > Enregistrer. Puis « Ajouter à l'écran d'accueil ».
6. Dans la caisse, onglet Locations > Outils : « Reprendre l'ancienne outilthèque » une fois, pour charger les 45 outils.

Mot de passe des pages Caisse et Encodage (demandé une fois par appareil, le navigateur le retient) :

    identifiant  {UTIL}
    mot de passe {mdp}

Adresses :
  Site       https://www.comptoir-materiaux.be
  Caisse     https://www.comptoir-materiaux.be/caisse/
  Encodage   https://www.comptoir-materiaux.be/encodage/
  Comptes    stockés dans api/donnees/ (base SQLite et fichiers) : à sauvegarder de temps en temps
             (Gestionnaire de fichiers > api/donnees > Compresser > Télécharger).
""")
print(zp, round(os.path.getsize(zp) / 1e6, 1), 'Mo')
