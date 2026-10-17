# Génère la maquette du site du Comptoir des Matériaux (pages statiques) à partir du catalogue harmonisé.
# Usage : python3 outils/site_comptoir.py catalogue.json catalogue.csv comptoir/
import sys, os, json, csv, html, re, shutil, unicodedata
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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

def euros(v):
    return (f'{v:.2f}'.replace('.', ',').replace(',00', '')) + ' €'

# Articles publiés : pas vendus, avec au moins une photo (le site actuel n'en montre pas d'autres).
pub = [a for a in cat if a['statut'] != 'à retirer' and a['photos']]
refs = {a['ref'] for a in pub}
for a in pub:
    p = prix_num(a['prix'])
    a['_prix'] = p
    a['_prix_txt'] = f"{euros(p)} / {a['unite']}" if p > 0 else 'Prix au comptoir'
    n = a.get('neuf')
    a['_neuf_txt'] = ''
    a['_eco'] = 0
    if n and n.get('neuf_max'):
        a['_neuf_txt'] = (f"{n['neuf_min']} à {n['neuf_max']} €" if n['neuf_min'] != n['neuf_max'] else f"{n['neuf_min']} €") + f" / {a['unite']}"
        # économie seulement si le prix actuel est déjà dans la même unité
        if p > 0 and n['neuf_min'] > p and unite_act.get(a['ref'], a['unite']) == a['unite']:
            a['_eco'] = round(100 * (1 - p / n['neuf_min']) / 5) * 5
    a['_lies'] = [l for l in a['lies'] if l['ref'] in refs]
    a['_photo'] = PILE + a['photos'][0]
    a['_vignette'] = PILE + a['photos'][0].replace('/gallery_images/', '/gallery_images/thumbs/')
    a['_url'] = f"article/{a['ref']}.html"
par_ref = {a['ref']: a for a in pub}
CATS = sorted({a['categorie'] for a in pub}, key=lambda c: -sum(1 for a in pub if a['categorie'] == c))
ICONES = {'Sanitaire': '🛁', 'Portes': '🚪', 'Gros œuvre': '🧱', 'Chauffage': '🔥', 'Électricité et éclairage': '💡', 'Carrelage': '◻️',
          'Châssis et fenêtres': '🪟', 'Quincaillerie': '🔩', 'Parquet, bardage et terrasse': '🪵', 'Divers': '📦', 'Toiture': '🏠',
          'Outillage': '🔧', 'Bois et panneaux': '🪚', 'Isolation': '🧶', 'Électroménager': '🍳', 'Lambris et plafonds': '▤'}

def page(titre, desc, corps, prof='', image='', canon='', extra_head=''):
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(titre)}</title><meta name="description" content="{esc(desc)}">
<meta name="robots" content="noindex"><!-- maquette : à retirer à la mise en ligne réelle -->
<meta property="og:title" content="{esc(titre)}"><meta property="og:description" content="{esc(desc)}">
{f'<meta property="og:image" content="{esc(image)}">' if image else ''}{f'<link rel="canonical" href="{esc(BASE + canon)}">' if canon else ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="{prof}style.css"><script src="{prof}panier.js" defer></script>{extra_head}
</head><body>
<div class="maquette">Maquette : catalogue de test, prix et textes à valider par l'équipe.</div>
<header class="haut"><div class="haut-in">
<a class="logo" href="{prof}index.html"><img src="{PILE}/img/logo-main.svg" alt="La Pile"></a>
<nav><a href="{prof}catalogue.html">Catalogue</a><a href="{prof}faire-avec.html">Faire avec</a><a href="{prof}index.html#infos">Infos pratiques</a><a href="{prof}panier.html" class="lien-panier">Mes listes <span class="nb-panier" hidden>0</span></a></nav>
</div></header>
{corps}
<footer class="pied"><div class="pied-in">
<img src="{PILE}/img/footer-logo.svg" alt="La Pile" class="pied-logo">
<div><b>Comptoir des Matériaux</b><br>Rue Frédéric Lang 3, 4960 Malmedy<br>Tél. <a href="tel:+32493049929">+32 (0)493 04 99 29</a><br><a href="mailto:info@la-pile.be">info@la-pile.be</a></div>
<div>Un projet de <a href="{PILE}">La Pile asbl</a><br><a href="https://www.instagram.com/lapile_malmedy/">Instagram</a> · <a href="https://www.facebook.com/LaPileMalmedy/">Facebook</a></div>
</div></footer></body></html>'''

def carte(a, prof=''):
    eco = f'<span class="eco">−{a["_eco"]} % vs neuf</span>' if a['_eco'] >= 20 else ''
    return f'''<a class="carte" href="{prof}{a['_url']}"><div class="img"><img loading="lazy" src="{esc(a['_vignette'])}" alt="{esc(a['titre'])}">{eco}</div>
<div class="txt"><h3>{esc(a['titre'])}</h3><p class="prix">{esc(a['_prix_txt'])}</p>{f'<p class="neuf">Neuf : {esc(a["_neuf_txt"])}</p>' if a['_neuf_txt'] else ''}</div></a>'''

def dims(a):
    d = [('Largeur', a['L']), ('Profondeur', a['l']), ('Hauteur', a['h']), ('Diamètre', a['diametre']), ('Épaisseur', a['epaisseur'])]
    return [(k, v + ' cm') for k, v in d if v]

os.makedirs(f'{out}/article', exist_ok=True)

# --- pages article ---
for a in pub:
    car = dims(a) + [(k, v) for k, v in [('Autres mesures', a['mesures']), ('Matière', a['matiere']), ('Couleur', a['couleur']),
                                          ('Marque', a['marque']), ('État', a['etat']), ('Usage', a['lieu']), ('Vendu par', a['unite']),
                                          ('Disponible', a['stock'] if a['stock'] not in ('', '0', '100', '99') else ''), ('Référence', a['ref'])] if v]
    photos = ''.join(f'<img src="{esc(PILE + p)}" alt="{esc(a["titre"])} – photo {i + 1}" {"loading=lazy" if i else ""}>' for i, p in enumerate(a['photos']))
    lies = ''.join(f'<div class="lie">{carte(par_ref[l["ref"]], "../")}<p class="pourquoi">{esc(l["pourquoi"])}</p></div>' for l in a['_lies'])
    eco = f'<p class="eco-grand">Environ {a["_eco"]} % moins cher que le neuf</p>' if a['_eco'] >= 20 else ''
    neuf = (f'<p class="neuf-gros">Prix du neuf équivalent : <b>{esc(a["_neuf_txt"])}</b> <small>(indicatif : {esc(a["neuf"]["base"])})</small></p>'
            if a['_neuf_txt'] else '')
    lien = BASE + a['_url']
    msg = f"Bonjour, je suis intéressé·e par l'article {a['ref']} ({a['titre']}). Est-il toujours disponible ?"
    ld = {'@context': 'https://schema.org', '@type': 'Product', 'name': a['titre'], 'sku': a['ref'], 'description': a['description'],
          'image': [PILE + p for p in a['photos']], 'itemCondition': 'https://schema.org/UsedCondition', 'category': a['categorie']}
    if a['_prix'] > 0:
        ld['offers'] = {'@type': 'Offer', 'price': f"{a['_prix']:.2f}", 'priceCurrency': 'EUR', 'availability': 'https://schema.org/InStoreOnly'}
    corps = f'''<main class="article">
<p class="fil"><a href="../catalogue.html">Catalogue</a> › <a href="../catalogue.html#cat={esc(slug(a['categorie']))}">{esc(a['categorie'])}</a></p>
<div class="art-grille"><div class="galerie">{photos}</div>
<div class="infos"><h1>{esc(a['titre'])}</h1><p class="accroche">{esc(a['accroche'])}</p>
<p class="prix-gros">{esc(a['_prix_txt'])}</p>{neuf}{eco}
<div class="actions"><button class="bouton" data-ajout="{esc(json.dumps({'r': a['ref'], 't': a['titre'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'v': a['_vignette']}, ensure_ascii=False))}">Ajouter à ma liste</button>
<a class="bouton clair" href="mailto:info@la-pile.be?subject={esc('Article ' + a['ref'])}&body={esc(msg)}">Poser une question</a></div>
<div class="partage"><span>Partager :</span><a href="https://wa.me/?text={esc(a['titre'] + ' ' + lien)}">WhatsApp</a>
<a href="https://www.facebook.com/sharer/sharer.php?u={esc(lien)}">Facebook</a><button onclick="navigator.clipboard.writeText('{esc(lien)}');this.textContent='Lien copié'">Copier le lien</button></div>
<p class="descr">{esc(a['description'])}</p>
<table class="carac">{''.join(f'<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in car)}</table></div></div>
{f'<section class="idees"><h2>Idées pour l’utiliser</h2><ul>{"".join(f"<li>{esc(i)}</li>" for i in a["idees"])}</ul></section>' if a['idees'] else ''}
{f'<section><h2>Pour compléter</h2><div class="grille">{lies}</div></section>' if lies else ''}
</main>'''
    open(f"{out}/{a['_url']}", 'w').write(page(f"{a['titre']} – Comptoir des Matériaux", a['accroche'] or a['description'][:150], corps, '../',
                                              a['_photo'], a['_url'], f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'))

# Ordre de vitrine (« tous les rayons ») : on alterne les familles, grosses pièces d'abord, plutôt que la suite des références.
GROS = {'Portes', 'Baignoires et douches', 'Châssis et fenêtres', 'Parois de douche', 'Meubles de salle de bain', 'Radiateurs et chauffage',
        'Électroménager', 'Bois et panneaux', 'Jardin et extérieur', 'Parquet et lambris', 'Carrelage', 'Gros œuvre et pierre', 'WC', 'Toiture et gouttières'}
MOYENS = {'Éviers et lavabos', 'Luminaires', 'Outils'}
poids = lambda a: 2 if a['famille'] in GROS else 1 if a['famille'] in MOYENS else 0
taille = lambda a: prix_num(a['L']) * max(prix_num(a['h']), prix_num(a['l']), 1)
rang_fam = defaultdict(int)
for a in sorted(pub, key=lambda a: (a['statut'] != 'ok', -len(a['photos']), -taille(a), -a['_prix'])):
    a['_tour'] = rang_fam[a['famille']]
    rang_fam[a['famille']] += 1
FAMS = sorted({a['famille'] for a in pub})
for i, a in enumerate(sorted(pub, key=lambda a: (a['_tour'] + (2 - poids(a)) * 2, -poids(a), (FAMS.index(a['famille']) * 7 + a['_tour'] * 5) % len(FAMS)))):
    a['_ordre'] = i
pub.sort(key=lambda a: a['_ordre'])

# --- données pour le catalogue et « Faire avec » ---
donnees = [{'r': a['ref'], 't': a['titre'], 'c': a['categorie'], 'f': a['famille'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'n': a['_neuf_txt'],
            'e': a['_eco'], 'v': a['_vignette'], 'L': prix_num(a['L']), 'l': prix_num(a['l']), 'h': prix_num(a['h']), 'm': a['matiere'],
            'co': a['couleur'], 'fo': a['fonctions'], 'i': a['idees'], 'k': ' '.join(a['mots_cles'] + [a['titre'], a['famille'], a['ref']]).lower()}
           for a in pub]
json.dump(donnees, open(f'{out}/donnees.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# --- accueil ---
tuiles = ''.join(f'<a class="tuile" href="catalogue.html#cat={slug(c)}"><span>{ICONES.get(c, "•")}</span>{esc(c)}<small>{sum(1 for a in pub if a["categorie"] == c)} articles</small></a>' for c in CATS)
# bonnes affaires : une par famille, grosses pièces d'abord
choix, vues = [], set()
for a in sorted([a for a in pub if a['statut'] == 'ok' and a['_eco'] >= 40 and len(a['photos']) > 1], key=lambda a: (-poids(a), -a['_eco'])):
    if a['famille'] not in vues and len(choix) < 8:
        choix.append(a); vues.add(a['famille'])
corps = f'''<section class="hero"><div class="hero-in"><h1>Comptoir des<br><span>Matériaux</span></h1>
<p>Matériaux de construction de réemploi à Malmedy : sanitaires, portes, châssis, carrelage, bois… jusqu’à 90 % moins chers que le neuf.</p>
<form action="catalogue.html" class="cherche"><input name="q" placeholder="Que cherchez-vous ? évier, porte 83 cm, carrelage…" aria-label="Rechercher"><button>Chercher</button></form></div></section>
<section class="bande-jaune"><div class="contenu"><h2>Par rayon</h2><div class="tuiles">{tuiles}</div></div></section>
<section class="contenu"><h2>Bonnes affaires du moment</h2><div class="grille">{''.join(carte(a) for a in choix)}</div>
<p class="centre"><a class="bouton" href="catalogue.html">Voir les {len(pub)} articles</a></p></section>
<section class="bande-bleue"><div class="contenu"><h2>Faire avec</h2><p>Un projet en tête ? Une cloison, un potager, une cabane… Choisissez ce que vous voulez faire, on vous montre ce qui peut servir.</p>
<a class="bouton jaune" href="faire-avec.html">Trouver des idées</a></div></section>
<section class="contenu" id="infos"><h2>Infos pratiques</h2><div class="infos-prat">
<div><h3>Où ?</h3><p>Rue Frédéric Lang 3, 4960 Malmedy</p></div><div><h3>Quand ?</h3><p>Horaires à compléter par l’équipe.</p></div>
<div><h3>Comment ?</h3><p>Repérez l’article en ligne, notez sa référence, réservez par mail ou téléphone, payez au comptoir.</p></div>
<div><h3>Donner ?</h3><p>Vous avez des matériaux en bon état ? Contactez-nous avant de les apporter.</p></div></div></section>'''
open(f'{out}/index.html', 'w').write(page('Comptoir des Matériaux – matériaux de réemploi à Malmedy', 'Sanitaires, portes, châssis, carrelage et bois de réemploi à prix doux, à Malmedy. Un projet de La Pile asbl.', corps, '', '', 'index.html'))

# --- catalogue (filtres côté navigateur) ---
corps = f'''<main class="contenu"><h1>Catalogue</h1>
<form class="filtres" id="filtres" onsubmit="return false">
<input id="q" type="search" placeholder="Rechercher (mot, référence…)" aria-label="Rechercher">
<select id="cat" aria-label="Rayon"><option value="">Tous les rayons</option>{''.join(f'<option value="{slug(c)}">{esc(c)}</option>' for c in CATS)}</select>
<details open><summary>Dimensions, matière, prix</summary><div class="plus">
<label>Largeur (cm) <span><input id="Lmin" inputmode="numeric" placeholder="min"> – <input id="Lmax" inputmode="numeric" placeholder="max"></span></label>
<label>Hauteur (cm) <span><input id="hmin" inputmode="numeric" placeholder="min"> – <input id="hmax" inputmode="numeric" placeholder="max"></span></label>
<label>Profondeur (cm) <span><input id="lmin" inputmode="numeric" placeholder="min"> – <input id="lmax" inputmode="numeric" placeholder="max"></span></label>
<label>Matière <select id="mat"><option value="">Toutes</option>{''.join(f'<option>{esc(m)}</option>' for m in sorted({a["matiere"] for a in pub if a["matiere"]}))}</select></label>
<label>Couleur <select id="coul"><option value="">Toutes</option>{''.join(f'<option>{esc(m)}</option>' for m in sorted({a["couleur"] for a in pub if a["couleur"]}))}</select></label>
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
 const mots=sans($('q').value).split(/\\s+/).filter(Boolean),c=CATS[$('cat').value],m=$('mat').value,co=$('coul').value,pm=num('pmax');
 let r=D.filter(a=>(!c||a.c===c)&&(!m||a.m===m)&&(!co||a.co===co)&&(pm===null||(a.p>0&&a.p<=pm))
  &&dans(a.L,num('Lmin'),num('Lmax'))&&dans(a.h,num('hmin'),num('hmax'))&&dans(a.l,num('lmin'),num('lmax'))
  &&mots.every(w=>sans(a.k).includes(w)));
 if($('tri').value==='p')r.sort((a,b)=>(a.p||1e9)-(b.p||1e9));if($('tri').value==='e')r.sort((a,b)=>b.e-a.e);
 $('nb').textContent=r.length+' article'+(r.length>1?'s':'');
 $('liste').innerHTML=r.slice(0,240).map(a=>`<div class="carte-w"><a class="carte" href="article/${{a.r}}.html"><div class="img"><img loading="lazy" src="${{a.v}}" alt="${{esc(a.t)}}">${{a.e>=20?`<span class="eco">−${{a.e}} % vs neuf</span>`:''}}</div><div class="txt"><h3>${{esc(a.t)}}</h3><p class="prix">${{esc(a.pt)}}</p>${{a.n?`<p class="neuf">Neuf : ${{esc(a.n)}}</p>`:''}}</div></a><button class="ajout-mini" data-ajout="${{esc(JSON.stringify({{r:a.r,t:a.t,p:a.p,pt:a.pt,v:a.v}}))}}">+ Ma liste</button></div>`).join('');
 history.replaceState(null,'',$('cat').value?'#cat='+$('cat').value:location.pathname+location.search);
}}
document.querySelectorAll('#filtres input,#filtres select').forEach(e=>e.addEventListener('input',maj));
fetch('donnees.json').then(r=>r.json()).then(d=>{{D=d;maj()}});
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
for a in pub:
    a['_toks'] = toks(' '.join([a['titre'], a['famille']] + a['mots_cles']))

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
    cands = [par_ref[x] for x in ancienne.get(r['Référence'].replace(' ', '').upper(), []) if x in par_ref]
    indice = set(toks(r['Rôle'] + ' ' + r['Note']))
    it = max(cands, key=lambda a: len(indice & set(a['_toks']))) if cands else None
    rempl = False
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
    return {'r': a['ref'], 't': a['titre'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'v': a['_vignette'], 'q': q}
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
            att = f' data-calc="{esc(l["calc"])}" data-couv="{l["couv"]}"' if l['calc'] else f' data-q="{l["qte"]}"'
            if a:
                lignes += f'''<div class="ex-ligne"{att} data-r="{esc(a['ref'])}" data-p="{a['_prix']}"><img src="{esc(a['_vignette'])}" alt="" loading="lazy">
<div><small>{esc(l['role'])}{' · proposé à la place d’un article vendu' if l['rempl'] else ''}</small><a href="../{a['_url']}">{esc(a['titre'])}</a>{f'<small>{esc(l["note"])}</small>' if l['note'] else ''}<small class="besoin"></small></div>
<b class="ex-prix">{esc(a['_prix_txt'])}</b></div>'''
            else:
                lignes += f'<div class="ex-ligne manque"{att}><span class="vide">?</span><div><small>{esc(l["role"])}</small><span>{esc(l["note"] or "À trouver")}</span><small class="besoin"></small></div><b class="ex-prix">vendu ou à trouver ailleurs</b></div>'
        tout = [ajout(l['it'], l['qte']) for l in p['exemple'] if l['it']]
        piece = p['piece'] or [3, 3, 2.5]
        form = (f'''<form class="piece" id="piece" onsubmit="return false"><p>Les dimensions de votre pièce (en mètres) : les quantités s'ajustent.</p>
<label>Longueur <input name="L" inputmode="decimal" value="{str(piece[0]).replace('.', ',').removesuffix(',0')}"></label>
<label>Largeur <input name="l" inputmode="decimal" value="{str(piece[1]).replace('.', ',').removesuffix(',0')}"></label>
<label>Hauteur <input name="h" inputmode="decimal" value="{str(piece[2]).replace('.', ',').removesuffix(',0')}"></label><p id="surfaces" class="petit"></p></form>''' if surf else '')
        ex = f'''<section class="exemple"><h2>Un exemple composé avec le stock</h2>{form}<div id="ex-lignes">{lignes}</div>
<p class="total">Total indicatif des éléments disponibles : <b id="ex-total"></b></p>
<button class="bouton jaune" id="ex-tout" data-liste-projet="{esc(p['nom'])}" data-vers="../panier.html" data-tout="{esc(json.dumps(tout, ensure_ascii=False))}">Tout mettre dans ma liste « {esc(p['nom'])} »</button>
<p class="petit">Les quantités au m² sont des estimations (10 % de chutes compris) : l'équipe vérifie avec vous ce qui reste en stock.</p></section>'''
    postes = ''.join(f'''<div class="poste"><h3>{esc(po['nom'])}{f' <small>· {esc(po["qte"])}</small>' if po['qte'] else ''}</h3>{f'<p class="conseil">{esc(po["conseil"])}</p>' if po['conseil'] else ''}
{f'<div class="grille">{"".join(carte_w(a, "../") for a in its[:8])}</div>{f"<p class=petit>… et {len(its) - 8} autres possibilités au Comptoir.</p>" if len(its) > 8 else ""}' if its else '<p class="petit">Rien en stock aujourd’hui pour ce poste : demandez à l’équipe s’il en arrive bientôt.</p>'}</div>''' for po, its in p['_postes'])
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
 document.querySelectorAll('.ex-ligne').forEach(d=>{let q=+d.dataset.q||1,txt='';
  if(d.dataset.calc){const need=S[d.dataset.calc];q=Math.max(1,Math.ceil(need/+d.dataset.couv-1e-9));txt=`Il faut environ ${f1(need)} ${U[d.dataset.calc]} : ${q} unité${q>1?'s':''}`}
  else if(q>1)txt=`${q} pièces`;
  d.querySelector('.besoin').textContent=txt;
  if(d.dataset.r){const p=+d.dataset.p;if(p>0)tot+=p*q;d.querySelector('.ex-prix').textContent=p>0?eur(p*q):'prix au comptoir';tout.push(d.dataset.r+':'+q)}});
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
 document.getElementById('liste').innerHTML=D.filter(a=>a.fo.includes(f)).map(a=>`<div class="carte-w"><a class="carte" href="article/${{a.r}}.html"><div class="img"><img loading="lazy" src="${{a.v}}" alt=""></div><div class="txt"><h3>${{esc(a.t)}}</h3><p class="prix">${{esc(a.pt)}}</p><ul class="mini-idees">${{a.i.map(i=>`<li>${{esc(i)}}</li>`).join('')}}</ul></div></a><button class="ajout-mini" data-ajout="${{esc(JSON.stringify({{r:a.r,t:a.t,p:a.p,pt:a.pt,v:a.v}}))}}">+ Ma liste</button></div>`).join('');
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
print(len(pub), 'articles publiés,', len(FONCTIONS), 'fonctions,', len(choix), 'bonnes affaires')
