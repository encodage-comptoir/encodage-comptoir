"use strict";
// Liaison caisse ↔ stock ↔ site par le dépôt GitHub du Comptoir (choix de Jérôme, 19/10/2026).
// - comptoir/stock.json : stock public lu par le site (quantités, statut, emplacement), sans aucun montant de vente.
// - donnees/journal-<appareil>.json : ventes, mouvements et fiches de cet appareil, chiffrés avec la phrase secrète
//   du Comptoir, parce que le dépôt est public. Chaque appareil n'écrit que son journal (pas de conflit) et lit ceux des autres.
// Le jeton et la phrase restent dans ce navigateur : ni dans le dépôt, ni dans les sauvegardes.
const GH={depot:"encodage-comptoir/encodage-comptoir",branche:"main",stock:"comptoir/stock.json",dossier:"donnees"};
const Sync={etat:"",quand:0,t:null,enCours:false,fusion:false,msg:""};
const syncPret=()=>!!(REG.ghJeton&&REG.ghPhrase);
const appareil=()=>REG.appareil||"PC comptoir";
const slug=s=>sans(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"appareil";
function b64(o){let s="";for(let i=0;i<o.length;i+=0x8000)s+=String.fromCharCode.apply(null,o.subarray(i,i+0x8000));return btoa(s)}
const deb64=t=>Uint8Array.from(atob(t.replace(/\s/g,"")),c=>c.charCodeAt(0));
const utf8=s=>new TextEncoder().encode(s);
async function empreinte(s){return b64(new Uint8Array(await crypto.subtle.digest("SHA-256",utf8(s))))}

async function gh(chemin,opt={},brut){
 const r=await fetch(`https://api.github.com/repos/${GH.depot}/contents/${chemin}`+(opt.method?"":`?ref=${GH.branche}`),{...opt,cache:"no-store",
  headers:{Authorization:"Bearer "+REG.ghJeton,Accept:brut?"application/vnd.github.raw+json":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}});
 if(r.status===404&&!opt.method)return null;
 if(!r.ok){const e=new Error("GitHub "+r.status);e.status=r.status;throw e}
 return brut?r.text():r.json()}
// Écrit un fichier ; si quelqu'un l'a changé entre-temps (sha périmé), on relit le sha et on réessaie une fois.
async function ghEcrire(chemin,texte,sha,message){
 const envoi=s=>gh(chemin,{method:"PUT",body:JSON.stringify({message,content:b64(utf8(texte)),branch:GH.branche,...(s?{sha:s}:{})})});
 try{return await envoi(sha)}catch(e){if(e.status!==409&&e.status!==422)throw e;const f=await gh(chemin);return envoi(f&&f.sha)}}

async function cle(sel){const k=await crypto.subtle.importKey("raw",utf8(REG.ghPhrase),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:sel,iterations:200000,hash:"SHA-256"},k,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function chiffrer(obj){const sel=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const d=await crypto.subtle.encrypt({name:"AES-GCM",iv},await cle(sel),utf8(JSON.stringify(obj)));
 return JSON.stringify({v:1,appareil:appareil(),sel:b64(sel),iv:b64(iv),d:b64(new Uint8Array(d))})}
async function dechiffrer(t){const o=JSON.parse(t);
 const d=await crypto.subtle.decrypt({name:"AES-GCM",iv:deb64(o.iv)},await cle(deb64(o.sel)),deb64(o.d));return JSON.parse(new TextDecoder().decode(d))}

// Ajoute ici ce que les autres appareils ont noté. Rien n'est effacé ; une annulation faite ailleurs est reprise.
async function fusionner(j){let n=0;const suffixe="-"+slug(j.appareil||"autre");
 const liste=async(arr,store,src,annul)=>{for(let x of src||[]){let l=arr.find(y=>y.id===x.id);
  // Même numéro de ticket du même jour sur deux appareils : on garde les deux.
  if(l&&l.ts!==x.ts){x={...x,id:x.id+suffixe};l=arr.find(y=>y.id===x.id)}
  if(!l){arr.push(x);await put(store,x);n++}else if(x[annul]&&!l[annul]){Object.assign(l,x);await put(store,l);n++}}};
 await liste(ventes,"ventes",j.ventes,"annulee");await liste(sorties,"sorties",j.sorties,"annulee");await liste(MVT,"mouvements",j.mouvements,"annule");
 for(const a of j.articles||[]){const l=ARTS[a.r];if(!l||(a.modifie||0)>(l.modifie||0)){ARTS[a.r]=a;await put("articles",a);n++}}
 for(const i of j.inventaire||[]){const l=INV[i.k];if(!l||(i.ts||0)>(l.ts||0)){INV[i.k]=i;await put("inventaire",i);n++}}
 return n}

function majEtat(etat,msg){Sync.etat=etat;Sync.msg=msg||"";const el=$("#etat");if(!el)return;
 const t={non:["Pas relié au site","gris"],encours:["Synchronisation…","jaune"],ok:["Relié au site · "+new Date(Sync.quand||Date.now()).toTimeString().slice(0,5),"vert"],
  hors:["Hors ligne : envoi en attente","jaune"],err:["Liaison en erreur","rouge"]}[etat];
 el.innerHTML=`<span class="pt ${t[1]}"></span><span>${esc(t[0])}</span>`;if(typeof bandeau==="function")bandeau();el.title=Sync.msg||"La douchette est active sur tous les écrans."}

async function synchroniser(manuel){
 if(!syncPret()){majEtat("non");return false}
 if(Sync.enCours)return false;
 if(!navigator.onLine){majEtat("hors");return false}
 Sync.enCours=true;clearTimeout(Sync.t);majEtat("encours");
 try{
  const moi=`journal-${slug(appareil())}.json`;
  const fichiers=((await gh(GH.dossier))||[]).filter(f=>f.type==="file"&&/^journal-.+\.json$/.test(f.name));
  let recus=0,illisibles=0;
  Sync.fusion=true;
  // On relit aussi notre propre journal s'il a changé sans nous : un autre appareil porte le même nom,
  // ou ce navigateur a été vidé. On fusionne au lieu d'écraser.
  try{for(const f of fichiers.filter(f=>REG["sha:"+f.name]!==f.sha)){
   try{recus+=await fusionner(await dechiffrer(await gh(f.path,{},true)));await putSet("sha:"+f.name,f.sha)}catch(e){if(e.status)throw e;illisibles++}}}
  finally{Sync.fusion=false}
  if(recus){appliquerArticles();calcStock();
   const tape=document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&document.activeElement.id!=="scanIn";
   if(!tape)render();toast(recus+" changement"+(recus>1?"s":"")+" reçu"+(recus>1?"s":"")+" des autres appareils")}
  // Journal de cet appareil, seulement s'il a changé.
  const journal={appareil:appareil(),version:VERSION,ventes,sorties,mouvements:MVT,articles:Object.values(ARTS),inventaire:Object.values(INV)};
  const ej=await empreinte(JSON.stringify(journal));
  // Journal illisible ailleurs = phrase sans doute mal tapée ici : on n'envoie rien qui serait illisible pour les autres.
  if(!illisibles&&ej!==REG.empreinteJournal){const f=fichiers.find(x=>x.name===moi);
   const r=await ghEcrire(`${GH.dossier}/${moi}`,await chiffrer({...journal,maj:new Date().toISOString()}),f&&f.sha,`Caisse : journal de ${appareil()}`);
   if(r&&r.content)await putSet("sha:"+moi,r.content.sha);await putSet("empreinteJournal",ej)}
  // Stock pour le site, seulement si on a pu lire tous les journaux (sinon on publierait un stock en retard).
  const S=stockSite(),es=await empreinte(JSON.stringify(S.articles));
  if(!illisibles&&es!==REG.empreinteStock){const f=await gh(GH.stock);
   await ghEcrire(GH.stock,JSON.stringify(S),f&&f.sha,`Stock du site mis à jour par la caisse (${appareil()})`);await putSet("empreinteStock",es)}
  if(!illisibles)await publierStockSite(S).catch(()=>{});
  Sync.quand=Date.now();await putSet("derniereSync",Sync.quand);
  majEtat(illisibles?"err":"ok",illisibles?`${illisibles} journal illisible : la phrase secrète n'est pas la même sur tous les appareils. Rien n'a été envoyé d'ici.`:"");
  if(illisibles)toast("Un journal n'a pas pu être lu : vérifiez la phrase secrète",true);else if(manuel)toast("Caisse, stock et site à jour");
  return true}
 catch(e){const m=e.status===401?"Jeton refusé ou expiré : recréez-le (Réglages).":e.status===403||e.status===404?"Le jeton n'a pas le droit d'écrire dans le dépôt (Contents : lecture et écriture).":
  e.status?"GitHub répond "+e.status+" ; nouvel essai plus tard.":navigator.onLine?"Erreur : "+e.message:"Hors ligne.";
  majEtat(navigator.onLine?"err":"hors",m);if(manuel)toast(m,true);planifierSync(5*60e3);return false}
 finally{Sync.enCours=false}}
// Après chaque vente ou mouvement : on attend un peu pour grouper les changements en un seul envoi.
function planifierSync(delai){if(!syncPret()||Sync.fusion)return;clearTimeout(Sync.t);Sync.t=setTimeout(()=>synchroniser(),delai||20e3)}
function demarrerSync(){majEtat(syncPret()?"hors":"non");if(REG.derniereSync)Sync.quand=REG.derniereSync;synchroniser();
 setInterval(()=>synchroniser(),5*60e3);addEventListener("online",()=>synchroniser())}

function carteSync(){return `<div class="carte"><h3>Liaison caisse, stock et site</h3>
 <p class="muted">Chaque vente, entrée ou correction est envoyée au dépôt GitHub du Comptoir : le site se met à jour en 1 à 2 minutes et les autres appareils reçoivent les changements. Sans réseau, la caisse continue et envoie plus tard.</p>
 <p><b>État :</b> <span id="syEtat">${esc({non:"pas relié",encours:"synchronisation…",ok:"relié, dernier envoi à "+new Date(Sync.quand||0).toTimeString().slice(0,5),hors:"hors ligne, envoi en attente",err:"en erreur"}[Sync.etat]||"pas relié")}</span>${Sync.msg?`<br><span class="muted">${esc(Sync.msg)}</span>`:""}</p>
 <label class="f">Nom de cet appareil<input class="champ" id="syApp" value="${esc(appareil())}" placeholder="PC comptoir"></label>
 <label class="f">Jeton GitHub<input class="champ" id="syJeton" type="password" autocomplete="off" placeholder="${REG.ghJeton?"enregistré (laisser vide pour garder)":"github_pat_…"}"></label>
 <label class="f">Phrase secrète du Comptoir<input class="champ" id="syPhrase" type="password" autocomplete="off" placeholder="${REG.ghPhrase?"enregistrée (laisser vide pour garder)":"la même sur tous les appareils"}"></label>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="syOk">Enregistrer et synchroniser</button>${syncPret()?'<button class="btn clair" id="syOff">Délier cet appareil</button>':""}</div>
 <details class="muted" style="margin-top:10px"><summary>Créer le jeton (une fois par appareil)</summary>
  <ol><li>Sur github.com, compte membre de l'organisation encodage-comptoir : Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token.</li>
  <li>Resource owner : <b>encodage-comptoir</b> ; Repository access : <b>Only select repositories</b> › encodage-comptoir ; Expiration : 1 an.</li>
  <li>Permissions › Repository permissions › <b>Contents : Read and write</b>. Rien d'autre.</li>
  <li>Copiez le jeton ici. La phrase secrète chiffre les ventes dans le dépôt public : choisissez-la une fois et mettez la même partout (notez-la dans le classeur du Comptoir).</li></ol></details></div>`}
function brancherSync(){
 $("#syOk").onclick=async()=>{const j=$("#syJeton").value.trim(),p=$("#syPhrase").value;
  await putSet("appareil",$("#syApp").value.trim()||"PC comptoir");if(j)await putSet("ghJeton",j);if(p)await putSet("ghPhrase",p);
  if(!syncPret()){toast("Il manque le jeton ou la phrase secrète",true);return}
  await putSet("empreinteJournal","");await putSet("empreinteStock","");await synchroniser(true);render()};
 const o=$("#syOff");if(o)o.onclick=async()=>{if(!confirm("Délier cet appareil ? Les ventes restent ici, mais ne sont plus envoyées."))return;
  await putSet("ghJeton","");await putSet("ghPhrase","");majEtat("non");render()}}
