# Pages du site comptoir-materiaux.be qui ne viennent pas du catalogue : outilthèque, camionnette et atelier,
# compte membre, « Comprendre » (économie circulaire, réemploi) et le blog d'inspiration de « Faire avec ».
# Remet aussi le même menu sur toutes les pages déjà générées.
# Usage : python3 outils/site_pages.py comptoir/
import sys, os, re, glob, html

out = sys.argv[1]
PILE = 'https://www.la-pile.be'
VER = 'p8'
esc = lambda s: html.escape(str(s or ''), quote=True)
# Coordonnées du Comptoir (pas celles de La Pile). INSTAGRAM : à remplir quand le compte du Comptoir est connu.
TEL, TEL_LIEN = '+32 (0)455 10 09 21', '+32455100921'
WHATSAPP = 'https://wa.me/32455100921'
MAIL = 'info@comptoir-materiaux.be'
FACEBOOK = 'https://www.facebook.com/p/Comptoir-des-mat%C3%A9riaux-PILE-61557432835398/'
INSTAGRAM = ''

def logo(prof=''):
    return f'<a class="logo" href="{prof}index.html"><img src="{prof}img/logo-comptoir.png" alt="Comptoir des Matériaux" width="168" height="63"></a>'

def pied(prof=''):
    res = ' · '.join(x for x in [f'<a href="{FACEBOOK}">Facebook</a>' if FACEBOOK else '', f'<a href="{INSTAGRAM}">Instagram</a>' if INSTAGRAM else ''] if x)
    return f'''<footer class="pied"><div class="pied-in">
<img src="{prof}img/logo-comptoir.png" alt="Comptoir des Matériaux" class="pied-logo">
<div><b>Comptoir des Matériaux</b><br>Rue Frédéric Lang 3, 4960 Malmedy<br>Magasin : mercredi et samedi, 9 h – 16 h<br>Tél. <a href="tel:{TEL_LIEN}">{TEL}</a> · <a href="{WHATSAPP}">WhatsApp</a><br><a href="mailto:{MAIL}">{MAIL}</a></div>
<div><a href="{prof}depot.html">Donner des matériaux</a><br><a href="{prof}comprendre.html">Pourquoi le réemploi ?</a><br>{res}<br><span class="petit-pied">Un projet de <a href="{PILE}">La Pile asbl</a></span></div>
</div></footer>'''

def nav(prof=''):
    return (f'<nav><a href="{prof}index.html">Accueil</a><a href="{prof}catalogue.html">Matériaux</a>'
            f'<a href="{prof}outils.html">Outilthèque</a><a href="{prof}reserver.html">Camionnette &amp; atelier</a>'
            f'<a href="{prof}faire-avec.html">Faire avec</a><a href="{prof}comprendre.html">Comprendre</a>'
            f'<a href="{prof}compte.html" class="lien-compte">Mon compte</a>'
            f'<a href="{prof}panier.html" class="lien-panier">Mes listes <span class="nb-panier" hidden>0</span></a></nav>')

def page(nom, titre, desc, corps, script='', compte=True):
    t = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(titre)}</title><meta name="description" content="{esc(desc)}">
<meta name="robots" content="noindex"><!-- maquette : à retirer à la mise en ligne réelle -->
<meta property="og:title" content="{esc(titre)}"><meta property="og:description" content="{esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css?v={VER}"><script src="panier.js?v={VER}" defer></script>{f'<script src="compte.js?v={VER}"></script>' if compte else ''}
</head><body>
<div class="maquette">Maquette : textes, prix et photos à valider par l'équipe.</div>
<header class="haut"><div class="haut-in">
{logo()}
{nav()}
</div></header>
{corps}
{f'<script>{script}</script>' if script else ''}
{pied()}</body></html>'''
    open(os.path.join(out, nom), 'w').write(t)

# ——— Outilthèque : catalogue ———
page('outils.html', 'Outilthèque – Comptoir des Matériaux', "Louez plutôt qu'acheter : perceuses, ponceuses, scies, échelles… à petit prix, pour les membres de La Pile à Malmedy.", '''
<main class="contenu"><div class="tete-outils"><div><h1>Outilthèque</h1>
<p class="intro">Une perceuse sert en moyenne quelques minutes dans sa vie. Plutôt que de l'acheter, louez-la : c'est moins cher, ça prend moins de place, et chaque outil partagé est un outil de moins à fabriquer.</p>
<div class="etapes"><div><b>1</b>Choisissez un outil et une période : du mercredi au samedi, ou du samedi au mercredi</div><div><b>2</b>Envoyez la demande depuis votre compte membre</div><div><b>3</b>On vous confirme par e-mail</div><div><b>4</b>Retrait et retour au Comptoir, paiement sur place</div></div></div>
<img class="photo-outils" src="img/outiltheque.jpg" alt="L'outilthèque du Comptoir, sous la mezzanine" width="800" height="1000"></div>
<p class="note-tarif"><b>Tarif conscient.</b> Notre outilthèque se veut solidaire : vous choisissez votre tarif, solidaire, normal ou soutien, sans justificatif. Les outils sont classés en 2 catégories selon leur valeur ; le prix affiché est le tarif normal.</p>
<form class="filtres" id="filtres" onsubmit="return false">
<input id="q" type="search" placeholder="Rechercher un outil (ponceuse, échelle…)" aria-label="Rechercher">
<select id="cat" aria-label="Famille" hidden><option value="">Toutes les familles</option></select></form>
<div class="rayons" id="familles" aria-label="Familles d'outils"></div>
<p id="nb" class="nb"></p><div class="grille" id="liste"></div>
<div class="encart-don"><h2>Vous avez un outil qui dort ?</h2><p>Donnez-le à l'outilthèque : vous recevez un bon de location équivalent à sa valeur estimée.</p><a class="bouton jaune" href="index.html#infos">Nous contacter</a></div>
</main>''', r'''
const sans=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
let O=[];const $=id=>document.getElementById(id);
function prixCourt(o){return o.prix_periode!=null?`${eurs(o.prix_periode)} / période`:'Prix sur demande'}
function maj(){const mots=sans($('q').value).split(/\s+/).filter(Boolean),c=$('cat').value;
 const r=O.filter(o=>(!c||o.cat===c)&&mots.every(w=>sans([o.nom,o.cat,o.descr,o.ref].join(' ')).includes(w)));
 $('nb').textContent=r.length+' outil'+(r.length>1?'s':'');
 // rangés par famille, une rubrique par famille
 const fam=[...new Set(r.map(o=>o.cat||'Autres'))].sort((a,b)=>a.localeCompare(b,'fr'));
 $('liste').className='';$('liste').innerHTML=fam.map(f=>`<h2 class="famille">${escH(f)}</h2><div class="grille">${r.filter(o=>(o.cat||'Autres')===f).map(carteOutil).join('')}</div>`).join('');
 $('familles').innerHTML=[['','Tout'],...[...new Set(O.map(o=>o.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).map(x=>[x,x])].map(([v,l])=>`<button type="button" data-f="${escH(v)}" class="${v===c?'sel':''}">${escH(l)}</button>`).join('')}
const carteOutil=o=>`<a class="carte" href="outil.html?r=${encodeURIComponent(o.ref)}"><div class="img">${o.photos[0]?`<img loading="lazy" src="${escH(o.photos[0])}" alt="${escH(o.nom)}">`:'<div class="sans-photo">🔧</div>'}</div><div class="txt"><h3>${escH(o.nom)}</h3><p class="prix">${prixCourt(o)}</p><p class="petit">${escH(o.cat||'')}${o.tarif?` · catégorie ${o.tarif}`:''}</p></div></a>`;
$('familles').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;$('cat').value=b.dataset.f;maj()};
Compte.outils().then(l=>{O=l.filter(o=>(o.type||'outil')==='outil');
 [...new Set(O.map(o=>o.cat).filter(Boolean))].sort().forEach(c=>$('cat').add(new Option(c,c)));
 const P=new URLSearchParams(location.search);if(P.get('q'))$('q').value=P.get('q');maj()});
document.querySelectorAll('#filtres input,#filtres select').forEach(e=>e.addEventListener('input',maj));''')

# ——— Fiche d'un outil, de la camionnette ou de l'atelier (même modèle que les matériaux) ———
FICHE_JS = r'''
// Tarifs de la camionnette et de l'atelier (Jérôme, 30/10/2026). Camionnette : pas le jeudi ni le vendredi.
const TARIFS={camionnette:{court:'2,50 €/heure + 0,60 €/km',lignes:[['Location','2,50 € / heure'],['Kilomètres','0,60 € / km, carburant compris'],['Adhésion','30 € / an']],note:'Réservée aux membres : compte en ligne avec pièce d\'identité et permis de conduire. Pas de location le jeudi ni le vendredi.',ferme:[4,5]},
 atelier:{court:'25 € les 3 h · 50 € la journée',lignes:[['3 heures','25 €'],['Journée','50 €']],note:'Demi-tarif pour les associations. Consommables non compris.',ferme:[]}};
const $=id=>document.getElementById(id);const P=new URLSearchParams(location.search);let O=null,choix=null,PRIS=[];
const FERME=()=>(TARIFS[O.type]||{}).ferme||[];
function jourFerme(b){const f=FERME();if(!f.length)return false;const d=new Date(b.debut.slice(0,10)+'T00:00'),e=new Date(b.fin.replace(' ','T'));for(;d<e;d.setDate(d.getDate()+1))if(f.includes(d.getDay()))return true;return false}
function heures(){let h='';for(let i=7;i<=20;i++)h+=`<option>${String(i).padStart(2,'0')}:00</option>`;return h}
const occupe=(d,f)=>PRIS.filter(p=>['confirmee','en_cours'].includes(p.statut)&&p.debut<f&&p.fin>d).length>=(O.qte||1);
const demande=(d,f)=>PRIS.some(p=>p.statut==='demandee'&&p.debut<f&&p.fin>d);
// Outils : on loue par période, du mercredi au samedi ou du samedi au mercredi (jours d'ouverture du Comptoir).
function periodes(){const L=[],j=new Date();j.setHours(0,0,0,0);
 for(let i=0;L.length<8&&i<60;i++){const d=new Date(j);d.setDate(j.getDate()+i);const w=d.getDay();if(w!==3&&w!==6)continue;
  const f=new Date(d);f.setDate(d.getDate()+(w===3?3:4));L.push([d,f])}
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} 09:00`;
 return L.map(([d,f])=>({debut:iso(d),fin:iso(f),lib:`${d.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'short'})} → ${f.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'short'})}`}))}
function formOutil(m){const L=periodes();
 return `<form id="dem" class="form-res"><h2>Choisir une période</h2><p class="petit">Retrait et retour au Comptoir, le mercredi ou le samedi (9 h – 16 h).</p><div class="periodes">${L.map((p,i)=>{const o=occupe(p.debut,p.fin);
  return `<label class="periode${o?' pris':''}"><input type="radio" name="per" value="${i}" ${o?'disabled':''}><span>${p.lib}</span><small>${o?'Déjà loué':demande(p.debut,p.fin)?'Demande en cours':'Libre'}</small></label>`}).join('')}</div>
 ${m?`<label>Message (facultatif) <textarea id="msg" rows="2" placeholder="Pour quel projet ? Besoin de conseils ?"></textarea></label><button class="bouton">Envoyer la demande</button><p id="retour" class="retour"></p>`:blocConnexion()}</form>`}
function formRess(m){if(!m)return '<h2>Réserver</h2>'+blocConnexion();
 return `<form id="dem" class="form-res"><h2>Ma demande</h2>${m.statut==='en_attente'?'<p class="note">Votre adhésion n\'est pas encore validée : vous pouvez envoyer la demande, l\'équipe la validera.</p>':''}
 <div class="deux"><label>Du <input type="date" id="d1" required></label><label>À <select id="h1">${heures()}</select></label></div>
 <div class="deux"><label>Au <input type="date" id="d2"></label><label>À <select id="h2">${heures()}</select></label></div>
 <label>Message (facultatif) <textarea id="msg" rows="2" placeholder="Que transportez-vous ? Quelles machines ?"></textarea></label>
 <p id="estim" class="estim"></p><button class="bouton">Envoyer la demande</button><p id="retour" class="retour"></p></form>`}
function bornes(){if(O.type==='outil'){const r=document.querySelector('[name=per]:checked');if(!r)return null;const p=periodes()[+r.value];return {debut:p.debut,fin:p.fin}}
 const d1=$('d1').value,d2=$('d2').value||d1;return d1?{debut:d1+' '+$('h1').value,fin:d2+' '+$('h2').value}:null}
function estimer(){const b=bornes();if(!b||!$('estim'))return;const h=(Date.parse(b.fin.replace(' ','T'))-Date.parse(b.debut.replace(' ','T')))/36e5;
 if(h>0&&jourFerme(b)){$('estim').textContent='La camionnette n\'est pas disponible le jeudi ni le vendredi.';return}
 if(h>0&&O.type==='camionnette'){$('estim').textContent=`${h} h : ${eurs(h*2.5)} + 0,60 €/km, à régler au Comptoir`;return}
 if(h>0&&O.type==='atelier'){const j=Math.ceil(h/24),p=h<=3?25:h<=24?50:j*50;$('estim').textContent=`${h<=3?'3 heures':j+' jour'+(j>1?'s':'')} : ${eurs(p)} (demi-tarif pour les associations), consommables en plus, à régler au Comptoir`;return}
 const t=h<=0?'':h<=5&&O.prix_we!=null?`Demi-journée : ${eurs(O.prix_we)}`:O.prix_jour!=null?`${Math.ceil(h/24)} jour${h>24?'s':''} : ≈ ${eurs(Math.ceil(h/24)*O.prix_jour)}`:'';
 $('estim').textContent=t?t+(O.caution?` + caution ${eurs(O.caution)}`:'')+', à régler au Comptoir':''}
async function dessiner(){const [m,dispo]=await Promise.all([Compte.moi(),Compte.dispo(O.ref).catch(()=>({pris:[]}))]);PRIS=dispo.pris||[];
 $('cal').innerHTML=O.type==='outil'?'':calendrierHtml(PRIS,choix,FERME());$('form').innerHTML=bandeauDemo()+(O.type==='outil'?formOutil(m):formRess(m));
 $('cal').querySelectorAll('[data-jour]').forEach(b=>b.onclick=()=>{choix=b.dataset.jour;if($('d1')){if(!$('d1').value||$('d2').value){$('d1').value=choix;$('d2').value=''}else if(choix>=$('d1').value)$('d2').value=choix;else $('d1').value=choix;estimer()}
  $('cal').querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));b.classList.add('sel')});
 const f=$('dem');if(!f||!m)return;['d1','d2','h1','h2'].forEach(i=>$(i)&&$(i).addEventListener('change',estimer));
 if($('h1')){$('h1').value='09:00';$('h2').value='17:00'}
 f.onsubmit=async e=>{e.preventDefault();const b=bornes();$('retour').className='retour';
  if(!b){$('retour').className='retour bad';$('retour').textContent=O.type==='outil'?'Choisissez une période.':'Choisissez une date.';return}
  if(jourFerme(b)){$('retour').className='retour bad';$('retour').textContent='La camionnette n\'est pas disponible le jeudi ni le vendredi : choisissez d\'autres jours.';return}
  try{await Compte.api('reserver',{ref:O.ref,nom:O.nom,...b,message:$('msg').value});$('retour').innerHTML='✓ Demande envoyée. Nous vous confirmons par e-mail. <a href="compte.html">Voir mes réservations</a>';f.querySelector('button').disabled=true;setTimeout(dessiner,2500)}
  catch(x){$('retour').className='retour bad';$('retour').textContent=x.message}}}
function tarifsHtml(){if(O.type==='outil')return O.prix_periode!=null?`<p class="prix-gros">${eurs(O.prix_periode)} <small>la période</small></p><p class="petit">Tarif normal${O.tarif?` (catégorie ${O.tarif})`:''}. Tarif conscient : solidaire, normal ou soutien, vous choisissez sans justificatif.</p>`:'<p class="prix-gros">Prix sur demande</p>';
 const T=TARIFS[O.type];if(T)return `<table class="tarifs">${T.lignes.map(x=>`<tr><th>${x[0]}</th><td>${x[1]}</td></tr>`).join('')}</table><p class="petit">${T.note}</p>`;
 const l=[['Demi-journée',O.prix_we],['Journée',O.prix_jour],['Caution',O.caution]].filter(x=>x[1]!=null);
 return l.length?`<table class="tarifs">${l.map(x=>`<tr><th>${x[0]}</th><td>${eurs(x[1])}</td></tr>`).join('')}</table>`:'<p class="prix-gros">Tarifs à venir</p>'}
function afficher(){document.title=O.nom+' – Comptoir des Matériaux';const ic=O.type==='camionnette'?'🚐':O.type==='atelier'?'🪚':'🔧';
 $('fiche').innerHTML=`<p class="fil"><a href="${O.type==='outil'?'outils.html':'reserver.html'}">${O.type==='outil'?'Outilthèque':'Camionnette & atelier'}</a>${O.cat&&O.type==='outil'?' › '+escH(O.cat):''}</p>
 <div class="art-grille"><div><div class="galerie">${O.photos.length?O.photos.map(p=>`<img src="${escH(p)}" alt="${escH(O.nom)}">`).join(''):`<div class="sans-photo grand">${ic}<small>Photo à venir</small></div>`}</div>${O.type==='camionnette'?PLAN_CAMION:''}</div>
 <div><h1>${escH(O.nom)}</h1>${tarifsHtml()}${O.caution&&O.type==='outil'?`<p>Caution : ${eurs(O.caution)}</p>`:''}
 ${O.etat?`<p><b>État :</b> ${escH(O.etat)}</p>`:''}${O.descr?`<div class="descr">${escH(O.descr).replace(/\n/g,'<br>')}</div>`:''}
 <p class="petit">Réf. ${escH(O.ref)}${O.qte>1?` · ${O.qte} exemplaires`:''}</p>
 ${O.type==='outil'?'':'<h2>Disponibilités</h2>'}<div id="cal"></div><div id="form"></div></div></div>`;dessiner()}
// Plan de chargement de la camionnette (Fiat Ducato L2H2, cotes du constructeur).
const PLAN_CAMION=`<section class="plan-camion"><h2>Dimensions de chargement</h2>
 <img src="img/camionnette-plan.svg" alt="Plan de la camionnette avec les cotes de chargement" width="900" height="470">
 <table class="tarifs"><tr><th>Longueur au plancher</th><td>3,12 m</td></tr><tr><th>Largeur (entre les roues)</th><td>1,87 m (1,42 m)</td></tr><tr><th>Hauteur intérieure</th><td>1,93 m</td></tr>
 <tr><th>Portes arrière (l × h)</th><td>1,56 × 1,79 m</td></tr><tr><th>Porte latérale (l × h)</th><td>1,25 × 1,75 m</td></tr><tr><th>Seuil de chargement</th><td>53 cm du sol</td></tr><tr><th>Volume</th><td>11,5 m³</td></tr><tr><th>Charge utile</th><td>≈ 1 200 kg</td></tr></table>
 <p class="petit">Une plaque de 244 × 122 cm passe à plat entre les passages de roue.</p></section>`;
Compte.outils().then(l=>{O=l.find(o=>o.ref===P.get('r'));if(!O){$('fiche').innerHTML='<h1>Introuvable</h1><p><a href="outils.html">Retour à l\'outilthèque</a></p>';return}afficher()});'''
page('outil.html', 'Outil – Comptoir des Matériaux', "Fiche d'un outil de l'outilthèque du Comptoir des Matériaux : prix, caution, disponibilités, demande en ligne.",
     '<main class="article" id="fiche"><p>Chargement…</p></main>', FICHE_JS)

# ——— Camionnette et atelier partagé ———
page('reserver.html', 'Camionnette et atelier partagé – Comptoir des Matériaux', "Réservez en ligne la camionnette partagée (2,50 €/h + 0,60 €/km) ou l'atelier partagé (25 € les 3 h), à Malmedy.", '''
<main class="contenu"><h1>Camionnette &amp; atelier partagé</h1>
<p class="intro">Deux outils en commun pour les membres de La Pile : une camionnette pour transporter vos matériaux, et un atelier équipé pour les travailler.</p>
<div class="deux-grand" id="ress"><p>Chargement…</p></div>
<h2 style="margin-top:40px">Comment ça marche ?</h2>
<div class="infos-prat">
<div><h3>1. Devenir membre</h3><p>Créez votre compte en ligne : l'adhésion est de 30 €/an. Pour la camionnette, il faut aussi votre pièce d'identité et votre permis de conduire. L'équipe active ensuite votre compte.</p></div>
<div><h3>2. Réserver</h3><p>Choisissez vos dates sur le calendrier et envoyez la demande. Vous recevez la confirmation par e-mail.</p></div>
<div><h3>3. Camionnette : sauf jeudi et vendredi</h3><p>Elle s'ouvre avec l'appli Wibee, même quand le Comptoir est fermé. Le jeudi et le vendredi, elle sert à La Pile et au Comptoir.</p></div>
<div><h3>4. Au retour</h3><p>Notez les kilomètres : le carburant est compris dans le prix au km. Le paiement se fait au Comptoir (espèces, QR code ou virement).</p></div></div>
</main>''', r'''
const $=id=>document.getElementById(id);
// Tarifs de la camionnette et de l'atelier (Jérôme, 30/10/2026). Camionnette : pas le jeudi ni le vendredi.
const TARIFS={camionnette:{court:'2,50 €/heure + 0,60 €/km',lignes:[['Location','2,50 € / heure'],['Kilomètres','0,60 € / km, carburant compris'],['Adhésion','30 € / an']],note:'Réservée aux membres : compte en ligne avec pièce d\'identité et permis de conduire. Pas de location le jeudi ni le vendredi.',ferme:[4,5]},
 atelier:{court:'25 € les 3 h · 50 € la journée',lignes:[['3 heures','25 €'],['Journée','50 €']],note:'Demi-tarif pour les associations. Consommables non compris.',ferme:[]}};
Compte.outils().then(l=>{const R=l.filter(o=>o.type==='camionnette'||o.type==='atelier');
 $('ress').innerHTML=R.length?R.map(o=>`<a class="carte ress" href="outil.html?r=${encodeURIComponent(o.ref)}"><div class="img">${o.photos[0]?`<img src="${escH(o.photos[0])}" alt="">`:`<div class="sans-photo">${o.type==='camionnette'?'🚐':'🪚'}</div>`}</div>
 <div class="txt"><h2>${escH(o.nom)}</h2><p>${escH((o.descr||'').split('\n')[0])}</p><p class="prix">${(TARIFS[o.type]||{}).court||(o.prix_jour!=null?eurs(o.prix_jour)+' / jour':'Tarifs à venir')}</p><span class="bouton">Voir les disponibilités</span></div></a>`).join(''):'<p>Bientôt disponible.</p>'});''')

# ——— Compte membre ———
page('compte.html', 'Mon compte – Comptoir des Matériaux', "Connexion, inscription et réservations des membres de La Pile.", '''
<main class="contenu etroit" id="zone"><p>Chargement…</p></main>''', r'''
const $=id=>document.getElementById(id);const retour=new URLSearchParams(location.search).get('retour');
function connexion(){ $('zone').innerHTML=bandeauDemo()+`<h1>Mon compte</h1><div class="deux-grand">
 <form id="fc" class="form-res"><h2>J'ai un compte</h2><label>E-mail <input type="email" id="ce" required autocomplete="email"></label><label>Mot de passe <input type="password" id="cm" required autocomplete="current-password"></label><button class="bouton">Me connecter</button><p class="retour" id="rc"></p><p class="petit">Mot de passe oublié ? Appelez le Comptoir, l'équipe vous aide.</p></form>
 <form id="fi" class="form-res"><h2>Devenir membre</h2><label>Nom et prénom <input id="in" required autocomplete="name"></label><label>E-mail <input type="email" id="ie" required autocomplete="email"></label><label>Téléphone <input type="tel" id="it" autocomplete="tel"></label><label>Adresse <input id="ia" autocomplete="street-address"></label><label>Mot de passe (8 caractères au moins) <input type="password" id="im" minlength="8" required autocomplete="new-password"></label>
 <p class="petit">L'adhésion (30 €/an) se règle au Comptoir ; l'équipe active alors votre compte. En attendant, vous pouvez déjà envoyer des demandes.</p><button class="bouton jaune">Créer mon compte</button><p class="retour" id="ri"></p></form></div>`;
 $('fc').onsubmit=e=>envoi(e,'connexion',{email:$('ce').value,mdp:$('cm').value},'rc');
 $('fi').onsubmit=e=>envoi(e,'inscription',{nom:$('in').value,email:$('ie').value,tel:$('it').value,adresse:$('ia').value,mdp:$('im').value},'ri')}
async function envoi(e,a,c,r){e.preventDefault();try{const j=await Compte.api(a,c);Compte.membre=j.membre;if(retour&&/^https?:/.test(retour)&&new URL(retour).origin===location.origin)location.href=retour;else espace()}catch(x){$(r).className='retour bad';$(r).textContent=x.message}}
async function espace(){const m=Compte.membre,L=await Compte.api('mes');
 const st={en_attente:'Adhésion à valider au Comptoir',actif:'Membre actif'+(m.jusqua?` jusqu'au ${new Date(m.jusqua).toLocaleDateString('fr-BE')}`:''),suspendu:'Compte suspendu'}[m.statut]||m.statut;
 $('zone').innerHTML=bandeauDemo()+`<h1>Bonjour ${escH(m.nom)}</h1><p><span class="pastille ${m.statut==='actif'?'ok':'jaune'}">${st}</span></p>
 <h2>Mes réservations</h2>${L.length?`<div class="liste-res">${L.map(r=>`<div class="res"><div><b>${escH(r.nom||r.ref)}</b><br><span class="petit">${dateFr(r.debut)} → ${dateFr(r.fin)}</span>${r.code_acces?`<br><span class="code">Accès : ${escH(r.code_acces)}</span>`:''}</div><div><span class="pastille ${STATUT_FR[r.statut][1]}">${STATUT_FR[r.statut][0]}</span>${['demandee','confirmee'].includes(r.statut)?`<button class="lien" data-ann="${r.id}">Annuler</button>`:''}</div></div>`).join('')}</div>`:'<p>Aucune réservation pour l\'instant.</p>'}
 <p><a class="bouton" href="outils.html">Louer un outil</a> <a class="bouton jaune" href="reserver.html">Camionnette &amp; atelier</a></p>
 <details class="profil"><summary>Mes coordonnées</summary><form id="fp" class="form-res"><label>Nom <input id="pn" value="${escH(m.nom)}"></label><label>Téléphone <input id="pt" value="${escH(m.tel||'')}"></label><label>Adresse <input id="pa" value="${escH(m.adresse||'')}"></label><button class="bouton">Enregistrer</button></form></details>
 <p><button class="lien" id="deco">Me déconnecter</button></p>`;
 $('zone').querySelectorAll('[data-ann]').forEach(b=>b.onclick=async()=>{if(confirm('Annuler cette réservation ?')){await Compte.api('annuler',{id:+b.dataset.ann});espace()}});
 $('fp').onsubmit=async e=>{e.preventDefault();Compte.membre=(await Compte.api('profil',{nom:$('pn').value,tel:$('pt').value,adresse:$('pa').value})).membre;espace()};
 $('deco').onclick=async()=>{await Compte.api('deconnexion',{});Compte.membre=null;connexion()}}
Compte.moi().then(m=>m?espace():connexion());''')

# ——— Comprendre : économie circulaire et réemploi ———
page('comprendre.html', 'Comprendre le réemploi – Comptoir des Matériaux', "Pourquoi réemployer les matériaux de construction ? Économie circulaire, déchets, CO₂ : la raison d'être du Comptoir des Matériaux.", '''
<section class="hero hero-court"><div class="hero-in"><h1>Pourquoi <span>réemployer</span> ?</h1>
<p>Un évier, une porte ou une brique ont déjà coûté de l'énergie, de l'eau et des matières premières. Les jeter, c'est perdre tout cela. Les réemployer, c'est le garder.</p></div></section>
<main class="contenu comprendre">
<div class="chiffres">
<div><b>≈ 1/3</b><span>des déchets produits en Europe viennent de la construction et de la démolition</span></div>
<div><b>&gt; 15 t</b><span>de matériaux remis en circulation par le Comptoir en 2026</span></div>
<div><b>jusqu'à −90 %</b><span>sur le prix d'un matériau, par rapport au neuf</span></div>
<div><b>quelques minutes</b><span>c'est ce que sert une perceuse dans toute sa vie, en moyenne</span></div></div>

<h2>L'économie circulaire, en deux mots</h2>
<p>L'économie « linéaire » <em>extrait, fabrique, utilise, jette</em>. L'économie circulaire cherche à garder les objets et les matériaux en usage le plus longtemps possible, à leur meilleure valeur. Elle ne parle pas d'abord de recyclage : recycler, c'est déjà casser l'objet pour en refaire de la matière, avec de l'énergie. Avant ça, il y a mieux.</p>

<h2>L'échelle : du meilleur au moins bon</h2>
<ol class="echelle">
<li><b>Éviter</b><span>Ne pas acheter ce dont on n'a pas besoin. Louer ou emprunter plutôt qu'acheter : c'est l'outilthèque et la camionnette partagée.</span></li>
<li><b>Réemployer</b><span>Utiliser à nouveau, tel quel, pour le même usage : une porte reste une porte. C'est le cœur du Comptoir.</span></li>
<li><b>Réutiliser, détourner</b><span>Donner un autre usage : un châssis devient une serre, une palette un bac potager. C'est « Faire avec ».</span></li>
<li><b>Réparer</b><span>Remettre en état plutôt que remplacer : c'est l'atelier partagé.</span></li>
<li><b>Recycler</b><span>Broyer, fondre, refondre pour refaire de la matière. Utile, mais cela consomme de l'énergie et perd de la valeur.</span></li>
<li><b>Valoriser, éliminer</b><span>Brûler pour l'énergie, ou mettre en décharge. Le dernier recours.</span></li></ol>

<h2>Pourquoi les matériaux de construction ?</h2>
<div class="infos-prat">
<div><h3>Beaucoup de matière</h3><p>La construction est le secteur qui consomme le plus de matières premières et produit le plus de déchets. Une rénovation de salle de bain sort vite plusieurs centaines de kilos de matériaux, souvent en parfait état.</p></div>
<div><h3>Beaucoup de CO₂ « caché »</h3><p>Cuire une brique, fondre du verre, produire de l'acier ou de la céramique émet beaucoup de CO₂. Ce carbone est déjà dépensé : réemployer l'objet évite d'en émettre à nouveau pour un neuf. Sur chaque fiche du catalogue, on indique une estimation du CO₂ évité.</p></div>
<div><h3>Des ressources locales</h3><p>Ce qui est démonté à Malmedy et alentours resservit ici : moins de transport, et de l'argent qui reste dans la région.</p></div>
<div><h3>Des emplois</h3><p>Trier, nettoyer, mesurer, photographier, conseiller : le réemploi crée du travail local, souvent en insertion.</p></div></div>

<h2>Le Comptoir, concrètement</h2>
<div class="quatre">
<a href="index.html#infos"><span>📦</span><b>Le dépôt</b>Des matériaux en trop (chantier, fin de stock, rénovation) ? Proposez-les-nous (photos d'abord).</a>
<a href="catalogue.html"><span>🏷️</span><b>Le magasin</b>Sanitaires, portes, châssis, carrelage, bois… à prix doux, mercredi et samedi.</a>
<a href="outils.html"><span>🔧</span><b>L'outilthèque</b>Louez l'outil plutôt que de l'acheter.</a>
<a href="reserver.html"><span>🪚</span><b>L'atelier et la camionnette</b>Un espace équipé et un véhicule, en commun pour les membres.</a></div>

<h2>Ce que vous pouvez faire</h2>
<ul class="gestes">
<li><b>Avant de jeter :</b> une porte, un évier, des carrelages en trop ? Appelez-nous avant le conteneur.</li>
<li><b>Avant d'acheter neuf :</b> regardez le catalogue, avec les mesures L1, L2, L3 pour savoir si ça rentre.</li>
<li><b>Avant d'acheter un outil :</b> louez-le à l'outilthèque.</li>
<li><b>Pour démonter :</b> dévisser plutôt que casser, garder les pièces ensemble, noter les mesures.</li>
<li><b>Pour s'inspirer :</b> parcourez les <a href="inspiration.html">réalisations en réemploi</a>.</li></ul>

<details class="sources"><summary>Sources et précisions</summary><p>Part des déchets de construction et démolition dans l'Union européenne : Eurostat, statistiques des déchets (environ un tiers du total, hors déchets miniers selon les années). Tonnage 2026 du Comptoir : estimation à partir des ventes enregistrées (poids estimés par catégorie). CO₂ évité : ordres de grandeur tirés des bases INIES / TOTEM, à affiner. Durée d'usage d'une perceuse : chiffre couramment cité par les outilthèques, à prendre comme un ordre de grandeur.</p></details>
</main>''', compte=False)

# ——— Inspiration : le blog de « Faire avec » ———
page('inspiration.html', 'Inspirations – Faire avec – Comptoir des Matériaux', "Réalisations en réemploi : idées et photos pour faire avec les matériaux du Comptoir.", '''
<main class="contenu"><p class="fil"><a href="faire-avec.html">Faire avec</a> › Inspirations</p><h1>Inspirations</h1>
<p class="intro">Des réalisations en réemploi, ici ou ailleurs : de quoi donner des idées. Vous avez réalisé quelque chose avec des matériaux du Comptoir ? Envoyez-nous vos photos, on la publie.</p>
<div class="filtres-tags" id="tags"></div>
<div class="blog" id="liste"></div>
<article class="billet-plein" id="billet" hidden></article>
<p class="centre"><a class="bouton jaune" href="mailto:info@comptoir-materiaux.be?subject=Ma%20r%C3%A9alisation%20en%20r%C3%A9emploi">Proposer ma réalisation</a></p>
</main>''', r'''
const $=id=>document.getElementById(id);let B=[],tag='';
const carte=b=>`<a class="billet" href="#${encodeURIComponent(b.id)}"><div class="img">${b.photos&&b.photos[0]?`<img loading="lazy" src="${escH(b.photos[0])}" alt="">`:`<div class="sans-photo">${b.icone||'🌱'}</div>`}</div><div class="txt"><p class="petit">${escH((b.tags||[]).join(' · '))}</p><h3>${escH(b.titre)}</h3><p>${escH(b.chapo)}</p></div></a>`;
function liste(){$('billet').hidden=true;$('liste').hidden=false;$('tags').hidden=false;
 const t=[...new Set(B.flatMap(b=>b.tags||[]))];$('tags').innerHTML=['',...t].map(x=>`<button class="tag${x===tag?' sel':''}" data-t="${escH(x)}">${x?escH(x):'Tout'}</button>`).join('');
 $('tags').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tag=b.dataset.t;liste()});
 $('liste').innerHTML=B.filter(b=>!tag||(b.tags||[]).includes(tag)).map(carte).join('')}
function billet(id){const b=B.find(x=>x.id===id);if(!b)return liste();$('liste').hidden=true;$('tags').hidden=true;$('billet').hidden=false;
 $('billet').innerHTML=`<p><a href="#">← Toutes les inspirations</a></p><p class="petit">${escH((b.tags||[]).join(' · '))}${b.date?' · '+new Date(b.date).toLocaleDateString('fr-BE',{month:'long',year:'numeric'}):''}</p><h2>${escH(b.titre)}</h2><p class="accroche">${escH(b.chapo)}</p>
 ${(b.photos||[]).length?`<div class="galerie">${b.photos.map(p=>`<img src="${escH(p)}" alt="">`).join('')}</div>`:`<div class="sans-photo grand">${b.icone||'🌱'}<small>Photos à venir</small></div>`}
 ${(b.texte||[]).map(p=>`<p>${escH(p)}</p>`).join('')}
 ${(b.materiaux||[]).length?`<h3>Ce qu'il faut</h3><ul>${b.materiaux.map(m=>`<li>${escH(m.t)}${m.q?` – <a href="catalogue.html?q=${encodeURIComponent(m.q)}">voir au catalogue</a>`:''}</li>`).join('')}</ul>`:''}
 ${b.projet?`<p><a class="bouton" href="projet/${escH(b.projet)}.html">Le projet pas à pas</a></p>`:''}${b.credit?`<p class="petit">${escH(b.credit)}</p>`:''}`;scrollTo(0,0)}
const route=()=>{const h=decodeURIComponent(location.hash.slice(1));h?billet(h):liste()};
addEventListener('hashchange',route);
fetch('inspiration.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>{B=j;route()});''', compte=True)


# ——— Dépôt : proposer ses matériaux ———
page('depot.html', 'Donner des matériaux – Comptoir des Matériaux', "Fin de chantier, fin de stock, rénovation, garage à vider : proposez vos matériaux de construction en bon état au Comptoir des Matériaux de Malmedy. Envoyez quelques photos, on vous répond.", f"""
<main class="contenu etroit"><h1>Donner des matériaux</h1>
<p class="intro">Particulier ou professionnel : fin de chantier, fin de stock, surplus de commande, rénovation, garage ou grenier à vider… Ce qui est encore en bon état peut resservir ici, au lieu de partir au conteneur.</p>
<div class="etapes"><div><b>1</b>Envoyez-nous quelques photos et une description, ici ou par WhatsApp</div><div><b>2</b>On vous répond : oui, non, ou une question</div><div><b>3</b>Vous apportez les matériaux un jour d'ouverture, ou on organise un enlèvement</div></div>
<p class="note-tarif"><b>Merci de ne pas venir déposer sans nous avoir contactés :</b> la place est comptée et certains matériaux ne se revendent pas.</p>
<div class="deux-grand">
<div><h2>Ce qu'on accepte</h2><ul class="acceptes"><li>Bois, panneaux, poutres</li><li>Carrelage, parquet, bardage</li><li>Sanitaires (éviers, lavabos, WC, baignoires, douches)</li><li>Portes, châssis, verre</li><li>Isolation (propre et sèche)</li><li>Tubes, quincaillerie, accessoires électriques</li><li>Radiateurs, luminaires</li><li>Outils (pour l'outilthèque : bon de location en échange)</li></ul>
<h2>Ce qu'on refuse</h2><ul class="refuses"><li>Matériaux cassés, pourris ou incomplets</li><li>Amiante (vieilles plaques ondulées, Eternit…)</li><li>Pots de peinture, produits chimiques</li><li>Déchets de démolition en vrac</li></ul>
<p>Plus rapide : <a class="bouton jaune" href="{WHATSAPP}">Photos par WhatsApp</a></p><p class="petit">Ou par téléphone : <a href="tel:{TEL_LIEN}">{TEL}</a></p></div>
<form id="fd" class="form-res"><h2>Proposer mes matériaux</h2>
<label>Quoi ? <textarea id="dq" rows="3" required placeholder="ex. 12 m² de carrelage gris 30 × 30, 3 portes intérieures en chêne 83 cm…"></textarea></label>
<label>Photos (jusqu'à 5) <input type="file" id="dp" accept="image/*" multiple></label><div id="apercu" class="apercu"></div>
<label>Où sont-ils ? <input id="dl" placeholder="Commune"></label>
<label><span><input type="checkbox" id="de"> J'aurais besoin d'un enlèvement</span></label>
<label>Nom <input id="dn" required autocomplete="name"></label>
<div class="deux"><label>Téléphone <input id="dt" type="tel" autocomplete="tel"></label><label>E-mail <input id="dm" type="email" autocomplete="email"></label></div>
<input id="dh" class="cache" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="bouton">Envoyer ma proposition</button><p class="retour" id="dr"></p></form></div>
</main>""", r"""
const $=id=>document.getElementById(id);let P=[];
// Photos réduites dans le navigateur (1600 px) : envoi rapide même depuis un GSM.
function reduire(f){return new Promise(ok=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>ok(b),'image/jpeg',.82)};i.onerror=()=>ok(null);i.src=URL.createObjectURL(f)})}
$('dp').onchange=async e=>{P=(await Promise.all([...e.target.files].slice(0,5).map(reduire))).filter(Boolean);$('apercu').innerHTML=P.map(b=>`<img src="${URL.createObjectURL(b)}" alt="">`).join('')};
$('fd').onsubmit=async e=>{e.preventDefault();const r=$('dr');r.className='retour';
 if(!$('dt').value&&!$('dm').value){r.className='retour bad';r.textContent='Indiquez un téléphone ou un e-mail pour qu\'on puisse vous répondre.';return}
 const d={quoi:$('dq').value,lieu:$('dl').value,enlevement:$('de').checked?1:0,nom:$('dn').value,tel:$('dt').value,email:$('dm').value,site:$('dh').value};
 if(Compte.demo===null)await Compte.sonder();
 if(Compte.demo){r.innerHTML='Maquette : sur comptoir-materiaux.be, la proposition et les photos arriveront dans la caisse du Comptoir. En attendant, <a href="'+WA+'">envoyez-les par WhatsApp</a>.';return}
 const fd=new FormData();Object.entries(d).forEach(([k,v])=>fd.append(k,v));P.forEach((b,i)=>fd.append('photos[]',b,'photo'+i+'.jpg'));
 try{const x=await fetch(API+'?a=depot',{method:'POST',body:fd});const j=await x.json();if(!x.ok||j.erreur)throw new Error(j.erreur||'Erreur');
  r.textContent='✓ Merci ! Nous revenons vers vous rapidement.';e.target.reset();P=[];$('apercu').innerHTML=''}catch(x){r.className='retour bad';r.textContent=x.message}};""".replace('WA', repr(WHATSAPP)))

# ——— Même menu partout ———
for f in glob.glob(os.path.join(out, '*.html')) + glob.glob(os.path.join(out, '*', '*.html')):
    prof = '../' if os.path.dirname(f) != out.rstrip('/') else ''
    t = open(f).read()
    n = re.sub(r'<nav>.*?</nav>', lambda m: nav(prof), t, count=1, flags=re.S)
    n = re.sub(r'<a class="logo".*?</a>', lambda m: logo(prof), n, count=1, flags=re.S)
    n = re.sub(r'<footer class="pied">.*?</footer>', lambda m: pied(prof), n, count=1, flags=re.S)
    n = re.sub(r'(style\.css|panier\.js)\?v=[\w]+', rf'\1?v={VER}', n)
    # Favicon du Comptoir (les flèches jaunes du logo sur fond turquoise).
    ico = f'<!--ico--><link rel="icon" href="{prof}favicon.ico" sizes="any"><link rel="icon" type="image/png" href="{prof}favicon-32.png"><link rel="apple-touch-icon" href="{prof}apple-touch-icon.png"><!--/ico-->'
    n = re.sub(r'<!--ico-->.*?<!--/ico-->', '', n).replace('</head>', ico + '</head>', 1)
    if n != t:
        open(f, 'w').write(n)

# ——— Ajouts aux pages générées par site_comptoir.py (à relancer après lui) ———
def inserer(nom, apres, bloc, marque):
    f = os.path.join(out, nom)
    t = open(f).read()
    t = re.sub(rf'<!--{marque}-->.*?<!--/{marque}-->', '', t, flags=re.S)
    if apres in t:
        open(f, 'w').write(t.replace(apres, apres + f'<!--{marque}-->{bloc}<!--/{marque}-->', 1))

# Accueil : la recherche, puis directement les services (photos dans img/services/, sinon une photo de repli).
SERVICES = [
    ('catalogue.html', 'materiaux', 'Catalogue matériaux', 'Sanitaires, portes, châssis, carrelage, bois… de réemploi, à prix doux.', 'Explorer ›', '🏷️', f'{PILE}/sites/lapile/gallery_images/thumbs/6958f28b6442e.jpg'),
    ('outils.html', 'outillage', 'Location d’outillage', 'Perceuses, scies, échelles… louées à la période, au tarif conscient.', 'Réserver', '🔧', 'https://lapilebucket.s3.eu-west-3.amazonaws.com/production/item/scv-6a1942ef45853.webp'),
    ('reserver.html', 'camionnette-atelier', 'Camionnette & atelier', 'La camionnette et l’atelier partagé, à réserver en ligne.', 'Réserver', '🚐', ''),
    ('inspiration.html', 'inspirer', 'S’inspirer', 'Des réalisations en réemploi, en photos.', 'Découvrir ›', '🌱', ''),
]
def accueil():
    f = os.path.join(out, 'index.html'); t = open(f).read()
    tuiles = ''.join(f"""<a class="service" href="{h}"><div class="img"><img src="img/services/{n}.jpg" alt="" loading="lazy" data-repli="{esc(r)}" onerror="if(this.dataset.repli){{this.src=this.dataset.repli;this.dataset.repli=''}}else{{this.remove()}}"><span class="ic">{ic}</span></div><div class="txt"><h3>{esc(ti)}</h3><p>{esc(d)}</p><span class="cta">{esc(cta)}</span></div></a>""" for h, n, ti, d, cta, ic, r in SERVICES)
    don = '<a class="bandeau-don" href="depot.html"><span aria-hidden="true">📦</span><span><b>Des matériaux en trop ?</b> Fin de chantier, fin de stock, rénovation, garage à vider… Donnez-nous ce qui est encore bon : quelques photos suffisent.</span><span class="bouton jaune">Proposer un don</span></a>'
    bloc = f'<section class="contenu"><h2 class="sr">Nos services</h2><div class="services">{tuiles}</div>{don}</section>\n'
    t = re.sub(r'(<section class="hero"><div class="hero-in">)<h1>.*?</h1>', r'\1<h1 class="hero-logo"><img src="img/logo-comptoir.png" alt="Comptoir des Matériaux" width="735" height="275"></h1>', t, flags=re.S)
    t = re.sub(r'<form action="catalogue.html" class="cherche">.*?</form>', '', t, flags=re.S)  # plus de recherche sur l'accueil
    a = t.index('</div></section>', t.index('<section class="hero">')) + len('</div></section>')
    b = t.index('<section class="contenu" id="infos">')
    t = t[:a] + '\n' + bloc + t[b:]
    t = t.replace('<p>Matériaux de construction de réemploi à Malmedy : sanitaires, portes, châssis, carrelage, bois… jusqu’à 90 % moins chers que le neuf.</p>', '<p>Matériaux de construction de réemploi, outils et camionnette à louer, atelier partagé : à Malmedy, on fait avec ce qui existe déjà.</p>')
    # Infos pratiques : horaires et contact en premier, bien visibles (Comment ? et Donner ? retirés, le don a son bandeau).
    infos = f"""<!--infos--><h2 style="margin-top:32px">Infos pratiques</h2><div class="infos-top">
<div class="horaires"><span class="ic" aria-hidden="true">🕘</span><div><h3>Horaires du magasin</h3><p class="gros">Mercredi et samedi<br><b>9 h – 16 h</b></p><p class="petit">En dehors de ces heures, sur rendez-vous.</p></div></div>
<div class="contact"><span class="ic" aria-hidden="true">📞</span><div><h3>Nous contacter</h3><p class="gros"><a href="tel:{TEL_LIEN}">{TEL}</a></p><p><a href="{WHATSAPP}">WhatsApp</a> · <a href="mailto:{MAIL}">{MAIL}</a></p></div></div></div><!--/infos-->"""
    # anciennes versions du bloc (en tête de section, ou l'ancienne grille Quand ?/Comment ?/Donner ?)
    t = re.sub(r'<!--infos-->.*?<!--/infos-->', '', t, flags=re.S)
    t = re.sub(r'<h2>Infos pratiques</h2><div class="infos-top">.*?</div></div></div>\n<h2 style="margin-top:32px">Où nous trouver</h2>', '<h2>Où nous trouver</h2>', t, flags=re.S)
    t = re.sub(r'<h2 style="margin-top:32px">Infos pratiques</h2><div class="infos-prat">.*?</div></div></section>', '</section>', t, flags=re.S)
    i = t.index('<section class="contenu" id="infos">'); j = t.index('</section>', i)
    t = t[:j] + infos + t[j:]
    # Accès : montage des photos du chemin (img/acces.jpg), s'il existe.
    if os.path.exists(os.path.join(out, 'img', 'acces.jpg')):
        t = re.sub(r'<div class="encart photo-lieu">.*?</div></div>', '<div class="encart photo-lieu"><a href="img/acces.jpg"><img src="img/acces.jpg" alt="Le chemin vers le Comptoir, en photos" loading="lazy"></a><p><b>Le chemin en 4 photos</b> : depuis le panneau 3b, longez Malmedy Expo, le Comptoir est derrière. <a href="img/acces.jpg">Agrandir</a></p></div></div>', t, count=1, flags=re.S)
    open(f, 'w').write(t)
accueil()

# Catalogue : recherche tolérante aux fautes (« carelage », « lavabot », « porte » / « portes »…).
def recherche_souple():
    f = os.path.join(out, 'catalogue.html'); t = open(f).read()
    if 'proche(' in t: return
    js = """const dbl=s=>s.replace(/(.)\\1+/g,'$1');
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;let p=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
// Un mot cherché trouve l'article s'il y figure, ou s'il en est proche (lettre doublée, oubliée, en trop ou changée).
function proche(a,w){if(!a._k){a._k=sans(a.k);a._w=a._k.split(/[^a-z0-9]+/).filter(Boolean).map(dbl)}
 if(a._k.includes(w))return true;const d=dbl(w);if(d.length>=3&&a._w.some(t=>t.includes(d)))return true;if(d.length<4)return false;
 const tol=d.length>=7?2:1;return a._w.some(t=>lev(d,t)<=tol||(t.length>d.length&&lev(d,t.slice(0,d.length))<=tol))}
"""
    t = t.replace("function num(id)", js + "function num(id)", 1)
    t = t.replace("&&mots.every(w=>sans(a.k).includes(w)));", "&&mots.every(w=>proche(a,w)));", 1)
    open(f, 'w').write(t)
recherche_souple()

# Catalogue : les rayons en boutons de couleur, au-dessus de la recherche.
inserer('catalogue.html', '<main class="contenu"><h1>Catalogue</h1>', """
<div class="rayons" id="rayons" aria-label="Rayons"></div><p class="petit lien-depot">Vous avez des matériaux à donner ? <a href="depot.html">Proposez-les</a></p>
<script>addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('cat'),r=document.getElementById('rayons');if(!s)return;
 const dess=()=>{r.innerHTML=[...s.options].map(o=>`<button type="button" data-r="${o.value}" class="${o.value===s.value?'sel':''}">${o.value?o.text:'Tout'}</button>`).join('')};
 r.onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;s.value=b.dataset.r;s.dispatchEvent(new Event('input'));dess()};
 s.addEventListener('input',dess);dess()});</script>""", 'rayons')

inserer('faire-avec.html', 'Partez d’un projet ou de ce que vous voulez faire.</p>', '''
<a class="encart-inspi" href="inspiration.html"><div><h2>Inspirations</h2><p>Des réalisations en réemploi, en photos : une serre en vieux châssis, un plan de travail en parquet, une cloison en portes… De quoi donner envie de faire avec.</p><span class="bouton jaune">Voir les inspirations</span></div><div class="inspi-icones" aria-hidden="true">🪟🌱🚪🪵</div></a>''', 'inspi')
