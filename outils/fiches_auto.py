# Référence pour compléter seule une nouvelle fiche dans la caisse (caisse/auto.js) :
# pour chaque article du catalogue harmonisé, sa famille, ses mots, sa surface, le prix du neuf estimé, l'accroche et les idées ;
# plus les facteurs CO₂ (ÖKOBAUDAT) utilisés par outils/site_co2.py.
# Usage : python3 outils/fiches_auto.py /mnt/project-files/comptoir/catalogue/catalogue.json
import json, os, re, sys, unicodedata
from site_co2 import F

racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(sys.argv[1]))
VIDES = set('avec pour dans sans plus vendu vendue lot les des une sur par cm de du la le et en'.split())

def sans(s):
    return unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()

def n(x):
    try: return float(str(x).replace(',', '.'))
    except ValueError: return 0.0

A = []
for a in cat:
    pre = (re.match(r'^[A-Z]+', a['ref'] or '') or [None])[0]
    if not pre: continue
    d = sorted([n(a['L']), n(a['l']), n(a['h'])], reverse=True)
    x = {'c': pre, 'f': a['famille'], 'w': sorted({w for w in re.split(r'[^a-z0-9]+', sans(a['titre'] + ' ' + ' '.join(a.get('mots_cles') or []))) if len(w) >= 3 and not w.isdigit() and w not in VIDES}),
         'u': a['unite'], 'm': a['matiere']}
    t = [w for w in re.split(r'[^a-z0-9]+', sans(a['titre'])) if len(w) >= 3 and not w.isdigit() and w not in VIDES]
    if t: x['t'] = t[0]
    if d[0] and d[1]: x['s'] = round(d[0] * d[1] / 1e4, 3)
    ne = a.get('neuf') or {}
    if ne.get('neuf_max'): x['mn'], x['mx'] = ne['neuf_min'], ne['neuf_max']
    if a.get('accroche'): x['ac'] = a['accroche']
    if a.get('idees'): x['i'] = a['idees'][:3]
    A.append(x)
json.dump({'F': {k: [round(v[0], 3), v[1], v[2]] for k, v in F.items()}, 'A': A}, open(os.path.join(racine, 'caisse', 'reference.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(A), 'articles de référence,', os.path.getsize(os.path.join(racine, 'caisse', 'reference.json')) // 1024, 'Ko')
