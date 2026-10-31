# Ajoute au catalogue de la caisse les articles du site (comptoir/donnees.json) qu'il ne connaît pas.
# Le catalogue de la caisse vient de l'export Impulsion du 14/10 ; le site a été relevé plus tard et contient des articles en plus.
# Sans eux, la caisse ne peut pas les vendre et redonne leurs références aux nouvelles fiches de l'app.
# Usage : python3 outils/caisse_complete.py
import json, re, os
racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fc = os.path.join(racine, 'caisse', 'catalogue.json')
cat = json.load(open(fc))
connus = {a['r'] for a in cat}
site = json.load(open(os.path.join(racine, 'comptoir', 'donnees.json')))
n = 0
for a in site:
    r = a['r']
    if r in connus or not re.match(r'^[A-Z]+\d+$', r):
        continue
    m = re.match(r'^\s*[\d.,]+\s*(.*)$', a.get('st') or '')
    u = (m.group(1) if m else '').strip() or 'pièce'
    u = 'pièce' if u.startswith('pièce') else u
    x = {'r': r, 'n': re.sub(r' – [\d,]+( × [\d,]+)*( cm)?$', '', a['t']), 'p': a.get('p') or 0, 'c': re.match(r'^[A-Z]+', r).group(0), 's': a.get('s'), 'u': u}
    if a.get('m'): x['m'] = a['m']
    for k, d in (('L', 'd1'), ('l', 'd2'), ('h', 'd3')):
        if a.get(d): x[k] = str(a[d]).rstrip('0').rstrip('.')
    if a.get('v'): x['f'] = a['v'].replace('/thumbs/', '/')
    cat.append(x); connus.add(r); n += 1
json.dump(cat, open(fc, 'w'), ensure_ascii=False, separators=(',', ':'))
print(n, 'articles ajoutés à la caisse,', len(cat), 'au total')
