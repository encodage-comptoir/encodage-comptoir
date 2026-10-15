# Lecture seule du catalogue public : liste par catégorie (même requête que les boutons du site) et vignettes des photos.
import os, re, json, time, urllib.request, urllib.parse
BASE = 'https://www.la-pile.be'
UA = {'User-Agent': 'Mozilla/5.0 (encodage-comptoir, lecture du catalogue)'}
CATS = {1: 'Carrelage', 5: 'Portes', 17: 'Chassis', 2: 'Electricité', 3: 'Sanitaire', 11: 'Gros œuvre', 15: 'Toiture', 4: 'Chauffage',
        6: 'Bois', 12: 'Parquet & bardage', 7: 'Quincaillerie', 8: 'Outillage', 9: 'Isolant', 10: 'Divers', 19: 'LAMBRIS/ Plafond', 20: 'Électro'}
os.makedirs('site/categories', exist_ok=True)
os.makedirs('site/vignettes', exist_ok=True)
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
op.open(urllib.request.Request(BASE + '/fr/comptoir-des-materiaux.htm', headers=UA), timeout=30).read()
for cid, nom in CATS.items():
    data = urllib.parse.urlencode({'type': 'toggleCategory', 'cid': cid}).encode()
    r = op.open(urllib.request.Request(BASE + '/ajaxCalls.php', data=data, headers={**UA, 'X-Requested-With': 'XMLHttpRequest'}), timeout=30).read()
    open(f'site/categories/{cid}.html', 'wb').write(r)
    print(cid, nom, len(r))
    time.sleep(1)
# remettre « toutes les catégories » puis lire la page complète
data = urllib.parse.urlencode({'type': 'toggleCategory', 'cid': 0}).encode()
open('site/categories/0.html', 'wb').write(op.open(urllib.request.Request(BASE + '/ajaxCalls.php', data=data, headers=UA), timeout=30).read())
page = open('site/page.html', encoding='utf-8').read()
thumbs = sorted(set(re.findall(r'src="(/sites/lapile/gallery_images/thumbs/[^"]+)"', page)))
for u in thumbs:
    f = 'site/vignettes/' + u.rsplit('/', 1)[1]
    if not os.path.exists(f):
        try:
            open(f, 'wb').write(op.open(urllib.request.Request(BASE + u, headers=UA), timeout=30).read())
        except Exception as e:
            print('ERR', u, e)
        time.sleep(0.2)
print(len(thumbs), 'vignettes')
