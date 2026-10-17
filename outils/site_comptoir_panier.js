// Listes « ma liste » : plusieurs listes nommées (une par projet), gardées dans le navigateur du visiteur, envoyées par mail pour réservation.
(function(){
const CLE='comptoir-listes',ANCIENNE='comptoir-panier',MAIL='info@la-pile.be';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const eur=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',').replace(',00','')+' €';
let memo=null;
function etat(){
 if(memo)return memo;
 try{memo=JSON.parse(localStorage.getItem(CLE))}catch(e){}
 if(!memo||!Array.isArray(memo.listes)||!memo.listes.length){
  let vieux=[];try{vieux=JSON.parse(localStorage.getItem(ANCIENNE))||[]}catch(e){}
  memo={cur:0,listes:[{nom:'Ma liste',items:vieux}]};
 }
 if(memo.cur>=memo.listes.length)memo.cur=0;
 return memo;
}
const courante=()=>{const s=etat();return s.listes[s.cur]};
function sauver(){try{localStorage.setItem(CLE,JSON.stringify(etat()))}catch(e){}compteur();if(document.getElementById('panier'))afficher()}
function compteur(){const l=courante(),n=l.items.reduce((s,a)=>s+a.q,0);document.querySelectorAll('.nb-panier').forEach(e=>{e.textContent=n;e.hidden=!n})}
// jamais plus que le stock connu (s = 0 : stock non compté, pas de plafond) ; renvoie le nombre réellement ajouté
const plafond=(a,q)=>a.s>0?Math.min(q,a.s):q;
function ajouter(a,q){q=q||a.q||1;const l=courante(),x=l.items.find(y=>y.r===a.r);
 if(x){if(a.s!==undefined){x.s=a.s;x.o=a.o}const avant=x.q;x.q=plafond(x,x.q+q);return x.q-avant}
 const n=plafond(a,q);if(n>0)l.items.push({...a,q:n});return n}
function choisir(nom){const s=etat();let i=s.listes.findIndex(l=>l.nom===nom);if(i<0){s.listes.push({nom,items:[]});i=s.listes.length-1}s.cur=i}
window.ComptoirListes={etat,courante,choisir,ajouter,sauver};

// sélecteur de liste à côté des gros boutons « Ajouter à ma liste » (page article), seulement s'il y a plusieurs listes
function selecteurs(){
 const s=etat();document.querySelectorAll('.choix-liste').forEach(e=>e.remove());
 if(s.listes.length<2)return;
 document.querySelectorAll('.bouton[data-ajout]').forEach(b=>{const sel=document.createElement('select');sel.className='choix-liste';sel.setAttribute('aria-label','Dans quelle liste');
  sel.innerHTML=s.listes.map((l,i)=>`<option value="${i}"${i===s.cur?' selected':''}>dans « ${esc(l.nom)} »</option>`).join('');
  sel.onchange=()=>{s.cur=+sel.value;sauver()};b.after(sel)});
}
document.addEventListener('click',e=>{
 const p=e.target.closest('[data-liste-projet]');
 if(p){e.preventDefault();choisir(p.dataset.listeProjet);JSON.parse(p.dataset.tout||'[]').forEach(a=>ajouter(a,a.q));sauver();location.href=p.dataset.vers||'panier.html';return}
 const b=e.target.closest('[data-ajout]');if(!b)return;e.preventDefault();
 const a=JSON.parse(b.dataset.ajout),n=ajouter(a,1);sauver();const t=b.textContent;
 b.textContent=n?`Ajouté à « ${courante().nom} » ✓`:`Déjà ${a.s>1?'les '+a.s:'le seul'} en stock dans la liste`;b.classList.add('ok');setTimeout(()=>{b.textContent=t;b.classList.remove('ok')},1800)});

function afficher(){
 const s=etat(),l=courante(),z=document.getElementById('panier');
 document.getElementById('listes').innerHTML=s.listes.map((x,i)=>`<button type="button" class="puce${i===s.cur?' sel':''}" data-liste="${i}">${esc(x.nom)} <span>${x.items.reduce((a,y)=>a+y.q,0)}</span></button>`).join('')
  +`<button type="button" class="puce plus" id="nouvelle">+ Nouvelle liste</button>`;
 document.getElementById('nom-liste').textContent=l.nom;
 document.getElementById('suppr').hidden=s.listes.length<2;
 document.querySelectorAll('[data-liste]').forEach(b=>b.onclick=()=>{s.cur=+b.dataset.liste;sauver()});
 document.getElementById('nouvelle').onclick=()=>{const n=prompt('Nom de la nouvelle liste (par ex. « Salle de bain », « Potager ») :','Liste '+(s.listes.length+1));if(n&&n.trim()){choisir(n.trim());sauver()}};
 if(!l.items.length){z.innerHTML='<p>Cette liste est vide. Ajoutez des articles depuis le <a href="catalogue.html">catalogue</a> ou un projet de <a href="faire-avec.html">Faire avec</a>.</p>';document.getElementById('envoi').hidden=true;return}
 document.getElementById('envoi').hidden=false;
 const tot=l.items.reduce((s,a)=>s+(a.p>0?a.p*a.q:0),0),sans=l.items.filter(a=>!(a.p>0)).length;
 z.innerHTML=l.items.map((a,i)=>`<div class="ligne"><img src="${esc(a.v)}" alt=""><div class="quoi"><a href="article/${esc(a.r)}.html">${esc(a.t)}</a><small>Réf. ${esc(a.r)} · ${esc(a.pt)}</small><small class="ou">Emplacement : ${a.o?esc(a.o):'à compléter'}</small></div>
  <div class="qte"><button data-moins="${i}" aria-label="Moins">−</button><span>${a.q}</span><button data-plus="${i}" aria-label="Plus"${a.s>0&&a.q>=a.s?' disabled':''}>+</button>${a.s>0&&a.q>=a.s?`<span class="max">tout le stock</span>`:''}</div>
  <div class="st">${a.p>0?eur(a.p*a.q):'au comptoir'}</div><button class="retirer" data-retirer="${i}" aria-label="Retirer">✕</button></div>`).join('')
  +`<p class="total">Total indicatif : <b>${eur(tot)}</b>${sans?` <small>(+ ${sans} article${sans>1?'s':''} à prix fixé au comptoir)</small>`:''}</p>`;
 z.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const a=l.items[b.dataset.plus];a.q=plafond(a,a.q+1);sauver()});
 z.querySelectorAll('[data-moins]').forEach(b=>b.onclick=()=>{const a=l.items[b.dataset.moins];a.q>1?a.q--:l.items.splice(b.dataset.moins,1);sauver()});
 z.querySelectorAll('[data-retirer]').forEach(b=>b.onclick=()=>{l.items.splice(b.dataset.retirer,1);sauver()});
}
function texte(f){const l=courante();return `Bonjour,\n\nJe souhaite réserver les articles de ma liste « ${l.nom} » :\n`+l.items.map(a=>`- ${a.q} × ${a.t} (réf. ${a.r}${a.o?', emplacement '+a.o:''}) – ${a.pt}`).join('\n')
 +`\n\nNom : ${f.nom.value}\nTéléphone : ${f.tel.value}\nPassage prévu : ${f.quand.value||'à convenir'}\n${f.msg.value?'\n'+f.msg.value+'\n':''}\nMerci de me confirmer la disponibilité.`}
document.addEventListener('DOMContentLoaded',()=>{compteur();selecteurs();const z=document.getElementById('panier');if(!z)return;afficher();
 const f=document.getElementById('envoi'),s=etat();
 f.onsubmit=e=>{e.preventDefault();location.href=`mailto:${MAIL}?subject=${encodeURIComponent('Réservation Comptoir – '+courante().nom+' – '+f.nom.value)}&body=${encodeURIComponent(texte(f))}`;document.getElementById('apres').hidden=false};
 document.getElementById('imprimer').onclick=()=>window.print();
 document.getElementById('partager').onclick=async()=>{const t=texte(f);if(navigator.share){try{await navigator.share({title:courante().nom+' – Comptoir des Matériaux',text:t})}catch(e){}}else{try{await navigator.clipboard.writeText(t);alert('Liste copiée')}catch(e){}}};
 document.getElementById('renommer').onclick=()=>{const n=prompt('Nouveau nom de la liste :',courante().nom);if(n&&n.trim()){courante().nom=n.trim();sauver()}};
 document.getElementById('suppr').onclick=()=>{if(confirm(`Supprimer la liste « ${courante().nom} » ?`)){s.listes.splice(s.cur,1);s.cur=0;sauver()}};
 document.getElementById('vider').onclick=()=>{if(confirm('Vider cette liste ?')){courante().items=[];sauver()}};
});
})();
