// Panier « ma liste » : gardé dans le navigateur du visiteur, envoyé par mail à l'équipe pour réservation.
(function(){
const CLE='comptoir-panier',MAIL='info@la-pile.be';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const eur=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',').replace(',00','')+' €';
function lire(){try{return JSON.parse(localStorage.getItem(CLE))||[]}catch(e){return memo}}
let memo=[];
function ecrire(l){memo=l;try{localStorage.setItem(CLE,JSON.stringify(l))}catch(e){}compteur();if(document.getElementById('panier'))afficher()}
function compteur(){const n=lire().reduce((s,a)=>s+a.q,0);document.querySelectorAll('.nb-panier').forEach(e=>{e.textContent=n;e.hidden=!n})}
function ajouter(a){const l=lire(),x=l.find(y=>y.r===a.r);if(x)x.q++;else l.push({...a,q:1});ecrire(l)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ajout]');if(!b)return;e.preventDefault();
 ajouter(JSON.parse(b.dataset.ajout));const t=b.textContent;b.textContent='Ajouté à ma liste ✓';b.classList.add('ok');setTimeout(()=>{b.textContent=t;b.classList.remove('ok')},1600)});
function afficher(){
 const l=lire(),z=document.getElementById('panier');
 if(!l.length){z.innerHTML='<p>Votre liste est vide. Ajoutez des articles depuis le <a href="catalogue.html">catalogue</a>.</p>';document.getElementById('envoi').hidden=true;return}
 document.getElementById('envoi').hidden=false;
 const tot=l.reduce((s,a)=>s+(a.p>0?a.p*a.q:0),0),sans=l.filter(a=>!(a.p>0)).length;
 z.innerHTML=l.map((a,i)=>`<div class="ligne"><img src="${esc(a.v)}" alt=""><div class="quoi"><a href="article/${esc(a.r)}.html">${esc(a.t)}</a><small>Réf. ${esc(a.r)} · ${esc(a.pt)}</small></div>
  <div class="qte"><button data-moins="${i}" aria-label="Moins">−</button><span>${a.q}</span><button data-plus="${i}" aria-label="Plus">+</button></div>
  <div class="st">${a.p>0?eur(a.p*a.q):'au comptoir'}</div><button class="retirer" data-retirer="${i}" aria-label="Retirer">✕</button></div>`).join('')
  +`<p class="total">Total indicatif : <b>${eur(tot)}</b>${sans?` <small>(+ ${sans} article${sans>1?'s':''} à prix fixé au comptoir)</small>`:''}</p>`;
 z.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const l=lire();l[b.dataset.plus].q++;ecrire(l)});
 z.querySelectorAll('[data-moins]').forEach(b=>b.onclick=()=>{const l=lire(),a=l[b.dataset.moins];a.q>1?a.q--:l.splice(b.dataset.moins,1);ecrire(l)});
 z.querySelectorAll('[data-retirer]').forEach(b=>b.onclick=()=>{const l=lire();l.splice(b.dataset.retirer,1);ecrire(l)});
}
function texte(f){const l=lire();return 'Bonjour,\n\nJe souhaite réserver les articles suivants :\n'+l.map(a=>`- ${a.q} × ${a.t} (réf. ${a.r}) – ${a.pt}`).join('\n')
 +`\n\nNom : ${f.nom.value}\nTéléphone : ${f.tel.value}\nPassage prévu : ${f.quand.value||'à convenir'}\n${f.msg.value?'\n'+f.msg.value+'\n':''}\nMerci de me confirmer la disponibilité.`}
document.addEventListener('DOMContentLoaded',()=>{compteur();const z=document.getElementById('panier');if(!z)return;afficher();
 const f=document.getElementById('envoi');
 f.onsubmit=e=>{e.preventDefault();location.href=`mailto:${MAIL}?subject=${encodeURIComponent('Réservation Comptoir – '+f.nom.value)}&body=${encodeURIComponent(texte(f))}`;document.getElementById('apres').hidden=false};
 document.getElementById('imprimer').onclick=()=>window.print();
 document.getElementById('partager').onclick=async()=>{const t=texte(f);if(navigator.share){try{await navigator.share({title:'Ma liste du Comptoir',text:t})}catch(e){}}else{try{await navigator.clipboard.writeText(t);alert('Liste copiée')}catch(e){}}};
 document.getElementById('vider').onclick=()=>{if(confirm('Vider la liste ?'))ecrire([])};
});
})();
