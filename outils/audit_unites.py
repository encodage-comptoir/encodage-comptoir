# Liste pour l'équipe les articles dont l'unité, le stock et le prix ne collent pas (rien n'est modifié dans Impulsion).
# Usage : python3 outils/audit_unites.py catalogue.csv sortie.csv
import sys, csv, re

src, dest = sys.argv[1:3]
num = lambda x: float(str(x).replace(',', '.')) if str(x).strip() else 0.0
NORMAL = {'pc': 'pièce', 'piece': 'pièce', 'piéce': 'pièce', 'pièce': 'pièce', 'pièces': 'pièce', 'm2': 'm²', 'm²': 'm²', 'mètre²': 'm²',
          'm': 'm courant', 'ml': 'm courant', 'mètre': 'm courant', 'mètres': 'm courant', 'm courant': 'm courant', 'lot': 'lot', 'sac': 'sac', 'kg': 'kg', 'rouleaux': 'rouleau'}
lignes = []
for r in csv.DictReader(open(src, encoding='utf-8-sig'), delimiter=';'):
    if r['Statut'] == 'à retirer':
        continue
    brute, st = r['Unité actuelle'].strip(), r['Stock'].strip()
    u = NORMAL.get(brute.lower(), '')
    texte = r['Titre proposé'] + ' ' + r['Description proposée']
    constat = []
    if not u:
        constat.append((f'Unité « {brute} » non reconnue', f"Choisir une unité claire (proposition : {r['Unité proposée']})"))
    if u == 'm²' and st.isdigit():
        n = int(st)
        L, l = num(r['Largeur (cm)']), num(r['Profondeur (cm)']) or num(r['Hauteur (cm)'])
        aire = n * L * l / 1e4 if L and l else 0
        compte = re.search(r'(\d+) (carreaux|lames|plaques|dalles|panneaux)', texte)
        m2 = re.search(r'(\d+(?:,\d+)?) ?m²', texte)
        if aire and ((compte and int(compte.group(1)) == n) or (m2 and abs(num(m2.group(1)) - aire) <= 0.15 * aire + 0.05)):
            constat.append((f'Prix au m² mais stock compté en pièces : {n} pièces ≈ {aire:.2f} m²'.replace('.', ','),
                            f'Mettre le stock en m² ({aire:.2f}) ou vendre à la pièce ({num(r["Prix actuel TTC (€)"]) * L * l / 1e4:.2f} € la pièce)'.replace('.', ',')))
        elif not (m2 and abs(num(m2.group(1)) - n) < 0.5):
            constat.append((f'Prix au m², stock {n} : m² ou pièces ?', 'Compter au Comptoir et corriger le stock'))
        elif L and l and n * L * l / 1e4 < n / 3:
            constat.append((f'Stock {n} lu comme des m² ({n} pièces ne feraient que {n * L * l / 1e4:.2f} m²)'.replace('.', ','), 'Vérifier : m² ou pièces ?'))
    d = re.search(r'(\d+) (pièces?|carreaux|lames) (?:disponibles?|en stock)', texte)
    if d and st.isdigit() and int(d.group(1)) != int(st):
        constat.append((f'Le texte annonce {d.group(0)}, Impulsion en compte {st}', 'Recompter'))
    if u and r['Unité proposée'] and r['Unité proposée'] != u:
        constat.append((f"Unité proposée : {r['Unité proposée']} au lieu de {u}", r['Pourquoi cette unité'] or 'À décider'))
    for c, f in constat:
        lignes.append([r['Référence'], r['Réf. Impulsion actuelle'], r['Titre proposé'], brute, st, r['Prix actuel TTC (€)'], c, f])
with open(dest, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Référence', 'Réf. Impulsion actuelle', 'Article', 'Unité Impulsion', 'Stock Impulsion', 'Prix TTC', 'Constat', 'À faire'])
    w.writerows(lignes)
import collections
print(len(lignes), 'lignes', collections.Counter(l[6].split(':')[0].split(' (')[0][:40] for l in lignes).most_common())
