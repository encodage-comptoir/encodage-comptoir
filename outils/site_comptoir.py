# Génère la maquette du site du Comptoir des Matériaux (pages statiques) à partir du catalogue harmonisé.
# Usage : python3 outils/site_comptoir.py catalogue.json catalogue.csv comptoir/
import sys, os, json, csv, html, re, shutil, unicodedata

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
<nav><a href="{prof}catalogue.html">Catalogue</a><a href="{prof}faire-avec.html">Faire avec</a><a href="{prof}index.html#infos">Infos pratiques</a><a href="{prof}panier.html" class="lien-panier">Ma liste <span class="nb-panier" hidden>0</span></a></nav>
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

# --- données pour le catalogue et « Faire avec » ---
donnees = [{'r': a['ref'], 't': a['titre'], 'c': a['categorie'], 'f': a['famille'], 'p': a['_prix'], 'pt': a['_prix_txt'], 'n': a['_neuf_txt'],
            'e': a['_eco'], 'v': a['_vignette'], 'L': prix_num(a['L']), 'l': prix_num(a['l']), 'h': prix_num(a['h']), 'm': a['matiere'],
            'co': a['couleur'], 'fo': a['fonctions'], 'i': a['idees'], 'k': ' '.join(a['mots_cles'] + [a['titre'], a['famille'], a['ref']]).lower()}
           for a in pub]
json.dump(donnees, open(f'{out}/donnees.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# --- accueil ---
tuiles = ''.join(f'<a class="tuile" href="catalogue.html#cat={slug(c)}"><span>{ICONES.get(c, "•")}</span>{esc(c)}<small>{sum(1 for a in pub if a["categorie"] == c)} articles</small></a>' for c in CATS)
choix = sorted([a for a in pub if a['statut'] == 'ok' and a['_eco'] >= 50 and len(a['photos']) > 1], key=lambda a: -a['_eco'])[:8]
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
<details><summary>Dimensions, matière, prix</summary><div class="plus">
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

# --- Faire avec ---
FONCTIONS = {}
for a in pub:
    for f in a['fonctions']:
        FONCTIONS.setdefault(f, []).append(a)
tuiles = ''.join(f'<button class="tuile" data-f="{esc(f)}">{esc(f)}<small>{len(v)} articles</small></button>' for f, v in sorted(FONCTIONS.items(), key=lambda x: -len(x[1])))
corps = f'''<main class="contenu"><h1>Faire avec</h1><p class="intro">Partez de ce que vous voulez faire : chaque matériau du Comptoir peut servir à autre chose que son usage d’origine.</p>
<div class="tuiles" id="fonctions">{tuiles}</div><h2 id="titre-f"></h2><div class="grille" id="liste"></div></main>
<script>
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}})[c]);let D=[];
function voir(f){{document.querySelectorAll('[data-f]').forEach(b=>b.classList.toggle('sel',b.dataset.f===f));
 document.getElementById('titre-f').textContent=f;
 document.getElementById('liste').innerHTML=D.filter(a=>a.fo.includes(f)).map(a=>`<a class="carte" href="article/${{a.r}}.html"><div class="img"><img loading="lazy" src="${{a.v}}" alt=""></div><div class="txt"><h3>${{esc(a.t)}}</h3><p class="prix">${{esc(a.pt)}}</p><ul class="mini-idees">${{a.i.map(i=>`<li>${{esc(i)}}</li>`).join('')}}</ul></div></a>`).join('');
 location.hash=encodeURIComponent(f)}}
document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>voir(b.dataset.f));
fetch('donnees.json').then(r=>r.json()).then(d=>{{D=d;const h=decodeURIComponent(location.hash.slice(1));if(h)voir(h)}});
</script>'''
open(f'{out}/faire-avec.html', 'w').write(page('Faire avec – Comptoir des Matériaux', 'Des idées pour réutiliser les matériaux du Comptoir : cloisons, potager, abri, déco…', corps, '', '', 'faire-avec.html'))

# --- ma liste / réservation ---
corps = '''<main class="contenu"><h1>Ma liste</h1>
<p class="intro">Préparez vos achats : ajoutez des articles, puis envoyez la liste à l'équipe pour les réserver, ou gardez-la comme liste de courses pour votre passage au comptoir.</p>
<div id="panier" class="panier"></div>
<form id="envoi" class="envoi" hidden><h2>Réserver ces articles</h2>
<label>Nom <input name="nom" required autocomplete="name"></label>
<label>Téléphone <input name="tel" type="tel" required autocomplete="tel"></label>
<label>Passage prévu <input name="quand" placeholder="ex. samedi matin"></label>
<label>Message <textarea name="msg" rows="3" placeholder="Une question, une découpe, un transport…"></textarea></label>
<p class="petit">L'équipe vous confirme la disponibilité par téléphone ou par mail. Paiement au comptoir, à l'enlèvement.</p>
<div class="actions"><button class="bouton">Envoyer ma réservation</button><button type="button" class="bouton clair" id="imprimer">Imprimer ma liste</button>
<button type="button" class="bouton clair" id="partager">Partager ma liste</button><button type="button" class="lien" id="vider">Vider la liste</button></div>
<p id="apres" class="petit" hidden>Votre messagerie s'est ouverte avec la liste : il ne reste qu'à envoyer le mail.</p></form></main>'''
open(f'{out}/panier.html', 'w').write(page('Ma liste – Comptoir des Matériaux', 'Préparez votre liste de matériaux et réservez-la au Comptoir des Matériaux.', corps, '', '', 'panier.html'))

# --- plan du site pour Google ---
urls = ['index.html', 'catalogue.html', 'faire-avec.html'] + [a['_url'] for a in pub]
open(f'{out}/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                       + ''.join(f'<url><loc>{BASE}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_comptoir.css'), f'{out}/style.css')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_comptoir_panier.js'), f'{out}/panier.js')
print(len(pub), 'articles publiés,', len(FONCTIONS), 'fonctions,', len(choix), 'bonnes affaires')
