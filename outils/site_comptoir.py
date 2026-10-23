# Génère la maquette du site du Comptoir des Matériaux (pages statiques) à partir du catalogue harmonisé.
# Usage : python3 outils/site_comptoir.py catalogue.json catalogue.csv comptoir/
import sys, os, json, csv, html, re, shutil, unicodedata, math
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from site_co2 import co2, NOTE as CO2_NOTE

src_json, src_csv, out = sys.argv[1:4]
BASE = 'https://encodage-comptoir.github.io/encodage-comptoir/comptoir/'
PILE = 'https://www.la-pile.be'
cat = json.load(open(src_json))
unite_act = {r['Référence']: r['Unité actuelle'] for r in csv.DictReader(open(src_csv, encoding='utf-8-sig'), delimiter=';')}
esc = lambda s: html.escape(str(s or ''), quote=True)

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def prix_num(p):
    try:
        return float(str(p).replace(',', '.'))
    except ValueError:
        return 0.0

def unite_site(u):
    u = (u or '').strip().lower()
    if u in ('pc', 'piece', 'piéce', 'pièce', 'pièces', 'pieces'):
        return 'pièce'
    if u in ('m2', 'm²', 'mètre²', 'metre²'):
        return 'm²'
    if u in ('m', 'ml', 'mètre', 'mètres', 'metre', 'metres', 'm courant'):
        return 'm courant'
    if u in ('lot', 'sac', 'kg', 'rouleau', 'rouleaux'):
        return u.rstrip('x') if u != 'rouleaux' else 'rouleau'
    return ''

def pluriel(n, u):
    if u == 'm courant':
        return 'm'
    if u == 'rouleau':
        return 'rouleaux' if n > 1 else u
    if u == 'carreau':
        return 'carreaux' if n > 1 else u
    return u + ('s' if n > 1 and u in ('pièce', 'lot', 'sac', 'lame') else '')

def nombre(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.').replace('.', ',')

def trois(a):
    """L1 ≥ L2 ≥ L3 : les mesures rangées de la plus grande à la plus petite (cm), comme dans l'app d'encodage."""
    v = [x for x in (a['L'], a['l'], a['h']) if prix_num(x)]
    if len(v) < 3 and prix_num(a['epaisseur']) and a['epaisseur'] not in v:
        v.append(a['epaisseur'])
    v = sorted(v, key=lambda x: -prix_num(x))
    return v + [''] * (3 - len(v))

def stock_vente(a):
    """Stock exprimé dans l'unité de vente (celle du prix) + texte affiché.
    Dans Impulsion, le carrelage et le parquet sont vendus au m² mais comptés en carreaux ou en lames :
    on le reconnaît quand le texte compte les carreaux ou quand stock × surface d'une pièce = m² annoncés."""
    st = a['stock']
    if not st.isdigit() or st in ('99', '100') or st == '0':
        return 0, ''
    n, u = int(st), a['_unite']
    if u == 'm²':
        L, l = map(prix_num, trois(a)[:2])
        texte = a['titre'] + ' ' + a['description']
        compte = re.search(r'(\d+) (carreaux|lames|plaques|dalles|panneaux)', texte)
        m2 = re.search(r'(\d+(?:,\d+)?) ?m²', texte)
        aire = n * L * l / 1e4 if L and l else 0
        if aire and ((compte and int(compte.group(1)) == n) or (m2 and abs(prix_num(m2.group(1)) - aire) <= 0.15 * aire + 0.05)):
            nom = {'Carrelage': 'carreau'}.get(a['famille'], 'lame' if a['famille'] == 'Parquet et lambris' else 'pièce')
            return round(aire, 2), f"{n} {pluriel(n, nom)}, soit ≈ {nombre(aire)} m²"
        if m2 and abs(prix_num(m2.group(1)) - n) < 0.5:
            return n, f'{n} m²'
        return 0, f'{n} (en pièces ou en m² ? à vérifier au Comptoir)'
    return n, f'{n} {pluriel(n, u)}'

def pose(a):
    """Briques, pavés et carrelage : nombre de pièces par m² posé (hypothèse affichée), ou None."""
    t = a['titre'].lower()
    if a['famille'] == 'Carrelage' and not re.search(r'brique|pavé|klinker', t):
        # carreaux : surface d'un carreau L1 × L2, comme le m² du prix d'Impulsion (l'épaisseur n'est pas nécessaire)
        L1, L2 = map(prix_num, trois(a)[:2])
        if not (L1 and L2):
            return None
        par_m2 = 1e4 / (L1 * L2)
        return par_m2, '', f'carreaux de {nombre(L1)} × {nombre(L2)} cm, soit ≈ {nombre(round(par_m2, 1))} carreaux par m² (joints non comptés)'
    if not re.search(r'brique|pavé|klinker', t) or re.search(r'bloc|thermoplan|poutrain', t):
        return None
    L1, L2, L3 = map(prix_num, trois(a))
    if not (L1 and L2 and L3):
        return None
    if 'brique' in t:
        # face vue L1 × L3 (mur d'une brique d'épaisseur L2), joints de 1 cm
        par_m2 = 1e4 / ((L1 + 1) * (L3 + 1))
        return par_m2, 'de mur', f'mur d’une brique d’épaisseur ({nombre(L2)} cm), face vue L1 × L3 = {nombre(L1)} × {nombre(L3)} cm + joints de 1 cm, soit ≈ {round(par_m2)} briques par m²'
    # pavés posés à plat : face L1 × L2, joints de 3 mm
    par_m2 = 1e4 / ((L1 + 0.3) * (L2 + 0.3))
    return par_m2, 'de pavage', f'pavés posés à plat, face L1 × L2 = {nombre(L1)} × {nombre(L2)} cm + joints de 3 mm, soit ≈ {round(par_m2)} pavés par m²'

def m2_txt(m2):
    return nombre(round(m2, 1) if m2 < 10 else round(m2))

def euros(v):
    return (f'{v:.2f}'.replace('.', ',').replace(',00', '')) + ' €'

# Articles publiés : pas vendus, avec au moins une photo (le site actuel n'en montre pas d'autres).
# Les articles en stock sans photo ne sont pas publiés, mais servent quand même aux exemples de « Faire avec ».
stock_tous = [a for a in cat if a['statut'] != 'à retirer']
pub = [a for a in stock_tous if a['photos']]
refs = {a['ref'] for a in pub}
for a in stock_tous:
    p = prix_num(a['prix'])
    a['_prix'] = p
    # le prix et le stock d'Impulsion sont dans l'unité actuelle : on l'affiche telle quelle (l'unité proposée reste une proposition dans le classeur)
    a['_unite'] = unite_site(unite_act.get(a['ref'], '')) or a['unite']
    a['_pose'] = pose(a)
    a['_prix_m2'] = ''
    if a['_pose']:
        # briques et pavés : toujours affichés à la pièce, avec l'équivalent au m² en second
        pm = a['_pose'][0]
        if a['_unite'] == 'm²':
            a['_m2_vendus'] = prix_num(a['stock'])
            if a['famille'] == 'Carrelage':
                # Impulsion compte souvent le carrelage en carreaux malgré le prix au m² : stock_vente le reconnaît
                n, txt = stock_vente(a)
                a['_carreaux'] = int(a['stock']) if 'soit' in txt else round(n * pm) if n else None
            p = a['_prix'] = round(p / pm, 2)
            a['_unite'] = 'pièce'
        if p > 0:
            a['_prix_m2'] = f"soit ≈ {euros(round(p * pm))} / m²{' ' + a['_pose'][1] if a['_pose'][1] else ''}"
    a['_prix_txt'] = f"{euros(p)} / {a['_unite']}" if p > 0 else 'Prix au comptoir'
    n = a.get('neuf')
    a['_neuf_txt'] = ''
    a['_eco'] = 0
    if n and n.get('neuf_max'):
        # prix du neuf estimé dans l'unité proposée : on ne l'affiche que s'il est dans la même unité que le prix du Comptoir
        if a['_pose'] and a['unite'] == 'm²' and a['_unite'] == 'pièce':
            pm = a['_pose'][0]
            mn, mx = round(n['neuf_min'] / pm, 2), round(n['neuf_max'] / pm, 2)
            a['_neuf_txt'] = (f"{euros(mn)} à {euros(mx)}" if mn != mx else euros(mn)) + ' / pièce'
            n = dict(n, neuf_min=mn)
            if p >= mn:
                a['_neuf_txt'] = ''            # prix du Comptoir à vérifier (plus cher que l'estimation du neuf) : on ne compare pas
        elif a['_unite'] == a['unite']:
            a['_neuf_txt'] = (f"{n['neuf_min']} à {n['neuf_max']} €" if n['neuf_min'] != n['neuf_max'] else f"{n['neuf_min']} €") + f" / {a['unite']}"
        if a['_neuf_txt'] and p > 0 and n['neuf_min'] > p:
            a['_eco'] = round(100 * (1 - p / n['neuf_min']) / 5) * 5
    a['_lies'] = [l for l in a['lies'] if l['ref'] in refs]
    a['_photo'] = PILE + a['photos'][0] if a['photos'] else ''
    a['_vignette'] = PILE + a['photos'][0].replace('/gallery_images/', '/gallery_images/thumbs/') if a['photos'] else ''
    a['_url'] = f"article/{a['ref']}.html"
    # stock connu (les « 100 » / « 99 » / vide de l'export veulent dire « non compté ») : sert de plafond dans les listes
    a['_stock'], a['_stock_txt'] = stock_vente(a)
    a['_surf'] = None
    if a['_pose']:
        pm, quoi, hyp = a['_pose']
        if a['famille'] == 'Carrelage' and '_carreaux' in a:
            nb = a['_carreaux']
            a['_stock'], a['_stock_txt'] = (nb, f'{nb} {pluriel(nb, "pièce")}') if nb else (0, a['_stock_txt'])
        elif a.get('_m2_vendus'):
            # stock noté en m² : on le repasse en pièces (nombre de la description s'il y est)
            c = re.search(r'(\d+) pièces', a['description'])
            nb = int(c.group(1)) if c else round(a['_m2_vendus'] * pm)
            a['_stock'], a['_stock_txt'] = nb, f'{nb} pièces'
        if a['_stock']:
            a['_surf'] = (f"≈ {m2_txt(a['_stock'] / pm)} m²{' ' + quoi if quoi else ''}", hyp)
    a['_co2'] = co2(a, trois(a), a['_unite'])
    # emplacement dans l'entrepôt (code zone + travée + niveau, ex. N2-1) : colonne à remplir plus tard, vide pour l'instant
    a['_empl'] = a.get('emplacement_reel', '')
    a['_ajout'] = {'r': a['ref'], 't': a['titre'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'v': a['_vignette'], 's': a['_stock'], 'st': a['_stock_txt'], 'o': a['_empl']}
par_ref = {a['ref']: a for a in pub}
CATS = sorted({a['categorie'] for a in pub}, key=lambda c: -sum(1 for a in pub if a['categorie'] == c))
ICONES = {'Sanitaire': '🛁', 'Portes': '🚪', 'Gros œuvre': '🧱', 'Chauffage': '🔥', 'Électricité et éclairage': '💡', 'Carrelage': '◻️',
          'Châssis et fenêtres': '🪟', 'Quincaillerie': '🔩', 'Parquet, bardage et terrasse': '🪵', 'Divers': '📦', 'Toiture': '🏠',
          'Outillage': '🔧', 'Bois et panneaux': '🪚', 'Isolation': '🧶', 'Électroménager': '🍳', 'Lambris et plafonds': '▤'}

# version des fichiers communs (style, scripts) : change à chaque modification, évite les vieilles copies en cache
import hashlib
VER = hashlib.md5(b''.join(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f), 'rb').read() for f in ('site_comptoir.css', 'site_comptoir_panier.js', 'site_comptoir_zoom.js'))).hexdigest()[:8]

def page(titre, desc, corps, prof='', image='', canon='', extra_head=''):
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(titre)}</title><meta name="description" content="{esc(desc)}">
<meta name="robots" content="noindex"><!-- maquette : à retirer à la mise en ligne réelle -->
<meta property="og:title" content="{esc(titre)}"><meta property="og:description" content="{esc(desc)}">
{f'<meta property="og:image" content="{esc(image)}">' if image else ''}{f'<link rel="canonical" href="{esc(BASE + canon)}">' if canon else ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="{prof}style.css?v={VER}"><script src="{prof}panier.js?v={VER}" defer></script>{extra_head}
</head><body>
<div class="maquette">Maquette : catalogue de test, prix et textes à valider par l'équipe.</div>
<header class="haut"><div class="haut-in">
<a class="logo" href="{prof}index.html"><img src="{PILE}/img/logo-main.svg" alt="La Pile"></a>
<nav><a href="{prof}index.html">Accueil</a><a href="{prof}catalogue.html">Catalogue</a><a href="{prof}faire-avec.html">Faire avec</a><a href="{prof}index.html#infos">Infos pratiques</a><a href="{prof}panier.html" class="lien-panier">Mes listes <span class="nb-panier" hidden>0</span></a></nav>
</div></header>
{corps}
<footer class="pied"><div class="pied-in">
<img src="{PILE}/img/footer-logo.svg" alt="La Pile" class="pied-logo">
<div><b>Comptoir des Matériaux</b><br>Rue Frédéric Lang 3, 4960 Malmedy<br>Tél. <a href="tel:+32493049929">+32 (0)493 04 99 29</a><br><a href="mailto:info@la-pile.be">info@la-pile.be</a></div>
<div>Un projet de <a href="{PILE}">La Pile asbl</a><br><a href="https://www.instagram.com/lapile_malmedy/">Instagram</a> · <a href="https://www.facebook.com/LaPileMalmedy/">Facebook</a></div>
</div></footer></body></html>'''

def stock_court(a):
    # pastille sur la photo : le stock dans l'unité de vente, rien si non compté ou ambigu
    n, u = a['_stock'], a['_unite']
    if not n:
        return ''
    return f'{"≈ " if u == "m²" and "soit" in a["_stock_txt"] else ""}{nombre(n)} {u if u == "m²" else pluriel(n, u)} en stock'

def carte(a, prof=''):
    eco = f'<span class="eco">−{a["_eco"]} % vs neuf</span>' if a['_eco'] >= 20 else ''
    bas = f'<span class="stock-pastille">{stock_court(a)}</span>' if stock_court(a) else ''
    co2 = f'<p class="co2-mini">−{nombre(a["_co2"][0])} kg CO₂{"/m²" if a["_co2"][1] == "m²" else ""} évités vs neuf</p>' if a['_co2'] else ''
    return f'''<a class="carte" href="{prof}{a['_url']}"><div class="img"><img loading="lazy" src="{esc(a['_vignette'])}" alt="{esc(a['titre'])}">{eco}</div>
<div class="txt"><h3>{esc(a['titre'])}</h3><p class="prix">{esc(a['_prix_txt'])}{f'<small class="prix-m2">{esc(a["_prix_m2"])}</small>' if a['_prix_m2'] else ''}</p>{f'<p class="neuf">Neuf : {esc(a["_neuf_txt"])}</p>' if a['_neuf_txt'] else ''}{co2}{f'<p class="dispo">{bas}</p>' if bas else ''}{f'<p class="surf">{a["_surf"][0]} réalisables</p>' if a['_surf'] else ''}</div></a>'''

def dims(a):
    v = [x for x in trois(a) if x]
    d = [('Dimensions (L1 × L2 × L3)' if len(v) == 3 else 'Dimensions (L1 × L2)' if len(v) == 2 else 'Dimension (L1)', ' × '.join(v) + ' cm')] if v else []
    return d + ([('Diamètre', a['diametre'] + ' cm')] if a['diametre'] else [])

os.makedirs(f'{out}/article', exist_ok=True)

# --- pages article ---
for a in pub:
    car = dims(a) + [(k, v) for k, v in [('Autres mesures', a['mesures']), ('Matière', a['matiere']), ('Couleur', a['couleur']),
                                          ('Marque', a['marque']), ('État', a['etat']), ('Usage', a['lieu']), ('Vendu par', a['_unite']),
                                          ('Disponible', a['_stock_txt'] + (f' : {a["_surf"][0]} réalisables' if a['_surf'] else '')), ('Calcul au m²', a['_surf'][1] if a['_surf'] else ''), ('Référence', a['ref'])] if v] + [('Emplacement au Comptoir', a['_empl'] or 'à compléter')]
    photos = ''.join(f'<img src="{esc(PILE + p)}" alt="{esc(a["titre"])} – photo {i + 1}" {"loading=lazy" if i else ""}>' for i, p in enumerate(a['photos']))
    lies = ''.join(f'<div class="lie">{carte(par_ref[l["ref"]], "../")}<p class="pourquoi">{esc(l["pourquoi"])}</p></div>' for l in a['_lies'])
    eco = f'<p class="eco-grand">Environ {a["_eco"]} % moins cher que le neuf</p>' if a['_eco'] >= 20 else ''
    if a['_co2']:
        kg, par, calcul, jeu, lien = a['_co2']
        eco += (f'<div class="co2"><b>≈ {nombre(kg)} kg CO₂e évités{" par m²" if par == "m²" else ""} par rapport au neuf</b>'
                f'<small>Calcul : {esc(calcul)}.</small><details><summary>Source et méthode</summary><small>{esc(CO2_NOTE)} Jeu de données : <a href="{esc(lien)}">{esc(jeu)}</a>.</small></details></div>')
    neuf = (f'<p class="neuf-gros">Prix du neuf équivalent : <b>{esc(a["_neuf_txt"])}</b> <small>(indicatif : {esc(a["neuf"]["base"])})</small></p>'
            if a['_neuf_txt'] else '')
    pastilles = f'<span class="eco">−{a["_eco"]} % vs neuf</span>' if a['_eco'] >= 20 else ''
    pastilles = f'<div class="pastilles">{pastilles}</div>' if pastilles else ''
    lien = BASE + a['_url']
    msg = f"Bonjour, je suis intéressé·e par l'article {a['ref']} ({a['titre']}). Est-il toujours disponible ?"
    ld = {'@context': 'https://schema.org', '@type': 'Product', 'name': a['titre'], 'sku': a['ref'], 'description': a['description'],
          'image': [PILE + p for p in a['photos']], 'itemCondition': 'https://schema.org/UsedCondition', 'category': a['categorie']}
    if a['_prix'] > 0:
        ld['offers'] = {'@type': 'Offer', 'price': f"{a['_prix']:.2f}", 'priceCurrency': 'EUR', 'availability': 'https://schema.org/InStoreOnly'}
    corps = f'''<main class="article">
<p class="fil"><a href="../catalogue.html">Catalogue</a> › <a href="../catalogue.html#cat={esc(slug(a['categorie']))}">{esc(a['categorie'])}</a></p>
<div class="art-grille"><div class="galerie">{photos}{pastilles}</div>
<div class="infos"><h1>{esc(a['titre'])}</h1><p class="accroche">{esc(a['accroche'])}</p>
<p class="prix-gros">{esc(a['_prix_txt'])}{f'<small class="prix-m2">{esc(a["_prix_m2"])}</small>' if a['_prix_m2'] else ''}</p>{neuf}{eco}
<div class="actions"><button class="bouton" data-ajout="{esc(json.dumps(a['_ajout'], ensure_ascii=False))}">Ajouter à ma liste</button>
<a class="bouton clair" href="mailto:info@la-pile.be?subject={esc('Article ' + a['ref'])}&body={esc(msg)}">Poser une question</a></div>
<div class="partage"><span>Partager :</span><a href="https://wa.me/?text={esc(a['titre'] + ' ' + lien)}">WhatsApp</a>
<a href="https://www.facebook.com/sharer/sharer.php?u={esc(lien)}">Facebook</a><button onclick="navigator.clipboard.writeText('{esc(lien)}');this.textContent='Lien copié'">Copier le lien</button></div>
<p class="descr">{esc(a['description'])}</p>
<table class="carac">{''.join(f'<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in car)}</table></div></div>
{f'<section class="idees"><h2>Idées pour l’utiliser</h2><ul>{"".join(f"<li>{esc(i)}</li>" for i in a["idees"])}</ul></section>' if a['idees'] else ''}
{f'<section><h2>Pour compléter</h2><div class="grille">{lies}</div></section>' if lies else ''}
</main>'''
    open(f"{out}/{a['_url']}", 'w').write(page(f"{a['titre']} – Comptoir des Matériaux", a['accroche'] or a['description'][:150], corps, '../',
                                              a['_photo'], a['_url'], f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script><script src="../zoom.js?v={VER}" defer></script>'))

# Ordre « pertinence » (catalogue et accueil) : d'abord les produits phares du Comptoir, génériques et en quantité
# (briques, éviers, portes, châssis…), en alternant les rayons ; les articles très spécifiques viennent après.
PHARE = {'Portes': 10, 'Éviers et lavabos': 10, 'Gros œuvre et pierre': 10, 'Châssis et fenêtres': 9, 'Carrelage': 9,
         'Radiateurs et chauffage': 8, 'WC': 8, 'Parquet et lambris': 7, 'Bois et panneaux': 7, 'Baignoires et douches': 6,
         'Parois de douche': 6, 'Jardin et extérieur': 5, 'Toiture et gouttières': 5, 'Robinetterie': 5, 'Meubles de salle de bain': 5,
         'Luminaires': 4, 'Électroménager': 3, 'Isolation': 3, 'Outils': 2}
GENERIQUE = re.compile(r'^(lot de |\d+ )?(briques?|pavés?|klinkers?|blocs?|dalles?|bordures?|tuiles?|éviers?|lavabos?|vasques?|portes?|double porte|châssis|fenêtres?|'
                       r'carrelage|faïence|radiateurs?|wc|cuvette|parquet|lambris|planches?|poutres?|madriers?|chevrons?|panneaux?|baignoires?|receveur|'
                       r'paroi|mitigeur|robinet|meuble|plaques?|pierre|tôles?|gouttières?)\b', re.I)
SPECIFIQUE = re.compile(r'sous-couche|drain|dôme|coupole|croisillon|plots?|joint|kit |bouchon|siphon|charnière|poignée|serrure|cache|'
                        r'raccord|vanne|thermostat|tête|vis|cheville|colle|ensemble|cheminée|escalier|hotte|bidet|armoire|table|garage|enfant', re.I)
def score(a):
    sc = 4 if GENERIQUE.search(a['titre']) else 0
    sc -= 4 if SPECIFIQUE.search(a['titre']) else 0
    sc += min(5, math.log2(a['_stock'] + 1)) if a['_stock'] else 0.5 if a['_stock_txt'] else 0
    sc += (len(a['photos']) > 1) + (a['statut'] == 'ok') + (a['_eco'] >= 40)
    return sc
for a in pub:
    a['_score'] = score(a)
par_fam = defaultdict(list)
for a in sorted(pub, key=lambda a: -a['_score']):
    par_fam[a['famille']].append(a)
for f, l in par_fam.items():
    # les rayons moins demandés n'entrent dans la ronde que plus tard ; un article spécifique recule encore
    for k, a in enumerate(l):
        a['_tour'] = k + (10 - PHARE.get(f, 0)) / 2 + (2 if a['_score'] < 3 else 0)
for i, a in enumerate(sorted(pub, key=lambda a: (a['_tour'], -PHARE.get(a['famille'], 0), -a['_score']))):
    a['_ordre'] = i
pub.sort(key=lambda a: a['_ordre'])

# --- données pour le catalogue et « Faire avec » ---
donnees = [{'r': a['ref'], 't': a['titre'], 'c': a['categorie'], 'f': a['famille'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'pm': a['_prix_m2'], 'n': a['_neuf_txt'],
            'e': a['_eco'], 'v': a['_vignette'], **dict(zip(('d1', 'd2', 'd3'), map(prix_num, trois(a)))), 'm': a['matiere'],
            'co': a['couleur'], 's': a['_stock'], 'st': a['_stock_txt'], 'o': a['_empl'], 'sc': stock_court(a), 'sf': a['_surf'][0] + ' réalisables' if a['_surf'] else '', 'c2': (nombre(a['_co2'][0]) + (' kg CO₂/m²' if a['_co2'][1] == 'm²' else ' kg CO₂')) if a['_co2'] else '', 'fo': a['fonctions'], 'i': a['idees'], 'k': ' '.join(a['mots_cles'] + [a['titre'], a['famille'], a['ref']]).lower()}
           for a in pub]
json.dump(donnees, open(f'{out}/donnees.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# --- accueil ---
# bonnes affaires : les produits phares, un par rayon, dans l'ordre de pertinence
choix, vues = [], set()
for a in sorted([a for a in pub if a['statut'] == 'ok' and a['_score'] >= 5], key=lambda a: a['_ordre']):
    if a['famille'] not in vues and len(choix) < 8:
        choix.append(a); vues.add(a['famille'])
corps = f'''<section class="hero"><div class="hero-in"><h1>Comptoir des<br><span>Matériaux</span></h1>
<p>Matériaux de construction de réemploi à Malmedy : sanitaires, portes, châssis, carrelage, bois… jusqu’à 90 % moins chers que le neuf.</p>
<form action="catalogue.html" class="cherche"><input name="q" placeholder="Que cherchez-vous ? évier, porte 83 cm, carrelage…" aria-label="Rechercher"><button>Chercher</button></form></div></section>
<section class="contenu"><h2>Bonnes affaires du moment</h2><div class="grille">{''.join(carte(a) for a in choix)}</div>
<p class="centre"><a class="bouton" href="catalogue.html">Voir les {len(pub)} articles</a></p></section>
<section class="bande-bleue"><div class="contenu"><h2>Faire avec</h2><p>Un projet en tête ? Une cloison, un potager, une cabane… Choisissez ce que vous voulez faire, on vous montre ce qui peut servir.</p>
<a class="bouton jaune" href="faire-avec.html">Trouver des idées</a></div></section>
<section class="contenu" id="infos"><h2>Où nous trouver</h2><div class="trouver">
<div class="encart"><iframe title="Plan : Rue Frédéric Lang 3, 4960 Malmedy" loading="lazy" src="https://maps.google.com/maps?q=Rue%20Fr%C3%A9d%C3%A9ric%20Lang%203%2C%204960%20Malmedy&z=16&output=embed"></iframe>
<p><b>Rue Frédéric Lang 3, 4960 Malmedy</b> · <a href="https://www.google.com/maps/dir/?api=1&destination=Rue%20Fr%C3%A9d%C3%A9ric%20Lang%203%2C%204960%20Malmedy">Itinéraire</a></p></div>
<div class="encart photo-lieu"><div class="a-venir">Photo de l’entrée du Comptoir<br><small>à fournir par l’équipe</small></div><p>Légende à compléter (par où entrer, où se garer).</p></div></div>
<h2 style="margin-top:32px">Infos pratiques</h2><div class="infos-prat">
<div><h3>Quand ?</h3><p>Horaires à compléter par l’équipe.</p></div>
<div><h3>Comment ?</h3><p>Repérez l’article en ligne, notez sa référence, réservez par mail ou téléphone, payez au comptoir.</p></div>
<div><h3>Donner ?</h3><p>Vous avez des matériaux en bon état ? Contactez-nous avant de les apporter.</p></div></div></section>'''
open(f'{out}/index.html', 'w').write(page('Comptoir des Matériaux – matériaux de réemploi à Malmedy', 'Sanitaires, portes, châssis, carrelage et bois de réemploi à prix doux, à Malmedy. Un projet de La Pile asbl.', corps, '', '', 'index.html'))

# --- catalogue (filtres côté navigateur) ---
corps = f'''<main class="contenu"><h1>Catalogue</h1>
<form class="filtres" id="filtres" onsubmit="return false">
<input id="q" type="search" placeholder="Rechercher (mot, référence…)" aria-label="Rechercher">
<select id="cat" aria-label="Rayon"><option value="">Tous les rayons</option>{''.join(f'<option value="{slug(c)}">{esc(c)}</option>' for c in CATS)}</select>
<details open><summary>Dimensions, matière, prix</summary><div class="plus">
<p class="petit" style="grid-column:1/-1;margin:0">Mesures en cm, de la plus grande (L1) à la plus petite (L3) : une porte de 201 × 83 × 4 cm a L1 = 201, L2 = 83, L3 = 4.</p>
<label>L1, la plus grande (cm) <span><input id="d1min" inputmode="numeric" placeholder="min"> – <input id="d1max" inputmode="numeric" placeholder="max"></span></label>
<label>L2 (cm) <span><input id="d2min" inputmode="numeric" placeholder="min"> – <input id="d2max" inputmode="numeric" placeholder="max"></span></label>
<label>L3, la plus petite (cm) <span><input id="d3min" inputmode="numeric" placeholder="min"> – <input id="d3max" inputmode="numeric" placeholder="max"></span></label>
<label>Matière <select id="mat"><option value="">Toutes</option>{''.join(f'<option>{esc(m)}</option>' for m in sorted({a["matiere"] for a in pub if a["matiere"]}))}</select></label>
<label>Prix max (€) <input id="pmax" inputmode="numeric"></label>
<label>Trier <select id="tri"><option value="">Pertinence</option><option value="p">Prix croissant</option><option value="e">Plus grosse économie</option></select></label>
</div></details></form>
<p id="nb" class="nb"></p><div class="grille" id="liste"></div></main>
<script>
const CATS={json.dumps({slug(c): c for c in CATS}, ensure_ascii=False)};
const sans=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}})[c]);
let D=[];const $=id=>document.getElementById(id);
const P=new URLSearchParams(location.search),H=new URLSearchParams(location.hash.slice(1));
if(P.get('q'))$('q').value=P.get('q');if(H.get('cat'))$('cat').value=H.get('cat');
function num(id){{const v=parseFloat($(id).value.replace(',','.'));return isNaN(v)?null:v}}
function dans(v,a,b){{return (a===null||v>=a)&&(b===null||(v>0&&v<=b))&&(a===null||v>0)}}
function maj(){{
 const mots=sans($('q').value).split(/\\s+/).filter(Boolean),c=CATS[$('cat').value],m=$('mat').value,pm=num('pmax');
 let r=D.filter(a=>(!c||a.c===c)&&(!m||a.m===m)&&(pm===null||(a.p>0&&a.p<=pm))
  &&dans(a.d1,num('d1min'),num('d1max'))&&dans(a.d2,num('d2min'),num('d2max'))&&dans(a.d3,num('d3min'),num('d3max'))
  &&mots.every(w=>sans(a.k).includes(w)));
 if($('tri').value==='p')r.sort((a,b)=>(a.p||1e9)-(b.p||1e9));if($('tri').value==='e')r.sort((a,b)=>b.e-a.e);
 $('nb').textContent=r.length+' article'+(r.length>1?'s':'');
 $('liste').innerHTML=r.slice(0,240).map(a=>`<div class="carte-w"><a class="carte" href="article/${{a.r}}.html"><div class="img"><img loading="lazy" src="${{a.v}}" alt="${{esc(a.t)}}">${{a.e>=20?`<span class="eco">−${{a.e}} % vs neuf</span>`:''}}</div><div class="txt"><h3>${{esc(a.t)}}</h3><p class="prix">${{esc(a.pt)}}${{a.pm?`<small class="prix-m2">${{esc(a.pm)}}</small>`:''}}</p>${{a.n?`<p class="neuf">Neuf : ${{esc(a.n)}}</p>`:''}}${{a.c2?`<p class="co2-mini">−${{esc(a.c2)}} évités vs neuf</p>`:''}}${{a.sc?`<p class="dispo"><span class="stock-pastille">${{esc(a.sc)}}</span></p>`:''}}${{a.sf?`<p class="surf">${{esc(a.sf)}}</p>`:''}}</div></a><button class="ajout-mini" data-ajout="${{esc(JSON.stringify({{r:a.r,t:a.t,p:a.p,pt:a.pt,v:a.v,s:a.s,st:a.st,o:a.o}}))}}">+ Ma liste</button></div>`).join('');
 history.replaceState(null,'',$('cat').value?'#cat='+$('cat').value:location.pathname+location.search);
}}
document.querySelectorAll('#filtres input,#filtres select').forEach(e=>e.addEventListener('input',maj));
// Stock vivant publié par la caisse : articles partis retirés, quantités et emplacements à jour.
const vivant=(d,j)=>{{if(!j)return d;const m={{}};(j.articles||[]).forEach(x=>m[x.r]=x);
 return d.filter(a=>!['vendu','rupture','hors'].includes((m[a.r]||{{}}).st)).map(a=>{{const x=m[a.r];if(!x)return a;
  if(x.s>0){{a.s=x.s;a.st=x.u&&x.u!=='pièce'?`${{String(x.s).replace('.',',')}} ${{x.u}}`:`${{x.s}} pièce${{x.s>1?'s':''}}`;if(a.sc)a.sc=a.st+' en stock'}}if(x.e)a.o=x.e;return a}})}};
Promise.all([fetch('donnees.json').then(r=>r.json()),fetch('stock.json',{{cache:'no-cache'}}).then(r=>r.ok?r.json():null).catch(()=>null)]).then(([d,j])=>{{D=vivant(d,j);maj()}});
</script>'''
open(f'{out}/catalogue.html', 'w').write(page('Catalogue – Comptoir des Matériaux', 'Tous les matériaux de réemploi disponibles au Comptoir des Matériaux à Malmedy, avec recherche par dimensions.', corps, '', '', 'catalogue.html'))

# --- Faire avec : un seul parcours « Un projet, une envie » (anciens « J'ai un projet » + « S'inspirer »), et les fonctions ---
from site_illus import PROJETS as ILLUS_P, FONCTIONS as ILLUS_F
DOSSIER_FA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'faire_avec')
lire_csv = lambda n: list(csv.DictReader(open(os.path.join(DOSSIER_FA, n), encoding='utf-8'), delimiter=';'))
# Les deux listes se recouvrent : on regroupe sous un même nom.
MEME = {'Aménager un atelier': 'Atelier', 'Atelier au garage': 'Atelier', 'Terrasse conviviale': 'Terrasse'}
DESC = {'Atelier': 'Un atelier de bricolage au garage ou dans une remise, avec établi, rangements et bonne lumière.'}

def norm(s):
    return unicodedata.normalize('NFKD', (s or '').lower().replace('œ', 'oe')).encode('ascii', 'ignore').decode()
def toks(s):
    return [w[:-1] if len(w) > 3 and w[-1] in 'sx' else w for w in re.split(r'[^a-z0-9]+', norm(s)) if w]
def a_le_mot(t, mot):
    w = toks(mot)
    return bool(w) and any(t[i:i + len(w)] == w for i in range(len(t) - len(w) + 1))
liste_ = lambda s: [x.strip() for x in (s or '').split(',') if x.strip()]
num_ = lambda s: prix_num(s) if (s or '').strip() else None
for a in stock_tous:
    a['_toks'] = toks(' '.join([a['titre'], a['famille']] + a['mots_cles']))
en_stock = {a['ref']: a for a in stock_tous}

PROJ = {}
def projet(nom):
    n = MEME.get(nom, nom)
    return PROJ.setdefault(n, {'nom': n, 'desc': DESC.get(n, ''), 'postes': [], 'exemple': [], 'piece': None})
for r in lire_csv('projets.csv'):
    p = projet(r['Projet'])
    if r['Description'] and not p['desc']:
        p['desc'] = r['Description']
    p['postes'].append({'nom': r['Poste'], 'familles': liste_(r['Familles']), 'fonction': r['Fonction'].strip(), 'mots': liste_(r['Mots du nom']),
                        'qte': r['Quantité'], 'conseil': r['Conseil']})
# Exemples composés (« S'inspirer ») : références de l'export Impulsion → nouvelles références harmonisées
ancienne = defaultdict(list)
for r in csv.DictReader(open(src_csv, encoding='utf-8-sig'), delimiter=';'):
    ancienne[r['Réf. Impulsion actuelle'].replace(' ', '').upper()].append(r['Référence'])
for r in lire_csv('ambiances.csv'):
    p = projet(r['Ambiance'])
    if r['Description']:
        p['desc'] = p['desc'] if p['nom'] in DESC else r['Description']
        p['piece'] = [prix_num(x) for x in r['Pièce (L x l x h, m)'].split('x')]
    cle = r['Référence'].replace(' ', '').upper()
    cands = [en_stock[x] for x in ancienne.get(cle, []) if x in en_stock] if cle else []
    cands.sort(key=lambda a: not a['photos'])
    indice = set(toks(r['Rôle'] + ' ' + r['Note']))
    it = max(cands, key=lambda a: (len(indice & set(a['_toks'])), bool(a['photos']))) if cands else None
    rempl = False
    if not it and not r['Référence'].strip():
        # pas de référence dans l'exemple : on cherche dans tout le stock un article dont le titre commence par le rôle (« Plinthes »)
        mot = toks(r['Rôle'])[:1]
        alt = sorted([a for a in stock_tous if mot and toks(a['titre'])[:1] == mot], key=lambda a: (not a['photos'], a['statut'] != 'ok'))
        it, rempl = (alt[0], False) if alt else (None, False)
    if not it and r['Référence'].strip():
        # l'article de l'exemple est vendu ou sans photo : on propose un équivalent de la même famille
        fam = next((c['famille'] for c in cat if c['ref'] in ancienne.get(r['Référence'].replace(' ', '').upper(), [])), '')
        mot = toks(r['Rôle'])[0]   # le nom principal du rôle (« Lavabo » d'angle), cherché dans le titre
        alt = sorted([a for a in pub if a['famille'] == fam and toks(a['titre'])[:1] == [mot]], key=lambda a: (toks(a['titre'])[0] != mot, a['statut'] != 'ok', -len(a['photos'])))
        it, rempl = (alt[0], True) if alt else (None, False)
    p['exemple'].append({'role': r['Rôle'], 'it': it, 'rempl': rempl, 'calc': r['Calcul'], 'couv': num_(r['Couverture par unité']) or 1,
                         'qte': int(num_(r['Quantité']) or 1), 'note': r['Note']})

def pour_poste(po):
    res = []
    for a in pub:
        cadre = po['familles'] or po['fonction']
        dedans = a['famille'] in po['familles'] or (po['fonction'] and po['fonction'] in a['fonctions'])
        if cadre and not dedans:
            continue
        if po['mots'] and not any(a_le_mot(a['_toks'], m) for m in po['mots']):
            continue
        res.append(a)
    return sorted(res, key=lambda a: (a['statut'] != 'ok', a['_prix'] <= 0, -a['_eco']))

def ajout(a, q=1):
    return {**a['_ajout'], 'q': min(q, a['_stock']) if a['_stock'] else q}
def deplier(reste):
    if not reste:
        return ''
    n = len(reste)
    return (f'<details class="deplier"><summary><span class="ouvrir">Voir les {n} autres possibilités</span><span class="fermer">Refermer la liste</span></summary>'
            f'<div class="grille">{"".join(carte_w(a, "../") for a in reste)}</div>'
            f'<button type="button" class="lien" onclick="const d=this.closest(\'details\');d.open=false;d.scrollIntoView({{block:\'center\'}})">Refermer la liste</button></details>')
def carte_w(a, prof=''):
    return f'<div class="carte-w">{carte(a, prof)}<button class="ajout-mini" data-ajout="{esc(json.dumps(ajout(a), ensure_ascii=False))}">+ Ma liste</button></div>'

os.makedirs(f'{out}/projet', exist_ok=True)
for p in PROJ.values():
    p['slug'] = slug(p['nom'])
    p['_postes'] = [(po, pour_poste(po)) for po in p['postes']]
    p['_ex'] = [l for l in p['exemple'] if l['it']]
    p['illus'] = ILLUS_P.get(p['nom'], '')
    # exemple composé
    ex = ''
    if p['exemple']:
        surf = any(l['calc'] for l in p['exemple'])
        lignes = ''
        for l in p['exemple']:
            a = l['it']
            att = f' data-calc="{esc(l["calc"])}"' if l['calc'] else f' data-q="{l["qte"]}"'
            if a:
                # combien couvre une unité vendue : m² ou m directement, sinon la taille d'une pièce, sinon l'hypothèse de l'exemple
                surf_calc = l['calc'] in ('sol', 'murs')
                taille = False
                if a['_unite'] == ('m²' if surf_calc else 'm courant'):
                    cp = 1
                elif a['_unite'] == 'pièce' and surf_calc and prix_num(trois(a)[1]):
                    cp, taille = prix_num(trois(a)[0]) * prix_num(trois(a)[1]) / 10000, True
                elif a['_unite'] == 'pièce' and not surf_calc and prix_num(trois(a)[0]):
                    cp, taille = prix_num(trois(a)[0]) / 100, True
                else:
                    cp = l['couv'] if l['couv'] != 1 else 0
                src = 'direct' if cp == 1 and not taille and a['_unite'] in ('m²', 'm courant') else 'taille' if taille else 'hyp'
                att += f' data-cp="{cp:g}" data-src="{src}" data-u="{esc(a["_unite"])}" data-s="{a["_stock"]}" data-stt="{esc(a["_stock_txt"])}"'
            if a:
                vue = (f'<img src="{esc(a["_vignette"])}" alt="" loading="lazy">' if a['photos'] else '<span class="vide">📷</span>')
                nom = (f'<a href="../{a["_url"]}">{esc(a["titre"])}</a>' if a['photos'] else f'<span>{esc(a["titre"])} <small>(réf. {esc(a["ref"])}, en stock au Comptoir, photo à venir)</small></span>')
                lignes += f'''<div class="ex-ligne"{att} data-r="{esc(a['ref'])}" data-p="{a['_prix']}">{vue}
<div><small>{esc(l['role'])}{' · proposé à la place d’un article vendu' if l['rempl'] else ''}</small>{nom}{f'<small>{esc(l["note"])}</small>' if l['note'] and 'trouver ailleurs' not in l['note'].lower() else ''}<small class="besoin"></small></div>
<b class="ex-prix">{esc(a['_prix_txt'])}</b></div>'''
            else:
                lignes += f'<div class="ex-ligne manque"{att}><span class="vide">?</span><div><small>{esc(l["role"])}</small><span>{esc(l["note"] or "À trouver")}</span><small class="besoin"></small></div><b class="ex-prix">vendu ou à trouver ailleurs</b></div>'
        tout = [ajout(l['it'], 1) for l in p['exemple'] if l['it']]
        piece = p['piece'] or [3, 3, 2.5]
        form = (f'''<form class="piece" id="piece" onsubmit="return false"><p>Les dimensions de votre pièce (en mètres) : les quantités s'ajustent.</p>
<label>Longueur <input name="L" inputmode="decimal" value="{str(piece[0]).replace('.', ',').removesuffix(',0')}"></label>
<label>Largeur <input name="l" inputmode="decimal" value="{str(piece[1]).replace('.', ',').removesuffix(',0')}"></label>
<label>Hauteur <input name="h" inputmode="decimal" value="{str(piece[2]).replace('.', ',').removesuffix(',0')}"></label><p id="surfaces" class="petit"></p></form>''' if surf else '')
        ex = f'''<section class="exemple"><h2>Un exemple composé avec le stock</h2>{form}<div id="ex-lignes">{lignes}</div>
<p class="total">Total indicatif des éléments disponibles : <b id="ex-total"></b></p>
<button class="bouton jaune" id="ex-tout" data-liste-projet="{esc(p['nom'])}" data-vers="../panier.html" data-tout="{esc(json.dumps(tout, ensure_ascii=False))}">Tout mettre dans ma liste « {esc(p['nom'])} »</button>
<p class="petit">Quantités calculées dans l'unité de vente de chaque article (10 % de chutes compris) et limitées au stock : l'équipe vérifie avec vous ce qui reste.</p></section>'''
    postes = ''.join(f'''<div class="poste"><h3>{esc(po['nom'])}{f' <small>· {esc(po["qte"])}</small>' if po['qte'] else ''}</h3>{f'<p class="conseil">{esc(po["conseil"])}</p>' if po['conseil'] else ''}
{f'<div class="grille">{"".join(carte_w(a, "../") for a in its[:4])}</div>{deplier(its[4:])}' if its else '<p class="petit">Rien en stock aujourd’hui pour ce poste : demandez à l’équipe s’il en arrive bientôt.</p>'}</div>''' for po, its in p['_postes'])
    n_ok = sum(1 for _, its in p['_postes'] if its)
    fonctions = sorted({po['fonction'] for po in p['postes'] if po['fonction']})
    mail = f"Bonjour, je voudrais être guidé·e pour mon projet « {p['nom']} ». Mes disponibilités : … Mon téléphone : …"
    corps = f'''<main class="contenu projet">
<p class="fil"><a href="../faire-avec.html">Faire avec</a> › {esc(p['nom'])}</p>
<div class="projet-tete"><div class="illus">{p['illus']}</div><div><h1>{esc(p['nom'])}</h1><p class="accroche">{esc(p['desc'])}</p>
{f'<p class="score">{n_ok} postes sur {len(p["postes"])} trouvables au Comptoir aujourd’hui</p>' if p['postes'] else ''}
<div class="actions"><button class="bouton" data-liste-projet="{esc(p['nom'])}" data-vers="../panier.html">Créer ma liste « {esc(p['nom'])} »</button>
<a class="bouton clair" href="mailto:info@la-pile.be?subject={esc('Être guidé : ' + p['nom'])}&body={esc(mail)}">Être guidé par l’équipe</a></div>
{''.join(f'<a class="puce" href="../faire-avec.html#{esc(f)}">{ILLUS_F.get(f, "")}{esc(f)}</a>' for f in fonctions)}</div></div>
{ex}
{f'<section><h2>Ce qu’il faut, poste par poste</h2>{postes}</section>' if postes else ''}
</main>'''
    if p['exemple']:
        corps += '''<script>
const eur=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',').replace(',00','')+' €',f1=v=>(Math.round(v*10)/10).toString().replace('.',',');
const F=document.getElementById('piece'),U={sol:'m²',murs:'m²',plinthes:'m',perimetre:'m'};
function calc(){let L=3,l=3,h=2.5;if(F){const v=k=>parseFloat(F[k].value.replace(',','.'))||0;L=v('L');l=v('l');h=v('h')}
 const per=2*(L+l),S={sol:L*l*1.1,murs:Math.max(0,per*h-3)*1.1,plinthes:Math.max(0,per-.9),perimetre:per};
 if(F)document.getElementById('surfaces').textContent=`Sol ${f1(L*l)} m² · murs ${f1(Math.max(0,per*h-3))} m² (porte et fenêtre déduites) · périmètre ${f1(per)} m`;
 let tot=0;const tout=[];
 const pl=(n,u)=>u==='pièce'?(n>1?'pièces':'pièce'):u==='m courant'?'m':u==='rouleau'?(n>1?'rouleaux':'rouleau'):u+(n>1&&/^(sac|lot)$/.test(u)?'s':'');
 document.querySelectorAll('.ex-ligne').forEach(d=>{let q=+d.dataset.q||1,txt='',ok=true;const u=d.dataset.u||'pièce',st=+d.dataset.s||0,cp=+d.dataset.cp;
  if(d.dataset.calc){const need=S[d.dataset.calc];txt=`Il faut environ ${f1(need)} ${U[d.dataset.calc]}`;
   if(!d.dataset.r){q=0}
   else if(cp>0){q=Math.max(1,Math.ceil(need/cp-1e-9));const cm=U[d.dataset.calc];txt+=` : ${q} ${pl(q,u)}`+({taille:cp<.2?` (≈ ${Math.round(1/cp)} pièces par ${cm}, selon leur taille)`:` (une pièce ≈ ${f1(cp)} ${cm})`,hyp:` (hypothèse : 1 ${pl(1,u)} ≈ ${f1(cp)} ${cm}, à vérifier)`}[d.dataset.src]||'')}
   else{ok=false;q=1;txt+=' : quantité à voir avec l’équipe (unité de vente : '+u+')'}}
  else if(q>1)txt=`${q} ${pl(q,u)}`;
  let prendre=q;
  if(d.dataset.r&&st>0&&q>st){prendre=st;txt+=` · ${d.dataset.stt} en stock, il en manque ${f1(q-st)} ${pl(2,u)}`}
  else if(d.dataset.r&&st>0&&ok)txt+=` · ${d.dataset.stt} en stock`;
  d.querySelector('.besoin').textContent=txt.replace(/^ · /,'');
  d.dataset.rang=!d.dataset.r?2:(!ok||(st>0&&q>st))?1:0;
  if(d.dataset.r){const p=+d.dataset.p;if(p>0&&ok)tot+=p*prendre;d.querySelector('.ex-prix').textContent=!ok?'à voir':p>0?eur(p*prendre):'prix au comptoir';tout.push(d.dataset.r+':'+prendre)}});
 // complet en tête, puis à compléter, puis à trouver ailleurs
 const Z=document.getElementById('ex-lignes');Z.querySelectorAll('.ex-groupe').forEach(h=>h.remove());
 const G=['Complet en stock','À compléter (stock insuffisant ou quantité à voir)','À trouver ailleurs'];
 [...Z.querySelectorAll('.ex-ligne')].sort((x,y)=>x.dataset.rang-y.dataset.rang).forEach((d,i,T)=>{if(!i||T[i-1].dataset.rang!==d.dataset.rang){const h=document.createElement('h3');h.className='ex-groupe';h.textContent=G[d.dataset.rang];Z.append(h)}Z.append(d)});
 document.getElementById('ex-total').textContent=eur(tot);
 const b=document.getElementById('ex-tout'),T=JSON.parse(b.dataset.tout);T.forEach(a=>{const x=tout.find(s=>s.startsWith(a.r+':'));if(x)a.q=+x.split(':')[1]});b.dataset.tout=JSON.stringify(T)}
if(F)F.addEventListener('input',calc);calc();
</script>'''
    open(f"{out}/projet/{p['slug']}.html", 'w').write(page(f"{p['nom']} – Faire avec – Comptoir des Matériaux", p['desc'], corps, '../', '', f"projet/{p['slug']}.html"))

FONCTIONS = {}
for a in pub:
    for f in a['fonctions']:
        FONCTIONS.setdefault(f, []).append(a)
ORDRE = ['Petite chambre', 'Petite salle de bain', 'Coin WC', "Cuisine d'appoint", 'Atelier', 'Terrasse', 'Coin potager', 'Abri de jardin', 'Abri bois', 'Poulailler', 'Serre', 'Mare', 'Sapin de Noël']
projets_tri = sorted(PROJ.values(), key=lambda p: ORDRE.index(p['nom']) if p['nom'] in ORDRE else 99)
cartes_p = ''.join(f'''<a class="carte projet-carte" href="projet/{p['slug']}.html"><div class="illus">{p['illus']}</div><div class="txt"><h3>{esc(p['nom'])}</h3><p>{esc(p['desc'])}</p>
<p class="petit">{f"Exemple complet : {len(p['_ex'])} éléments en stock" if p['_ex'] else f"{sum(1 for _, i in p['_postes'] if i)} postes sur {len(p['postes'])} trouvables en stock"}</p></div></a>''' for p in projets_tri)
tuiles = ''.join(f'<button class="tuile" data-f="{esc(f)}">{ILLUS_F.get(f, "")}{esc(f)}<small>{len(v)} articles</small></button>' for f, v in sorted(FONCTIONS.items(), key=lambda x: -len(x[1])))
corps = f'''<main class="contenu"><h1>Faire avec</h1><p class="intro">Chaque matériau du Comptoir peut resservir, parfois autrement que prévu. Partez d’un projet ou de ce que vous voulez faire.</p>
<h2>Un projet, une envie</h2><p class="petit">Une pièce à rafraîchir, un coin du jardin à aménager : la liste de ce qu’il faut, ce qui est en stock aujourd’hui et, pour certains, un exemple complet ajusté à vos dimensions.</p>
<div class="grille projets">{cartes_p}</div>
<h2 style="margin-top:40px">Ce que je veux faire</h2><p class="petit">Séparer un espace, planter, s’asseoir… Choisissez une fonction : on vous montre ce qui peut servir.</p>
<div class="tuiles" id="fonctions">{tuiles}</div><h2 id="titre-f" style="margin-top:24px"></h2><div class="grille" id="liste"></div></main>
<script>
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}})[c]);let D=[];
function voir(f){{document.querySelectorAll('[data-f]').forEach(b=>b.classList.toggle('sel',b.dataset.f===f));
 document.getElementById('titre-f').textContent=f;
 document.getElementById('liste').innerHTML=D.filter(a=>a.fo.includes(f)).map(a=>`<div class="carte-w"><a class="carte" href="article/${{a.r}}.html"><div class="img"><img loading="lazy" src="${{a.v}}" alt=""></div><div class="txt"><h3>${{esc(a.t)}}</h3><p class="prix">${{esc(a.pt)}}${{a.pm?`<small class="prix-m2">${{esc(a.pm)}}</small>`:''}}</p><ul class="mini-idees">${{a.i.map(i=>`<li>${{esc(i)}}</li>`).join('')}}</ul></div></a><button class="ajout-mini" data-ajout="${{esc(JSON.stringify({{r:a.r,t:a.t,p:a.p,pt:a.pt,v:a.v,s:a.s,st:a.st,o:a.o}}))}}">+ Ma liste</button></div>`).join('');
 history.replaceState(null,'','#'+encodeURIComponent(f));document.getElementById('titre-f').scrollIntoView({{behavior:'smooth'}})}}
document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>voir(b.dataset.f));
fetch('donnees.json').then(r=>r.json()).then(d=>{{D=d;const h=decodeURIComponent(location.hash.slice(1));if(h)voir(h)}});
</script>'''
open(f'{out}/faire-avec.html', 'w').write(page('Faire avec – Comptoir des Matériaux', 'Des projets et des idées pour réutiliser les matériaux du Comptoir : salle de bain, potager, abri, atelier…', corps, '', '', 'faire-avec.html'))

# --- ma liste / réservation ---
corps = '''<main class="contenu"><p class="fil"><a href="catalogue.html">← Revenir au catalogue</a></p><h1>Mes listes</h1>
<p class="intro">Une liste par projet si vous voulez (« Salle de bain », « Potager »…). Envoyez-la à l'équipe pour réserver, ou gardez-la comme liste de courses pour votre passage au comptoir.</p>
<div class="puces" id="listes"></div>
<h2 class="titre-liste"><span id="nom-liste"></span> <button type="button" class="lien" id="renommer">renommer</button> <button type="button" class="lien" id="suppr">supprimer</button></h2>
<div id="panier" class="panier"></div>
<p class="actions"><a class="bouton clair" href="catalogue.html">← Continuer dans le catalogue</a><a class="bouton clair" href="faire-avec.html">Idées Faire avec</a></p>
<form id="envoi" class="envoi" hidden><h2>Réserver ces articles</h2>
<label>Nom <input name="nom" required autocomplete="name"></label>
<label>Téléphone <input name="tel" type="tel" required autocomplete="tel"></label>
<label>Passage prévu <input name="quand" placeholder="ex. samedi matin"></label>
<label>Message <textarea name="msg" rows="3" placeholder="Une question, une découpe, un transport…"></textarea></label>
<p class="petit">L'équipe vous confirme la disponibilité par téléphone ou par mail. Paiement au comptoir, à l'enlèvement.</p>
<div class="actions"><button class="bouton">Envoyer ma réservation</button><button type="button" class="bouton clair" id="imprimer">Imprimer ma liste</button>
<button type="button" class="bouton clair" id="partager">Partager ma liste</button><button type="button" class="lien" id="vider">Vider cette liste</button></div>
<p id="apres" class="petit" hidden>Votre messagerie s'est ouverte avec la liste : il ne reste qu'à envoyer le mail.</p></form></main>'''
open(f'{out}/panier.html', 'w').write(page('Ma liste – Comptoir des Matériaux', 'Préparez votre liste de matériaux et réservez-la au Comptoir des Matériaux.', corps, '', '', 'panier.html'))

# --- plan du site pour Google ---
urls = ['index.html', 'catalogue.html', 'faire-avec.html'] + [f"projet/{p['slug']}.html" for p in PROJ.values()] + [a['_url'] for a in pub]
open(f'{out}/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                       + ''.join(f'<url><loc>{BASE}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_comptoir.css'), f'{out}/style.css')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_comptoir_panier.js'), f'{out}/panier.js')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_comptoir_zoom.js'), f'{out}/zoom.js')
print(len(pub), 'articles publiés,', len(FONCTIONS), 'fonctions,', len(choix), 'bonnes affaires')
