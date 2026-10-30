"use strict";
// Liaison caisse ↔ stock ↔ site, par le serveur du site comptoir-materiaux.be (api/index.php, PlanetHoster).
// Avant le 30/10/2026, elle passait par le dépôt GitHub (bac à sable) ; tout est désormais chez PlanetHoster.
// - stock.json : stock public lu par le site (quantités, statut, emplacement), sans aucun montant de vente (c_publier).
// - journaux/journal-<appareil>.json : ventes, mouvements et fiches de cet appareil, dans un dossier du serveur jamais
//   servi au public. Chaque appareil n'écrit que son journal (pas de conflit) et lit ceux des autres.
// La clé de la caisse reste dans ce navigateur : ni sur le site, ni dans les sauvegardes.
const SRV={journaux:"journaux",envois:"envois"};
const Sync={etat:"",quand:0,t:null,enCours:false,fusion:false,msg:""};
// Adresse de l'API : celle du réglage, sinon celle du site où la caisse est ouverte (…/caisse/ → …/api/index.php).
const apiSite=()=>(REG.siteApi||(/^https?:$/.test(location.protocol)&&!/github\.io$/.test(location.hostname)?new URL("../api/",location.href).href:"")).replace(/\/?(index\.php)?$/,"/index.php");
const syncPret=()=>!!(REG.siteCle&&apiSite());
const appareil=()=>REG.appareil||"PC comptoir";
const slug=s=>sans(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"appareil";
function b64(o){let s="";for(let i=0;i<o.length;i+=0x8000)s+=String.fromCharCode.apply(null,o.subarray(i,i+0x8000));return btoa(s)}
const deb64=t=>Uint8Array.from(atob(t.replace(/\s/g,"")),c=>c.charCodeAt(0));
const utf8=s=>new TextEncoder().encode(s);
async function empreinte(s){return b64(new Uint8Array(await crypto.subtle.digest("SHA-256",utf8(s))))}

// Fichiers partagés sur le serveur : liste d'un dossier, lecture, écriture (mêmes réponses que l'ancienne liaison GitHub).
async function fic(a,get,corps){const u=new URL(apiSite());u.searchParams.set("a",a);Object.entries(get).forEach(([k,v])=>u.searchParams.set(k,v));
 const r=await fetch(u,{method:"POST",cache:"no-store",headers:{"X-Cle-Caisse":REG.siteCle},body:corps??""});
 if(r.status===404&&a==="c_lire")return null;
 if(!r.ok){const e=new Error("Site "+r.status);e.status=r.status;throw e}return r}
const ficListe=async d=>(await fic("c_fichiers",{dossier:d})).json();
const ficLire=async c=>{const r=await fic("c_lire",{chemin:c});return r&&r.text()};
const ficEcrire=async(c,t)=>(await fic("c_ecrire",{chemin:c},t)).json();

async function cle(sel){const k=await crypto.subtle.importKey("raw",utf8(REG.ghPhrase),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:sel,iterations:200000,hash:"SHA-256"},k,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
// Sur le serveur, les journaux ne sont plus chiffrés ; les anciens fichiers (dépôt GitHub) le sont avec la phrase secrète.
async function dechiffrer(t){const o=JSON.parse(t);if(!o.d||!o.sel)return o;if(!REG.ghPhrase)throw new Error("phrase");
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
  const fichiers=(await ficListe(SRV.journaux)).filter(f=>/^journal-.+\.json$/.test(f.name));
  let recus=0,illisibles=0;
  Sync.fusion=true;
  // On relit aussi notre propre journal s'il a changé sans nous : un autre appareil porte le même nom,
  // ou ce navigateur a été vidé. On fusionne au lieu d'écraser.
  try{for(const f of fichiers.filter(f=>REG["sha:"+f.name]!==f.sha)){
   try{recus+=await fusionner(await dechiffrer(await ficLire(f.path)));await putSet("sha:"+f.name,f.sha)}catch(e){if(e.status)throw e;illisibles++}}}
  finally{Sync.fusion=false}
  if(recus){appliquerArticles();calcStock();
   const tape=document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&document.activeElement.id!=="scanIn";
   if(!tape)render();toast(recus+" changement"+(recus>1?"s":"")+" reçu"+(recus>1?"s":"")+" des autres appareils")}
  // Nouvelles fiches de l'app d'encodage : ajoutées au stock avant d'écrire le journal (les autres appareils les reçoivent ainsi).
  if(!illisibles){try{await integrerEnvois()}catch(e){if(e.status===403)throw e}}
  // Journal de cet appareil, seulement s'il a changé.
  const journal={appareil:appareil(),version:VERSION,ventes,sorties,mouvements:MVT,articles:Object.values(ARTS),inventaire:Object.values(INV)};
  const ej=await empreinte(JSON.stringify(journal));
  // Un journal illisible = un ancien journal chiffré sans la phrase ici : on n'écrase rien tant qu'il n'est pas lu.
  if(!illisibles&&ej!==REG.empreinteJournal){
   const r=await ficEcrire(`${SRV.journaux}/${moi}`,JSON.stringify({...journal,maj:new Date().toISOString()}));
   if(r&&r.content)await putSet("sha:"+moi,r.content.sha);await putSet("empreinteJournal",ej)}
  // Stock pour le site, seulement si on a pu lire tous les journaux (sinon on publierait un stock en retard).
  if(!illisibles)await publierStockSite(stockSite());
  Sync.quand=Date.now();await putSet("derniereSync",Sync.quand);
  majEtat(illisibles?"err":"ok",illisibles?`${illisibles} ancien journal chiffré illisible : entrez l'ancienne phrase secrète dans Réglages. Rien n'a été envoyé d'ici.`:"");
  if(illisibles)toast("Un ancien journal n'a pas pu être lu : entrez l'ancienne phrase secrète",true);else if(manuel)toast("Caisse, stock et site à jour");
  return true}
 catch(e){const m=e.status===403?"Clé de la caisse refusée : vérifiez-la (Réglages).":
  e.status?"Le site répond "+e.status+" ; nouvel essai plus tard.":navigator.onLine?"Erreur : "+e.message:"Hors ligne.";
  majEtat(navigator.onLine?"err":"hors",m);if(manuel)toast(m,true);planifierSync(5*60e3);return false}
 finally{Sync.enCours=false}}
// Après chaque vente ou mouvement : on attend un peu pour grouper les changements en un seul envoi.
function planifierSync(delai){if(!syncPret()||Sync.fusion)return;clearTimeout(Sync.t);Sync.t=setTimeout(()=>synchroniser(),delai||20e3)}
function demarrerSync(){majEtat(syncPret()?"hors":"non");if(REG.derniereSync)Sync.quand=REG.derniereSync;synchroniser();
 setInterval(()=>synchroniser(),5*60e3);addEventListener("online",()=>synchroniser())}

function carteSync(){return `<div class="carte"><h3>Liaison avec le site</h3>
 <p class="muted">Chaque vente, entrée ou correction est envoyée au serveur du site comptoir-materiaux.be : le stock du site se met à jour et les autres appareils reçoivent les changements. Les locations, les membres et les envois de l'app d'encodage passent par la même liaison. Sans réseau, la caisse continue et envoie plus tard.</p>
 <p><b>État :</b> <span id="syEtat">${esc({non:"pas relié",encours:"synchronisation…",ok:"relié, dernier envoi à "+new Date(Sync.quand||0).toTimeString().slice(0,5),hors:"hors ligne, envoi en attente",err:"en erreur"}[Sync.etat]||"pas relié")}</span>${Sync.msg?`<br><span class="muted">${esc(Sync.msg)}</span>`:""}</p>
 <label class="f">Nom de cet appareil<input class="champ" id="syApp" value="${esc(appareil())}" placeholder="PC comptoir"></label>
 <label class="f">Clé de la caisse<input class="champ" id="syCle" type="password" autocomplete="off" placeholder="${REG.siteCle?"enregistrée (laisser vide pour garder)":"donnée à l'installation du site"}"></label>
 <details class="muted" style="margin-top:8px" ${REG.siteApi||!apiSite()?"open":""}><summary>Adresse du site</summary>
  <label class="f">Adresse de l'API<input class="champ" id="syApi" value="${esc(REG.siteApi||"")}" placeholder="${esc(apiSite()||"https://www.comptoir-materiaux.be/api/")}"></label>
  <p>À laisser vide quand la caisse est ouverte depuis le site (www.comptoir-materiaux.be/caisse/).</p>
  ${REG.ghPhrase?"":`<label class="f">Ancienne phrase secrète (seulement pour relire les anciens journaux chiffrés)<input class="champ" id="syPhrase" type="password" autocomplete="off"></label>`}</details>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="syOk">Enregistrer et synchroniser</button>${syncPret()?'<button class="btn clair" id="syOff">Délier cet appareil</button>':""}</div><p class="muted" id="syRes"></p></div>`}
function brancherSync(){
 $("#syOk").onclick=async()=>{const c=$("#syCle").value.trim(),p=$("#syPhrase")&&$("#syPhrase").value;
  await putSet("appareil",$("#syApp").value.trim()||"PC comptoir");await putSet("siteApi",$("#syApi").value.trim());if(c)await putSet("siteCle",c);if(p)await putSet("ghPhrase",p);
  if(!syncPret()){toast("Il manque la clé de la caisse ou l'adresse du site",true);return}
  await putSet("empreinteJournal","");await putSet("empreinteStockSite","");Loc.d=null;await synchroniser(true);render()};
 const o=$("#syOff");if(o)o.onclick=async()=>{if(!confirm("Délier cet appareil ? Les ventes restent ici, mais ne sont plus envoyées."))return;
  await putSet("siteCle","");majEtat("non");render()}}
