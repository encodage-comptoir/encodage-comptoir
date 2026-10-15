# Lecture seule : télécharge les vignettes des photos du catalogue public (liste prise dans site/page.html).
import os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
BASE = 'https://www.la-pile.be'
UA = {'User-Agent': 'Mozilla/5.0 (encodage-comptoir, lecture du catalogue)'}
os.makedirs('site/vignettes', exist_ok=True)
page = open('site/page.html', encoding='utf-8').read()
thumbs = sorted(set(re.findall(r'src="(/sites/lapile/gallery_images/thumbs/[^"]+)"', page)))
print(len(thumbs), 'vignettes à lire', flush=True)
def get(u):
    f = 'site/vignettes/' + u.rsplit('/', 1)[1]
    for essai in range(2):
        try:
            open(f, 'wb').write(urllib.request.urlopen(urllib.request.Request(BASE + u, headers=UA), timeout=15).read())
            return 1
        except Exception as e:
            print('ERR', u, e, flush=True); time.sleep(2)
    return 0
with ThreadPoolExecutor(4) as ex:
    print(sum(ex.map(get, thumbs)), 'lues', flush=True)
