# Reprend les outils de l'ancienne outilthèque (outils.la-pile.be, lue par outils/outilheque.mjs) dans comptoir/outils.json,
# au format de l'API du site et de la caisse. Ajoute la camionnette et l'atelier partagé (prix à compléter par l'équipe).
# Usage : python3 outils/outilheque_reprise.py donnees/outilheque-source/requetes.json comptoir/outils.json
import sys, json, re
src, dest = sys.argv[1:3]
items = {}
for x in json.load(open(src)):
    m = re.search(r'/api/guest/items/(\d+)\?', x['u'])
    if m and x['status'] == 200:
        it = json.loads(x['body'])['items'][0]
        items[it['id']] = it

FAMILLES = [  # nom de l'outil → famille, à la place de « Divers »
    (r'pneumatique', 'Outils pneumatiques'), (r'perceuse|perforateur|foreuse|visseuse|burineuse|riveteuse', 'Perçage et vissage'),
    (r'scie|tron[cç]onneuse|coupe', 'Sciage et découpe'), (r'ponceuse|polisseuse|lustreuse', 'Ponçage'),
    (r'meuleuse', 'Ponçage'), (r'soud', 'Soudure'), (r'[ée]chelle|escabeau', 'Échelles'),
    (r'tapiss|d[ée]coll|calfeutr|silicone', 'Finitions'), (r'tour à bois|rabot|d[ée]fonceuse', 'Menuiserie'), (r'radiateur|chauff', 'Chauffage'), (r'ventouse|tournevis|valise|cl[ée]', 'Petit outillage'),
]
ETAT = {'new': 'Neuf', 'good': 'Bon état', 'used': "Usagé, en état de marche"}
def famille(it):
    t = it['title'].lower()
    for motif, f in FAMILLES:
        if re.search(motif, t):
            return f
    c = (it.get('category') or [{}])[0].get('title', '')
    return c if c and c != 'Divers' else 'Divers'

out = []
for i, it in sorted(items.items()):
    d = it['description'] or ''
    m = re.match(r'\s*(?:TARIF\s+)?CAT[ÉE]GORI[ER]\s*(\d)\s*:?\s*', d, re.I)
    tarif = int(m.group(1)) if m else (2 if it['price'] >= 16 else 1)
    d = d[m.end():].strip() if m else d.strip()
    d = re.sub(r'\s*\n\s*', '\n', d).strip(' .') or ''
    titre = it['title'].strip()
    if titre.isupper():
        titre = titre.capitalize()
    out.append({'ref': f'LOC{i}', 'type': 'outil', 'nom': titre, 'cat': famille(it), 'descr': d,
                'prix_jour': None, 'prix_we': None, 'prix_periode': float(it['price']), 'tarif': tarif,
                'caution': None, 'qte': int(it.get('available_quantity') or 1), 'etat': ETAT.get(it['condition'], ''),
                'photos': [p['path'] for p in sorted(it['pictures'], key=lambda p: p['order'])], 'en_ligne': 1,
                'source': f'https://outils.la-pile.be/items/{i}'})
out += [
    {'ref': 'CAMION', 'type': 'camionnette', 'nom': 'Camionnette partagée', 'cat': 'Transport',
     'descr': "Pour transporter vos achats du Comptoir ou pour vos besoins personnels.\nOuverture avec l'appli Wibee, même quand le Comptoir est fermé.\nFiat Ducato aux couleurs du Comptoir.",
     'prix_jour': None, 'prix_we': None, 'prix_periode': None, 'tarif': None, 'caution': None, 'qte': 1, 'etat': '', 'photos': ['img/camionnette.jpg'], 'en_ligne': 1},
    {'ref': 'ATELIER', 'type': 'atelier', 'nom': 'Atelier partagé', 'cat': 'Atelier',
     'descr': "Un atelier équipé et son parc machines : scies à ruban, scie à panneaux, scie à onglets, perceuse à colonne, établis…",
     'prix_jour': None, 'prix_we': None, 'prix_periode': None, 'tarif': None, 'caution': None, 'qte': 1, 'etat': '', 'photos': ['img/atelier.jpg', 'img/atelier-2.jpg', 'img/atelier-3.jpg'], 'en_ligne': 1},
]
json.dump(out, open(dest, 'w'), ensure_ascii=False, indent=1)
print(len(out), 'fiches ;', sum(o['type'] == 'outil' for o in out), 'outils')
