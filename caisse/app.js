"use strict";
// Caisse & stock du Comptoir des Matériaux. Tout est gardé sur l'appareil (IndexedDB) ; rien n'est écrit dans Impulsion.
const VERSION="2.5 (essai)";
const CATS=[["SA","Sanitaire"],["PA","Parois de douche"],["CH","Châssis"],["PO","Portes"],["CAR","Carrelage"],["GRO","Gros œuvre"],["RA","Chauffage"],
 ["ELEC","Électricité"],["LUM","Luminaires"],["BOI","Bois"],["PAR","Parquet & bardage"],["LAM","Lambris"],["TOI","Toiture"],["ISO","Isolant"],
 ["Q","Quincaillerie"],["OUT","Outillage"],["ELECTRO","Électroménager"],["DIV","Divers"]];
const catLabel=c=>(CATS.find(x=>x[0]===c)||[,""])[1];
const UNITES=["pièce","m²","m","lot","kg"];
const TVA=0.21;      // tous les articles sont à 21 % TVA comprise
const PRIX_KM=0.5;   // livraison : 0,50 € / km (procédure, point 10)
const MATIERES=Poids.MATIERES;
// « carte » = QR code (clé gardée pour les ventes déjà enregistrées).
const MODES={especes:"Espèces",carte:"QR code",virement:"Virement",facture:"Facture",bon:"Bon d'achat"};
const MODES_BTN=["especes","carte","virement","facture"];
// Sorties de stock hors vente. « dechet » compte pour Intradel comme déchet, pas comme réemploi.
const MOTIFS={dechet:"Casse / déchet",don:"Don",interne:"Usage interne / atelier",retour:"Rendu au donateur",autre:"Autre"};
const IC={
 caisse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3zM7 7V4h10v3M7 12h4M7 16h10"/></svg>',
 stock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l9-5 9 5v12H3zM3 8h18M8 20v-7h8v7"/></svg>',
 mouv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
 carnet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h12l2 2v16H5zM9 8h7M9 12h7M9 16h4"/></svg>',
 rapports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 reglages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>',
 scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
 especes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
 carte:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
 virement:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
 facture:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l4 4v16H6z"/><path d="M9 11h7M9 15h7M9 7h3"/></svg>'};

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r2=n=>Math.round(n*100)/100;
const eur=n=>r2(n||0).toLocaleString("fr-BE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const eur0=n=>Math.round(n||0).toLocaleString("fr-BE")+" €";
const nb=n=>n==null?"":r2(n).toLocaleString("fr-BE",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=s=>{const v=parseFloat(String(s??"").replace(/\s/g,"").replace(",","."));return isFinite(v)?r2(v):null};
const virg=n=>n==null?"":String(n).replace(".",",");
const sans=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const jour=d=>{d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const moisDe=j=>j.slice(0,7);
const moisTxt=m=>new Date(m+"-15T12:00").toLocaleDateString("fr-BE",{month:"long",year:"numeric"});
const dateBe=j=>j.split("-").reverse().join("/");
const htva=t=>r2(t/(1+TVA));
const dontTva=t=>r2(t-t/(1+TVA));
const kgTxt=k=>k>=1000?(k/1000).toLocaleString("fr-BE",{maximumFractionDigits:2})+" t":(k<10?r2(k):Math.round(k)).toLocaleString("fr-BE")+" kg";
function moisAvant(m){let[y,mo]=m.split("-").map(Number);mo--;if(!mo){mo=12;y--}return y+"-"+String(mo).padStart(2,"0")}
function toast(t,bad){const el=$("#toast");el.textContent=t;el.className="toast"+(bad?" bad":"");el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}

// ---------- Stockage sur l'appareil ----------
let idb;
function openDb(){return new Promise((ok,ko)=>{const r=indexedDB.open("caisse-comptoir",3);
 r.onupgradeneeded=()=>{const d=r.result,n=d.objectStoreNames;
  if(!n.contains("ventes"))d.createObjectStore("ventes",{keyPath:"id"});if(!n.contains("sorties"))d.createObjectStore("sorties",{keyPath:"id"});
  if(!n.contains("reglages"))d.createObjectStore("reglages");if(!n.contains("inventaire"))d.createObjectStore("inventaire",{keyPath:"k"});
  if(!n.contains("articles"))d.createObjectStore("articles",{keyPath:"r"});if(!n.contains("mouvements"))d.createObjectStore("mouvements",{keyPath:"id"})};
 r.onsuccess=()=>{idb=r.result;ok()};r.onerror=()=>ko(r.error)})}
function tx(store,mode,fn){return new Promise((ok,ko)=>{const t=idb.transaction(store,mode),s=t.objectStore(store);const res=fn(s);
 t.oncomplete=()=>ok(res&&res.result);t.onerror=e=>ko(e.target.error||t.error);t.onabort=()=>ko(t.error||new Error("transaction annulée"))})}
const all=st=>tx(st,"readonly",s=>s.getAll());
// Chaque changement de ventes ou de stock part ensuite vers le dépôt commun (sync.js).
const put=(st,v)=>tx(st,"readwrite",s=>s.put(v)).then(r=>{planifierSync();planifierSauv();return r});
const putSet=(k,v)=>{REG[k]=v;return tx("reglages","readwrite",s=>s.put(v,k))};
async function allSet(){const o={};await new Promise((ok,ko)=>{const t=idb.transaction("reglages"),s=t.objectStore("reglages"),c=s.openCursor();
 c.onsuccess=()=>{const x=c.result;if(x){o[x.key]=x.value;x.continue()}else ok()};c.onerror=()=>ko(c.error)});return o}

// Fiches de l'app d'encodage sur le même appareil (lecture seule ; on ne crée pas la base si elle n'existe pas).
function lireFiches(nom){return new Promise(ok=>{let r;try{r=indexedDB.open(nom)}catch(e){return ok([])}
 r.onupgradeneeded=()=>r.transaction.abort();r.onerror=()=>ok([]);r.onblocked=()=>ok([]);
 r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains("fiches")){d.close();return ok([])}
  const g=d.transaction("fiches").objectStore("fiches").getAll();g.onsuccess=()=>{d.close();ok(g.result||[])};g.onerror=()=>{d.close();ok([])}}})}
const norm=s=>String(s||"").replace(/\s+/g,"").toUpperCase();
const photo1=f=>{const p=(f.photos||[]).find(Boolean);return typeof p==="string"?p:p&&(p.src||p.data)||""};
function ajouterFiches(fiches,source){let n=0;
 fiches.forEach(f=>{const prix=num(f.prix),empl=f.empl&&f.empl!=="R"?f.empl:"";
  if(f.type==="maj"){const a=parRef(norm(f.annonce));if(a){if(empl)a.e=empl;if(prix)a.p=prix}return}
  const r=norm(f.code);if(!r||!(f.nom||f.titre))return;
  const a=parRef(r);if(a){if(empl&&!a.e)a.e=empl;if(prix&&!a.p)a.p=prix;return}
  ajouterArticle({r,n:f.titre||f.nom,t:f.nom,p:prix||0,s:num(f.qte)??1,u:f.unite||"pièce",c:f.cat,e:empl,f:photo1(f),src:source,cree:f.cree,m:f.matiere||"",
   kg:num(f.poids),kgEst:!!f.poidsEst,L:f.L,l:f.l,h:f.h});n++});
 return n}

// ---------- Données ----------
let CAT=[], IDX={}, HIST=[], ventes=[], sorties=[], MVT=[], ARTS={}, REG={}, INV={}, nbFiches=0, STK={};
const parRef=r=>IDX[r];
function ajouterArticle(a){CAT.push(a);IDX[a.r]=a;a.k=sans([a.n,a.t,a.r,a.e,catLabel(a.c)].join(" "))}
function indexer(a){a.k=sans([a.n,a.t,a.r,a.e,catLabel(a.c)].join(" "))}
const refAff=a=>a.x?"":a.r;
// Modifications faites dans le module stock : elles passent par-dessus le catalogue.
function appliquerArticles(){Object.values(ARTS).forEach(o=>{const a=parRef(o.r);if(a){Object.assign(a,o);indexer(a)}else ajouterArticle({...o})})}

// Stock = stock de départ, puis chaque mouvement dans l'ordre : entrée +, vente −, sortie −, comptage = remise à la valeur comptée.
function calcStock(){STK={};const ev={};
 const add=(r,e)=>(ev[r]=ev[r]||[]).push(e);
 Object.values(INV).forEach(i=>add(i.k,{ts:i.ts,type:"correction",q:i.compte}));
 MVT.forEach(m=>{if(!m.annule)add(m.r,m)});
 ventes.forEach(v=>{if(!v.annulee)v.lignes.forEach(l=>{if(l.id)add(l.id,{ts:v.ts,type:"vente",q:l.q,vid:v.id})})});
 CAT.forEach(a=>{const L=(ev[a.r]||[]).sort((x,y)=>x.ts-y.ts);let s=a.s==null?null:+a.s,vendu=0,compte=null;
  L.forEach(e=>{if(e.type==="correction"){s=e.q;compte=e.ts}else if(e.type==="entree")s=(s||0)+e.q;else{s=(s||0)-e.q;if(e.type==="vente")vendu+=e.q}});
  STK[a.r]={reste:s==null?null:r2(s),vendu:r2(vendu),compte,ev:L}})}
const reste=a=>(STK[a.r]||{}).reste??(a.s==null?null:a.s);
const statut=a=>{const r=reste(a);if(a.horsLigne)return "hors";if(r!=null&&r<=0)return (STK[a.r]||{}).vendu?"vendu":"rupture";return "ok"};
const STATUTS={ok:["En stock","ok"],vendu:["Vendu","violet"],rupture:["Plus en stock","bad"],hors:["Hors ligne","jaune"]};

// Carrelage : vendu à la pièce, avec les m² que ça couvre (comme briques et pavés sur le site).
// Impulsion le note au m² mais compte le stock en carreaux : prix ramené au carreau (m² = surface d'un carreau L1 × L2).
function aLaPiece(a){if(a.c!=="CAR"||a.u!=="m²")return;const L=num(a.L),l=num(a.l);if(!(L>0&&l>0))return;
 a.pm=1e4/(L*l);if(a.p)a.p=r2(a.p/a.pm);a.u="pièce"}
const m2Txt=(a,n)=>a.pm&&n>0?` (≈ ${nb(n/a.pm).replace(/,00$/,"")} m²)`:"";

// ---------- Navigation ----------
const ONGLETS={caisse:"Caisse",carnet:"Carnet de caisse",mouv:"Mouvements",stock:"Stock",rapports:"Rapports",reglages:"Réglages"};
let screen="caisse";
function render(){
 $("#nav").innerHTML=Object.entries(ONGLETS).map(([k,t])=>`<button data-go="${k}" class="${screen===k?"sel":""}">${IC[k]}${t}</button>`).join("");
 const P={caisse:ecranCaisse,stock:ecranStock,mouv:ecranMouv,carnet:ecranCarnet,rapports:ecranRapports,reglages:ecranReglages};
 $("#page").innerHTML=P[screen]();
 ({caisse:brancherCaisse,stock:brancherStock,mouv:brancherMouv,carnet:brancherCarnet,rapports:brancherRapports,reglages:brancherReglages}[screen])();
 if(panneauRef)ouvrirPanneau(panneauRef,true);
 if(screen==="caisse")garderTicket();bandeau();
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){screen=b.dataset.go;fermerPanneau();render();scrollTo(0,0)}});

// ---------- Douchette QR / code-barres ----------
// La douchette tape comme un clavier, très vite, puis Entrée. On reconnaît ces rafales partout dans l'app.
// Le QR contient un lien (…/a/SA139) ou la référence seule. Si la douchette est réglée en QWERTY sur un PC AZERTY
// (ou l'inverse), les caractères arrivent déformés : on essaie aussi la version corrigée.
const AZ_QW={a:"q",q:"a",z:"w",w:"z",m:";",";":"m",A:"Q",Q:"A",Z:"W",W:"Z",M:":",":":"M","&":"1","é":"2",'"':"3","'":"4","(":"5","-":"6","è":"7","_":"8","ç":"9","à":"0","!":"/","§":"!",",":"m",")":"-"};
const QW_AZ={q:"a",a:"q",w:"z",z:"w",";":"m",m:",",Q:"A",A:"Q",W:"Z",Z:"W","1":"&","2":"é","3":'"',"4":"'","5":"(","6":"-","7":"è","8":"_","9":"ç","0":"à"};
const tr=(s,map)=>[...s].map(c=>map[c]??c).join("");
function lireCode(brut){const essais=[brut,tr(brut,AZ_QW),tr(brut,QW_AZ)];
 for(const s of essais){
  // Lien : la référence est le dernier morceau du chemin, ou le paramètre r= / ref=.
  let m=s.match(/[?&](?:r|ref)=([A-Za-z]+[\s-]?\d+)/)||s.match(/\/(?:a|article)\/([A-Za-z]+[\s-]?\d+)(?:\.html?)?\/?$/i)||s.match(/^\s*([A-Za-z]{1,8})[\s-]?(\d{1,5})\s*$/);
  if(m){const r=norm(m[2]?m[1]+m[2]:m[1]).replace("-","");if(parRef(r))return r}
  const r=norm(s);if(parRef(r))return r}
 return null}
let rafale="",rafaleT=0,rafaleDebut=0;
document.addEventListener("keydown",e=>{
 const cible=e.target,champ=cible&&(cible.tagName==="INPUT"||cible.tagName==="TEXTAREA"||cible.tagName==="SELECT");
 const now=performance.now();
 if(e.key==="Enter"){
  const code=rafale;rafale="";
  // Dans la recherche de la caisse, c'est son propre Entrée qui ajoute l'article.
  if(code.length<3||now-rafaleDebut>=code.length*45+120||cible.id==="scanIn")return;
  if(champ){
   // Le curseur était dans un autre champ : on retire ce que la douchette y a tapé, seulement si c'est bien un code connu.
   if(!lireCode(code))return;const v=cible.value||"";let fin=null;try{fin=cible.selectionStart}catch(x){}
   const nv=fin!=null&&v.slice(fin-code.length,fin)===code?v.slice(0,fin-code.length)+v.slice(fin):v.replace(code,"");
   if(nv!==v){cible.value=nv;cible.dispatchEvent(new Event("input",{bubbles:true}))}}
  e.preventDefault();scanne(code);return}
 if(e.key.length!==1){return}
 if(now-rafaleT>60){rafale="";rafaleDebut=now}
 rafale+=e.key;rafaleT=now});
function scanne(code){const r=lireCode(code);
 if(!r){toast("Code non reconnu : « "+code.slice(0,40)+" »",true);return}
 const a=parRef(r);
 if(screen==="caisse"){ajouterAuPanier(a);const s=$(".scan");if(s){s.classList.remove("flash");void s.offsetWidth;s.classList.add("flash")}}
 else ouvrirPanneau(r)}

// ---------- Caisse ----------
let q="",cat="",panier=[],pay,remise,derniere=null;
const CLI=[["nom","Nom ou société *"],["adr","Rue et n°"],["loc","Code postal et localité"],["tva","N° TVA / entreprise"],["mail","E-mail"],["tel","Téléphone"]];
function payNeuf(){pay={mode:"",recu:"",fnum:"",fpaye:"",cli:{},bonOn:false,bonNum:"",bonMt:""};remise={type:"",val:""}}
payNeuf();
function resultats(){const mots=sans(q).split(/\s+/).filter(Boolean);
 return CAT.filter(a=>(!cat||a.c===cat)&&(!mots.length||mots.every(m=>a.k.includes(m))))
  .sort((a,b)=>((reste(a)??1)>0?0:1)-((reste(b)??1)>0?0:1))}
const totalPanier=()=>r2(panier.reduce((t,l)=>t+(l.p||0)*(l.q||0),0));
// Réduction en % (sur les articles, pas sur les bons d'achat vendus) ou arrondi : on tape le total voulu.
const baseRemise=()=>r2(panier.filter(l=>!l.bon).reduce((t,l)=>t+(l.p||0)*(l.q||0),0));
function remiseMt(){const st=totalPanier(),v=num(remise.val);if(v==null||v<0)return 0;
 if(remise.type==="pct")return v>0&&v<=100?r2(baseRemise()*v/100):0;
 if(remise.type==="arrondi")return v<st&&st-v<=baseRemise()?r2(st-v):0;return 0}
const remiseNom=()=>remise.type==="pct"?`Réduction ${virg(num(remise.val))} %`:"Arrondi";
const totalFinal=()=>r2(totalPanier()-remiseMt());
// Bons d'achat : vendus comme une ligne du ticket (sans TVA, la TVA est due quand le bon sert), utilisés comme paiement.
function bonsTous(){const B={};ventes.filter(v=>!v.annulee).sort((a,b)=>a.ts-b.ts).forEach(v=>{
  v.lignes.forEach(l=>{if(l.bon&&l.bonNum){const b=B[l.bonNum]=B[l.bonNum]||{num:l.bonNum,montant:0,utilise:0,emis:v.date,usages:[]};b.montant=r2(b.montant+l.p*l.q);b.emis=v.date}});
  if(v.bon){const b=B[v.bon.num]=B[v.bon.num]||{num:v.bon.num,montant:null,utilise:0,emis:null,usages:[]};b.utilise=r2(b.utilise+v.bon.mt);b.usages.push(v.date)}});
 return B}
const soldeBon=n=>{const b=bonsTous()[normBon(n)];return b&&b.montant!=null?r2(b.montant-b.utilise):null};
const normBon=n=>String(n||"").trim().toUpperCase().replace(/\s+/g,"");
function prochainBon(){const a=String(new Date().getFullYear()).slice(2),re=new RegExp("^B"+a+"-(\\d+)$");let mx=0;
 Object.keys(bonsTous()).concat(panier.filter(l=>l.bon).map(l=>l.bonNum)).forEach(k=>{const m=k.match(re);if(m)mx=Math.max(mx,+m[1])});return "B"+a+"-"+String(mx+1).padStart(3,"0")}
const bonPaye=()=>{const m=num(pay.bonMt);return pay.bonOn&&normBon(pay.bonNum)&&m>0?Math.min(m,totalFinal()):0};
const aPayer=()=>r2(totalFinal()-bonPaye());
const toutParBon=()=>bonPaye()>0&&aPayer()===0;
const qSaisie=l=>l.u&&l.u!=="pièce";
function ajouterAuPanier(a){const l=panier.find(x=>x.id===a.r);
 if(l){if(!qSaisie(l))l.q++}else panier.push({id:a.r,r:refAff(a),n:a.n,t:a.t,p:a.p||null,q:qSaisie(a)?null:1,u:a.u,c:a.c,m:a.m,kg:a.kg,kgEst:a.kgEst,L:a.L,l:a.l,h:a.h,pm:a.pm});
 const r=reste(a);toast(a.n+" ajouté"+(r!=null&&r<=0?" (stock à 0 : à vérifier)":""),r!=null&&r<=0);render()}
const vignette=a=>a.f?`<img src="${esc(a.f)}" alt="" loading="lazy" onerror="this.remove()">`:"";
function ecranCaisse(){const res=resultats(),t=totalPanier();
 const cats=CATS.filter(c=>CAT.some(a=>a.c===c[0]));
 const cartes=res.slice(0,48).map(a=>{const r=reste(a),st=statut(a);
  return `<button class="art" data-add="${esc(a.r)}"><span class="ph">${esc(a.c||"")}${vignette(a)}${st!=="ok"?`<span class="st pill ${STATUTS[st][1]}">${STATUTS[st][0]}</span>`:""}</span>
   <span class="tx"><span class="nm">${esc(a.n)}</span><span class="rf">${esc(refAff(a))||"sans réf."}${a.e?" · "+esc(a.e):""}${r!=null&&r>0?" · stock "+virg(r)+m2Txt(a,r):""}</span>
   <span class="px">${a.p?eur(a.p):'<span class="pill jaune">prix ?</span>'}${a.u&&a.u!=="pièce"?` <small class="muted">/ ${esc(a.u)}</small>`:""}</span></span></button>`}).join("");
 const lignes=panier.map((l,i)=>`<div class="tl">
  <div class="n">${l.id||l.liv||l.bon?esc(l.n)+` <small>${esc(l.r)}</small>`+(l.pm?` <small class="muted m2">${m2Txt(l,l.q)}</small>`:""):`<input class="champ" data-nom="${i}" placeholder="Ce qui est vendu (ex. lot de planches)" value="${esc(l.n)}">`}</div>
  <div class="tot">${l.p==null||!l.q?"":eur(l.p*l.q)}</div>
  <div class="ctl">${l.bon?'<span class="muted">montant du bon</span>':qSaisie(l)
   ?`<span class="qte"><input data-q="${i}" inputmode="decimal" value="${virg(l.q)}" aria-label="Quantité" class="${l.q>0?"":"need"}"></span><span class="muted">${esc(l.u)}</span>`
   :`<span class="qte"><button data-moins="${i}" aria-label="Un de moins">−</button><input data-q="${i}" inputmode="numeric" value="${l.q}" aria-label="Quantité"><button data-plus="${i}" aria-label="Un de plus">+</button></span>`}
   <span class="muted">×</span><input class="prix-in ${l.p==null?"need":""}" data-prix="${i}" inputmode="decimal" placeholder="Prix" value="${virg(l.p)}" aria-label="Prix à l'unité" ${l.liv?"readonly":""}><span class="muted">€</span>
   <button class="x" data-suppr="${i}" aria-label="Retirer" title="Retirer">×</button></div>
  ${/* poids et matière : plus demandés à la vente (Jérôme, 23/10) ; estimés en arrière-plan pour les stats */""}
 </div>`).join("");
 return `<div class="caisse">
 <section>
  <label class="scan">${IC.scan}<input id="scanIn" type="search" placeholder="Scanner un article, ou chercher par nom, référence, emplacement" value="${esc(q)}" autocomplete="off" autofocus></label>
  <p class="aide-scan">La douchette ajoute l'article directement au ticket, où que soit le curseur. Entrée sur une référence exacte l'ajoute aussi.</p>
  <div class="chips"><button class="chip ${cat?"":"sel"}" data-cat="">Tout</button>${cats.map(c=>`<button class="chip ${cat===c[0]?"sel":""}" data-cat="${c[0]}">${c[1]}</button>`).join("")}</div>
  <div class="res">${cartes||'<div class="vide">Rien trouvé. Essayez un autre mot, ou « Article sans fiche ».</div>'}</div>
  ${res.length>48?`<p class="muted">Encore ${res.length-48} articles : précisez la recherche.</p>`:""}
 </section>
 <aside class="carte ticket">
  <div class="titre" style="margin-bottom:4px"><h2>Ticket en cours</h2>${panier.length?'<button class="lien rouge" id="vider">Vider</button>':""}</div>
  <div class="lignes">${lignes||'<div class="vide">Scannez ou touchez un article pour commencer.</div>'}</div>
  <div class="chips" style="margin-top:10px"><button class="chip" id="libre">+ Article sans fiche</button>${panier.some(l=>l.liv)?"":`<button class="chip" id="livraison">+ Livraison (${nb(PRIX_KM)} €/km)</button>`}<button class="chip" id="bonVente">+ Vendre un bon d'achat</button></div>
  ${panier.length?`<div class="remise"><span class="muted">Réduction</span><button class="chip ${remise.type==="pct"?"sel":""}" data-rem="pct">%</button><button class="chip ${remise.type==="arrondi"?"sel":""}" data-rem="arrondi">Arrondi</button>
   ${remise.type?`<input class="champ" id="remVal" inputmode="decimal" value="${esc(remise.val)}" placeholder="${remise.type==="pct"?"ex. 10":"total voulu, ex. "+Math.floor(t/5)*5}"><span class="muted">${remise.type==="pct"?"%":"€"}</span><button class="x" id="remX" aria-label="Retirer la réduction" title="Retirer la réduction">×</button>`:""}</div>`:""}
  <div id="totaux">${totauxHtml()}</div>
  <div class="muted">pas de crédit : un article non payé va en zone « arrivages et commandes »</div>
  <div class="bonpay">${pay.bonOn?`<div class="grille-f" style="margin-top:10px"><label class="f">N° du bon d'achat<input class="champ" id="bonNum" value="${esc(pay.bonNum)}" placeholder="ex. B26-001" autocomplete="off"></label>
   <label class="f">Montant utilisé (€)<input class="champ" id="bonMt" inputmode="decimal" value="${esc(pay.bonMt)}"></label></div><div id="bonInfo" class="muted">${bonInfo()}</div>
   <button class="lien" id="bonOff">Ne pas utiliser de bon</button>`:`<button class="chip" id="bonOn" style="margin-top:10px">Payé (en partie) avec un bon d'achat</button>`}</div>
  <div class="modes" ${toutParBon()?"hidden":""}>${MODES_BTN.map(m=>`<button class="mode ${pay.mode===m?"sel":""}" data-mode="${m}">${IC[m]}${MODES[m]}</button>`).join("")}</div>
  <div id="payPlus">${toutParBon()?"":payPlus(aPayer())}</div>
  <button class="btn gros" id="valider" style="margin-top:12px" ${peutValider()?"":"disabled"}>Valider la vente</button>
  <p class="muted" id="manque" style="text-align:center;margin:6px 0 0">${peutValider()?"":esc(manque())}</p>
 </aside></div>`}
function totauxHtml(){const st=totalPanier(),rm=remiseMt(),t=totalFinal(),b=bonPaye();
 return `${rm?`<div class="l"><span>Sous-total</span><span>${eur(st)}</span></div><div class="l"><span>${esc(remiseNom())}</span><span>− ${eur(rm)}</span></div>`:""}
 <div class="total"><span>Total</span><span id="total">${eur(t)}</span></div>
 ${b?`<div class="l"><span>Bon d'achat ${esc(normBon(pay.bonNum))}</span><span>− ${eur(b)}</span></div><div class="l" style="font-weight:700"><span>Reste à payer</span><span>${eur(aPayer())}</span></div>`:""}
 <div class="muted">dont TVA 21 % : ${eur(dontTva(r2(t-totalBonsVendus())))}${totalBonsVendus()?" (bons d'achat vendus : sans TVA)":""}</div>`}
const totalBonsVendus=()=>r2(panier.filter(l=>l.bon).reduce((t,l)=>t+(l.p||0)*(l.q||0),0));
function bonInfo(){const n=normBon(pay.bonNum);if(!n)return "";const sb=soldeBon(n);
 if(sb==null)return `Bon ${esc(n)} inconnu de la caisse (bon papier ?) : vérifiez-le avant d'accepter.`;
 return sb>0?`Bon ${esc(n)} : il reste ${eur(sb)}.`:`<span class="bad">Bon ${esc(n)} déjà entièrement utilisé.</span>`}
// QR de virement européen (EPC / « scan to pay ») : l'app bancaire du client le lit, montant et communication déjà remplis.
const ibanNet=i=>String(i||"").replace(/\s/g,"").toUpperCase();
function ibanOk(i){i=ibanNet(i);if(!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(i))return false;
 const n=(i.slice(4)+i.slice(0,4)).replace(/[A-Z]/g,c=>c.charCodeAt(0)-55);let r=0;for(const c of n)r=(r*10+ +c)%97;return r===1}
const communication=()=>`Comptoir ${dateBe(jour()).slice(0,5)} ticket ${ventes.filter(v=>v.date===jour()).length+1}`;
function qrEpc(montant){const d=["BCD","002","1","SCT",(REG.bic||"").replace(/\s/g,"").toUpperCase(),(REG.beneficiaire||"La Pile asbl").slice(0,70),ibanNet(REG.iban),
  "EUR"+montant.toFixed(2),"","",communication().slice(0,140)].join("\n");
 qrcode.stringToBytes=qrcode.stringToBytesFuncs["UTF-8"];const q=qrcode(0,"M");q.addData(d,"Byte");q.make();return q.createSvgTag({cellSize:5,margin:2,scalable:true})}
function qrPaiementHtml(t){
 if(!ibanOk(REG.iban))return `<p class="muted" style="margin-top:10px">Pour afficher un QR de paiement, indiquez l'IBAN de La Pile dans Réglages › Paiement par QR code.</p>`;
 if(!(t>0))return "";
 return `<div class="qr-pay"><div class="qr-img">${qrEpc(t)}</div><div><b>${eur(t)}</b><br><span class="muted">Le client scanne avec l'app de sa banque, vérifie et confirme. Validez la vente quand il vous montre le paiement.</span>
  <br><span class="muted">Communication : ${esc(communication())}</span><br><button class="chip" id="qrGrand" style="margin-top:6px">Afficher en grand</button></div></div>`}
function payPlus(t){
 if(pay.mode==="especes"){const sugg=[...new Set([t,...[5,10,20,50,100].map(b=>Math.ceil(t/b)*b)])].filter(x=>x>=t&&x>0).slice(0,4);
  return `<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><input class="champ" id="recu" inputmode="decimal" placeholder="Argent reçu (facultatif)" value="${esc(pay.recu)}"></div>
  <div class="billets">${sugg.map(x=>`<button class="chip" data-recu="${x}">${x===t?"Compte juste":eur(x).replace(",00","")}</button>`).join("")}</div><div id="rendu">${renduHtml(t,num(pay.recu))}</div>`}
 if(pay.mode==="carte")return qrPaiementHtml(t);
 if(pay.mode==="facture")return `<div class="grille-f" style="margin-top:10px"><label class="f">N° de facture<input class="champ" id="fnum" placeholder="${esc(prochaineFacture())}" value="${esc(pay.fnum)}" autocomplete="off"></label></div>
  <div class="cli">${CLI.map(([k,t])=>`<label class="f">${t}<input class="champ" data-cli="${k}" value="${esc(pay.cli[k]||"")}" ${k==="nom"?'list="clientsConnus"':""} autocomplete="off"></label>`).join("")}</div>
  <datalist id="clientsConnus">${clientsConnus().map(c=>`<option value="${esc(c.nom)}">`).join("")}</datalist>
  <div class="chips" style="margin-top:8px"><button class="chip ${pay.fpaye==="banque"?"sel":""}" data-fp="banque">Payée par banque</button><button class="chip ${pay.fpaye==="especes"?"sel":""}" data-fp="especes">Payée en espèces</button><button class="chip ${pay.fpaye==="attente"?"sel":""}" data-fp="attente">En attente de paiement</button></div>`;
 return ""}
// Clients déjà facturés : en tapant le nom, les autres champs se remplissent.
function clientsConnus(){const C={};ventes.filter(v=>v.facture&&v.facture.client&&v.facture.client.nom).sort((a,b)=>a.ts-b.ts).forEach(v=>C[v.facture.client.nom.toLowerCase()]=v.facture.client);return Object.values(C)}
// Numéro de facture proposé : celui d'après le dernier utilisé (F49-26 → F50-26).
function prochaineFacture(){const d=REG.derniereFacture;const a=String(new Date().getFullYear()).slice(2);
 const m=d&&String(d).match(/^F?\s*(\d+)(.*)$/i);return m?"F"+(+m[1]+1)+(m[2]||"-"+a):"F1-"+a}
function renduHtml(t,r){if(r==null)return"";return r<t?`<div class="rendu bad">Il manque ${eur(t-r)}</div>`:`<div class="rendu">À rendre : ${eur(r-t)}</div>`}
const panierPret=()=>panier.length&&panier.every(l=>l.p!=null&&l.p>=0&&l.q>0&&(l.id||String(l.n).trim())&&(!l.bon||l.p>0));
// Ce qui manque encore pour valider, dit en clair sous le bouton.
function manque(){if(!panier.length)return "Ajoutez un article au ticket.";
 const l=panier.find(l=>!(l.p!=null&&l.p>=0));if(l)return `Indiquez le prix de « ${l.n||"l'article sans fiche"} ».`;
 const q=panier.find(l=>!(l.q>0));if(q)return `Indiquez la quantité de « ${q.n} »${q.u?" (en "+q.u+")":""}.`;
 if(panier.some(l=>!l.id&&!l.liv&&!String(l.n).trim()))return "Décrivez l'article sans fiche.";
 if(panier.some(l=>l.bon&&!(l.p>0)))return "Indiquez le montant du bon d'achat.";
 if(pay.bonOn){const sb=soldeBon(pay.bonNum),m=num(pay.bonMt);if(!normBon(pay.bonNum))return "Indiquez le n° du bon d'achat.";if(!(m>0))return "Indiquez le montant pris sur le bon.";
  if(sb!=null&&m>sb+0.001)return `Le bon n'a plus que ${eur(sb)}.`}
 if(toutParBon())return "";
 if(!pay.mode)return "Choisissez le mode de paiement.";
 if(pay.mode==="especes"&&!peutValider())return "L'argent reçu est inférieur au total.";
 if(pay.mode==="facture"&&!(pay.cli.nom||"").trim())return "Indiquez le nom du client pour la facture.";
 if(pay.mode==="facture"&&!pay.fpaye)return "Indiquez si la facture est payée ou en attente.";
 return ""}
function majValider(){const b=$("#valider");if(!b)return;b.disabled=!peutValider();const m=$("#manque");if(m)m.textContent=b.disabled?manque():""}
function peutValider(){if(!panierPret())return false;
 if(pay.bonOn){const sb=soldeBon(pay.bonNum),m=num(pay.bonMt);if(!normBon(pay.bonNum)||!(m>0)||(sb!=null&&m>sb+0.001))return false}
 if(toutParBon())return true;const m=pay.mode;if(!m)return false;
 if(m==="especes"){const r=num(pay.recu);return pay.recu===""||(r!=null&&r>=aPayer())}
 if(m==="facture")return !!pay.fpaye&&!!(pay.cli.nom||"").trim();return true}
function brancherQr(){const g=$("#qrGrand");if(g)g.onclick=()=>{const t=aPayer();
 modal(`<div style="text-align:center"><h2>${eur(t)}</h2><p class="muted">Scannez avec l'app de votre banque</p><div class="qr-grand">${qrEpc(t)}</div>
  <p class="muted">${esc(REG.beneficiaire||"La Pile asbl")} · ${esc(ibanNet(REG.iban).replace(/(.{4})/g,"$1 ").trim())}<br>${esc(communication())}</p><button class="btn" data-ferme>Fermer</button></div>`)}}
function brancherCaisse(){const i=$("#scanIn");
 i.oninput=()=>{q=i.value;const pos=i.selectionStart;render();const j=$("#scanIn");j.focus();j.setSelectionRange(pos,pos)};
 i.onkeydown=e=>{if(e.key==="Enter"&&q.trim()){const r=lireCode(q.trim());if(r){e.preventDefault();q="";ajouterAuPanier(parRef(r));$("#scanIn").focus()}
  else if(/[\/:]/.test(q)){e.preventDefault();toast("Code non reconnu : « "+q.slice(0,40)+" »",true);q="";render();$("#scanIn").focus()}}};
 $$("[data-cat]").forEach(b=>b.onclick=()=>{cat=b.dataset.cat;render()});
 $$("[data-add]").forEach(b=>b.onclick=()=>ajouterAuPanier(parRef(b.dataset.add)));
 $("#libre").onclick=()=>{panier.push({r:"",n:"",p:null,q:1});render();const n=$$("[data-nom]");if(n.length)n[n.length-1].focus()};
 const lv=$("#livraison");if(lv)lv.onclick=()=>{panier.push({r:"",n:"Livraison",liv:1,u:"km",p:PRIX_KM,q:null});render();$(`[data-q="${panier.length-1}"]`).focus()};
 const v=$("#vider");if(v)v.onclick=()=>{if(confirm("Vider le ticket en cours ?")){panier=[];payNeuf();render()}};
 const majTot=()=>{$("#totaux").innerHTML=totauxHtml();majValider();if(pay.mode==="carte"&&!toutParBon()){$("#payPlus").innerHTML=payPlus(aPayer());brancherQr()}
  const r=$("#rendu");if(r)r.innerHTML=renduHtml(aPayer(),num(pay.recu))};
 $("#bonVente").onclick=()=>{const n=prochainBon();panier.push({r:"",n:"Bon d'achat "+n,bon:1,bonNum:n,p:null,q:1});render();$(`[data-prix="${panier.length-1}"]`).focus()};
 $$("[data-rem]").forEach(b=>b.onclick=()=>{remise={type:b.dataset.rem,val:remise.type===b.dataset.rem?remise.val:""};render();const x=$("#remVal");if(x)x.focus()});
 const rv=$("#remVal");if(rv)rv.oninput=()=>{remise.val=rv.value;majTot()};
 const rx=$("#remX");if(rx)rx.onclick=()=>{remise={type:"",val:""};render()};
 const bo=$("#bonOn");if(bo)bo.onclick=()=>{pay.bonOn=true;render();$("#bonNum").focus()};
 const bf=$("#bonOff");if(bf)bf.onclick=()=>{pay.bonOn=false;pay.bonNum="";pay.bonMt="";render()};
 const bn=$("#bonNum");if(bn){bn.oninput=()=>{pay.bonNum=bn.value;$("#bonInfo").innerHTML=bonInfo();majTot()};
  bn.onchange=()=>{const sb=soldeBon(pay.bonNum);if(sb>0&&!pay.bonMt){pay.bonMt=virg(Math.min(sb,totalFinal()))}render()}}
 const bm=$("#bonMt");if(bm){bm.oninput=()=>{pay.bonMt=bm.value;majTot()};bm.onchange=()=>render()}
 $$("[data-cli]").forEach(x=>{x.oninput=()=>{pay.cli[x.dataset.cli]=x.value;majValider()};
  if(x.dataset.cli==="nom")x.onchange=()=>{const c=clientsConnus().find(c=>c.nom.toLowerCase()===x.value.trim().toLowerCase());if(c){pay.cli={...c};render()}}});
 brancherQr();
 $$("[data-plus]").forEach(b=>b.onclick=()=>{panier[b.dataset.plus].q++;render()});
 $$("[data-moins]").forEach(b=>b.onclick=()=>{const l=panier[b.dataset.moins];l.q--;if(l.q<=0)panier.splice(b.dataset.moins,1);render()});
 $$("[data-suppr]").forEach(b=>b.onclick=()=>{panier.splice(b.dataset.suppr,1);render()});
 // Prix et quantité : mise à jour sur place, sans redessiner l'écran (sinon le clic suivant, sur un mode de paiement, se perd).
 const majLigne=i=>{const l=panier[i],el=$$(".tl")[i];if(el){el.querySelector(".tot").textContent=l.p==null||!l.q?"":eur(l.p*l.q);
  const m2=el.querySelector(".m2");if(m2)m2.textContent=m2Txt(l,l.q);const pr=el.querySelector("[data-prix]");if(pr)pr.classList.toggle("need",l.p==null);const qt=el.querySelector("[data-q]");if(qt&&qSaisie(l))qt.classList.toggle("need",!(l.q>0))}
  majTot()};
 $$("[data-prix]").forEach(x=>x.oninput=()=>{panier[x.dataset.prix].p=num(x.value);majLigne(+x.dataset.prix)});
 $$("[data-q]").forEach(x=>x.oninput=()=>{panier[x.dataset.q].q=num(x.value);majLigne(+x.dataset.q)});
 $$("[data-kg]").forEach(x=>x.oninput=()=>{const l=panier[x.dataset.kg];l.kg=num(x.value);l.kgEst=false});
 $$("[data-mat]").forEach(s=>s.onchange=()=>{const l=panier[s.dataset.mat];l.m=s.value;
  if(l.kgEst||l.kg==null){const r=Poids.estimer({nom:l.t||l.n,titre:l.n,cat:l.c,matiere:l.m,unite:l.u,L:l.L,l:l.l,h:l.h});if(r){l.kg=r.kg;l.kgEst=true;render()}}});
 $$("[data-nom]").forEach(x=>x.oninput=()=>{panier[x.dataset.nom].n=x.value;majValider()});
 $$("[data-mode]").forEach(b=>b.onclick=()=>{pay.mode=b.dataset.mode;render();const r=$("#recu");if(r)r.focus()});
 $$("[data-recu]").forEach(b=>b.onclick=()=>{pay.recu=virg(b.dataset.recu);render()});
 $$("[data-fp]").forEach(b=>b.onclick=()=>{pay.fpaye=b.dataset.fp;render()});
 const r=$("#recu");if(r)r.oninput=()=>{pay.recu=r.value;$("#rendu").innerHTML=renduHtml(aPayer(),num(pay.recu));majValider()};
 const f=$("#fnum");if(f)f.oninput=()=>{pay.fnum=f.value};
 $("#valider").onclick=valider}
async function valider(){const now=new Date(),d=jour(now),t=totalFinal(),rm=remiseMt(),b=bonPaye(),ap=aPayer();
 let n=ventes.filter(v=>v.date===d).length+1;while(ventes.some(v=>v.id===d+"-"+String(n).padStart(3,"0")))n++;
 const v={id:d+"-"+String(n).padStart(3,"0"),num:n,date:d,heure:now.toTimeString().slice(0,5),ts:now.getTime(),
  lignes:panier.map(l=>({id:l.id||"",r:l.r,c:l.c||"",m:l.m||"",kg:l.liv||l.bon?0:l.kg??null,kgEst:!!l.kgEst,n:String(l.n).trim(),q:l.q,p:l.p,u:l.u||"",...(l.bon?{bon:1,bonNum:l.bonNum}:{})})),
  total:t,mode:toutParBon()?"bon":pay.mode,annulee:false};
 if(rm){v.sousTotal=totalPanier();v.lignes.push({id:"",r:"",n:remiseNom(),q:1,p:-rm,u:"",kg:0,remise:1})}
 if(b)v.bon={num:normBon(pay.bonNum),mt:b};
 if(v.mode==="especes"&&num(pay.recu)!=null){v.recu=num(pay.recu);v.rendu=r2(v.recu-ap)}
 if(v.mode==="facture"){const fn=(pay.fnum.trim()||prochaineFacture()).toUpperCase(),cli={};CLI.forEach(([k])=>{const x=(pay.cli[k]||"").trim();if(x)cli[k]=x});
  v.facture={num:fn,paye:pay.fpaye,client:cli};await putSet("derniereFacture",fn)}
 // add (et non put) : jamais écraser un ticket déjà enregistré, par exemple depuis un autre onglet.
 try{for(let essai=0;;essai++){try{await tx("ventes","readwrite",s=>s.add(v));break}
  catch(e){if(!e||e.name!=="ConstraintError"||essai>20)throw e;
   ventes=await all("ventes");while(ventes.some(x=>x.id===v.id)){v.num++;v.id=d+"-"+String(v.num).padStart(3,"0")}}}
  planifierSync();planifierSauv()}
 catch(e){alert("La vente n'a pas pu être enregistrée. Notez-la dans le carnet papier.");return}
 ventes.push(v);calcStock();derniere=v;panier=[];q="";payNeuf();render();garderTicket();montrerTicket(v,true)}
// Ticket en cours gardé sur l'appareil : rien n'est perdu si l'onglet se ferme ou si le PC redémarre.
function garderTicket(){clearTimeout(garderTicket.t);garderTicket.t=setTimeout(()=>{if(idb)putSet("ticketEnCours",panier.length?{panier,pay,remise}:null).catch(()=>{})},300)}
document.addEventListener("input",()=>{if(screen==="caisse")garderTicket()});
document.addEventListener("change",()=>{if(screen==="caisse")garderTicket()});

// Ticket (fenêtre)
const qTxt=l=>l.remise||l.bon?"":virg(l.q)+(l.u&&l.u!=="pièce"?" "+l.u:" ×");
const modeSeul=v=>v.mode==="facture"?`Facture ${v.facture.num} (${{banque:"par banque",especes:"en espèces",attente:"en attente"}[v.facture.paye]||""})`:MODES[v.mode];
const modeTxt=v=>v.bon?`bon d'achat ${v.bon.num} (${eur(v.bon.mt)})`+(v.mode!=="bon"?` + ${modeSeul(v)} (${eur(aPayerV(v))})`:""):modeSeul(v);
// Montants d'une vente : payé hors bon, part des bons d'achat vendus (sans TVA), base et TVA.
const aPayerV=v=>r2(v.total-(v.bon?v.bon.mt:0));
const bonsVendusV=v=>r2(v.lignes.filter(l=>l.bon).reduce((t,l)=>t+l.p*l.q,0));
const tvaV=v=>{const hors=bonsVendusV(v),base=r2(v.total-hors);return {ttc:v.total,ht:r2(htva(base)+hors),tva:dontTva(base)}};
const cliTxt=c=>c?[c.nom,c.adr,c.loc,c.tva?"TVA "+c.tva:"",c.mail,c.tel].filter(Boolean):[];
function ticketHtml(v){const T=tvaV(v);return `<div class="tk"><div class="tete"><img src="https://www.la-pile.be/img/logo-main.svg" alt="" onerror="this.remove()"><b>Comptoir des Matériaux · La Pile asbl</b><br><span class="muted">${v.facture?`Facture ${esc(v.facture.num)} · `:""}Ticket n° ${v.num} · ${dateBe(v.date)} ${v.heure}</span></div>
 ${v.facture&&v.facture.client?`<div class="tk-cli">${cliTxt(v.facture.client).map(esc).join("<br>")}</div>`:""}<hr>
 ${v.lignes.map(l=>`<div class="l"><span>${esc(qTxt(l))} ${esc(l.n)}${l.r?` <span class="muted">${esc(l.r)}</span>`:""}</span><span>${l.p<0?"− "+eur(-l.p*l.q):eur(l.p*l.q)}</span></div>`).join("")}<hr>
 <div class="l" style="font-size:18px;font-weight:800"><span>Total</span><span>${eur(v.total)}</span></div>
 <div class="l muted"><span>Hors TVA</span><span>${eur(T.ht)}</span></div><div class="l muted"><span>TVA 21 %</span><span>${eur(T.tva)}</span></div>
 <div class="l muted"><span>Payé : ${esc(modeTxt(v))}</span><span>${v.recu!=null?"reçu "+eur(v.recu)+" · rendu "+eur(v.rendu):""}</span></div>
 ${v.annulee?'<div class="rendu bad" style="margin-top:10px">Vente annulée</div>':""}</div>`}
function ticketTexte(v){return `Comptoir des Matériaux · La Pile asbl\nTicket n° ${v.num} · ${dateBe(v.date)} ${v.heure}\n\n`+
 v.lignes.map(l=>`${l.remise?"":qTxt(l)+" "}${l.n}${l.r?" ("+l.r+")":""} : ${l.p<0?"− "+eur(-l.p*l.q):eur(l.p*l.q)}`).join("\n")+`\n\nTotal : ${eur(v.total)} (dont TVA 21 % : ${eur(tvaV(v).tva)})\nPayé : ${modeTxt(v)}\nMerci pour le réemploi !\nRue Frédéric Lang 3, 4960 Malmedy · 0493 04 99 29`}
function modal(html){const m=$("#modal");m.innerHTML=`<div class="voile" data-ferme></div><div class="modal"><div class="boite">${html}</div></div>`;m.hidden=false;
 m.querySelectorAll("[data-ferme]").forEach(b=>b.onclick=fermerModal)}
function fermerModal(){$("#modal").hidden=true;$("#modal").innerHTML="";const s=$("#scanIn");if(s)s.focus()}
function montrerTicket(v,nouveau){
 modal(`${nouveau&&v.rendu?`<div class="rendu" style="margin:0 0 12px">À rendre : ${eur(v.rendu)}</div>`:""}${ticketHtml(v)}
 <div class="no-print" style="margin-top:16px"><label class="f">Envoyer le ticket au client<input class="champ" id="tkContact" autocomplete="off" placeholder="E-mail ou GSM du client (ex. 0470 12 34 56)"></label>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn clair" id="tkMail">Par e-mail</button><button class="btn clair" id="tkSms">Par SMS</button><button class="btn clair" id="tkPartager">Copier / partager</button></div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn clair" id="tkImprimer">Imprimer</button>
 ${!nouveau&&!v.annulee?'<button class="btn rouge" id="tkAnnuler">Annuler la vente</button>':""}<span style="flex:1"></span><button class="btn" data-ferme>${nouveau?"Vente suivante":"Fermer"}</button></div>`);
 $("#tkPartager").onclick=async()=>{const t=ticketTexte(v);
  try{if(navigator.share){await navigator.share({title:"Ticket Comptoir",text:t});return}}catch(e){return}
  try{await navigator.clipboard.writeText(t);toast("Ticket copié : collez-le dans un SMS ou un e-mail")}catch(e){toast("Impossible de copier",true)}};
 // E-mail : ouvre la messagerie du PC avec le ticket prêt à partir. SMS : ouvre l'app de messages (sur PC, il faut un
 // téléphone relié, par ex. « Lien avec Windows » ; sinon le texte est copié). Le contact du client n'est pas gardé.
 const contact=()=>$("#tkContact").value.trim();
 const gsm=t=>{let n=t.replace(/[\s./-]/g,"");if(/^0[1-9]\d{7,8}$/.test(n))n="+32"+n.slice(1);else if(/^00\d+$/.test(n))n="+"+n.slice(2);return /^\+?\d{8,15}$/.test(n)?n:""};
 const ouvrir=u=>{const a=document.createElement("a");a.href=u;a.click()};
 $("#tkMail").onclick=()=>{const c=contact();if(c&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)){toast("Adresse e-mail incomplète",true);return}
  ouvrir(`mailto:${encodeURIComponent(c)}?subject=${encodeURIComponent(`Votre ticket du Comptoir des Matériaux (${dateBe(v.date)})`)}&body=${encodeURIComponent(ticketTexte(v))}`)};
 $("#tkSms").onclick=async()=>{const n=gsm(contact());if(contact()&&!n){toast("Numéro de GSM non reconnu",true);return}
  try{await navigator.clipboard.writeText(ticketTexte(v))}catch(e){}
  ouvrir(`sms:${n}?body=${encodeURIComponent(ticketTexte(v))}`);toast("Ticket aussi copié, au cas où : collez-le dans le message")};
 $("#tkImprimer").onclick=()=>imprimer(ticketHtml(v));
 const a=$("#tkAnnuler");if(a)a.onclick=async()=>{if(!confirm(`Annuler le ticket n° ${v.num} (${eur(v.total)}) ? Il restera visible, barré.`))return;
  v.annulee=true;v.annuleeA=Date.now();await put("ventes",v);calcStock();fermerModal();render()}}
function imprimer(html){const w=open("","_blank");if(!w){toast("Autorisez les fenêtres pour imprimer",true);return}
 w.document.write(`<!doctype html><meta charset="utf-8"><title>Comptoir des Matériaux</title><link rel="stylesheet" href="${new URL("style.css",location.href)}"><style>body{background:#fff;padding:16px}</style>${html}`);
 w.document.close();setTimeout(()=>{w.print()},400)}

// ---------- Stock (comme la gestion des produits d'Impulsion, avec le stock calculé et l'historique) ----------
let stQ="",stCat="",stStat="",stTri="r",stPage=0;
function stockListe(){const mots=sans(stQ).split(/\s+/).filter(Boolean);
 const L=CAT.filter(a=>(!stCat||a.c===stCat)&&(!stStat||statut(a)===stStat||(stStat==="nouveau"&&a.src)||(stStat==="sansprix"&&!a.p)||(stStat==="sanspoids"&&a.kg==null)||(stStat==="sansempl"&&!a.e))&&(!mots.length||mots.every(m=>a.k.includes(m))));
 const cle={r:a=>a.r,n:a=>sans(a.n),e:a=>a.e||"~",s:a=>-(reste(a)??-1),p:a=>-(a.p||0)}[stTri];
 return L.sort((a,b)=>{const x=cle(a),y=cle(b);return x<y?-1:x>y?1:0})}
function stockTotaux(){let n=0,val=0,kg=0;CAT.forEach(a=>{const r=reste(a);if(r>0){n++;val+=r*(a.p||0);if(a.kg!=null)kg+=r*a.kg}});return {n,val:r2(val),kg}}
function ecranStock(){const L=stockListe(),T=stockTotaux(),PAR=100,pages=Math.ceil(L.length/PAR);if(stPage>=pages)stPage=0;
 const filtres={"":"Tous les statuts",ok:"En stock",vendu:"Vendus",rupture:"Plus en stock",hors:"Hors ligne",nouveau:"Nouvelles fiches",sansprix:"Sans prix",sanspoids:"Sans poids",sansempl:"Sans emplacement"};
 const th=(k,t,cl="")=>`<th class="${cl}"><button class="lien" data-tri="${k}" style="color:inherit;text-decoration:${stTri===k?"underline":"none"}">${t}</button></th>`;
 return `<div class="tuiles"><div class="tuile b"><b>${T.n}</b><span>articles en stock</span></div><div class="tuile j"><b>${eur0(T.val)}</b><span>valeur au prix de vente</span></div>
  <div class="tuile v"><b>${kgTxt(T.kg)}</b><span>en stock (poids connus)</span></div><div class="tuile"><b>${CAT.filter(a=>!a.p).length}</b><span>articles sans prix</span></div></div>
 <div class="outils"><input class="champ" id="stq" type="search" placeholder="Rechercher : nom, référence, emplacement (ou scanner)" value="${esc(stQ)}" autocomplete="off">
  <select class="champ" id="stCat"><option value="">Toutes les catégories</option>${CATS.map(c=>`<option value="${c[0]}" ${stCat===c[0]?"selected":""}>${c[1]}</option>`).join("")}</select>
  <select class="champ" id="stStat">${Object.entries(filtres).map(([k,t])=>`<option value="${k}" ${stStat===k?"selected":""}>${t}</option>`).join("")}</select>
  <button class="btn" id="nouvel">+ Nouvel article</button><button class="btn clair" id="importer">Importer des fiches</button><input type="file" id="fichier" accept=".csv,.json" hidden></div>
 <div class="tab-wrap"><table class="t"><thead><tr><th></th>${th("r","Référence")}${th("n","Nom")}<th>Catégorie</th>${th("e","Emplacement")}${th("s","Stock","r")}<th>Unité</th>${th("p","Prix TTC","r")}<th class="r">Poids</th><th>Matière</th><th>Statut</th></tr></thead><tbody>
 ${L.slice(stPage*PAR,(stPage+1)*PAR).map(a=>{const r=reste(a),st=statut(a);
  return `<tr class="cl" data-art="${esc(a.r)}"><td><span class="vig">${a.f?`<img src="${esc(a.f)}" alt="" loading="lazy" onerror="this.remove()">`:esc(a.c||"")}</span></td>
  <td><b>${esc(refAff(a))||'<span class="muted">sans réf.</span>'}</b></td><td>${esc(a.n)}${a.src?' <span class="pill violet">nouvelle fiche</span>':""}</td><td>${esc(catLabel(a.c)||a.c||"")}</td><td>${esc(a.e||"")}</td>
  <td class="r"><b>${r==null?"?":virg(r)}</b>${a.pm&&r>0?`<br><small class="muted">${m2Txt(a,r).trim()}</small>`:""}</td><td>${esc(a.u||"pièce")}</td><td class="r">${a.p?eur(a.p):'<span class="pill jaune">?</span>'}</td>
  <td class="r">${a.kg!=null?virg(a.kg)+" kg":""}</td><td>${esc(a.m||"")}</td><td><span class="pill ${STATUTS[st][1]}">${STATUTS[st][0]}</span></td></tr>`}).join("")||'<tr><td colspan="11" class="vide">Aucun article.</td></tr>'}
 </tbody></table></div>
 <div class="outils" style="margin-top:10px"><span class="muted">${L.length} article${L.length>1?"s":""}</span>${pages>1?`<span style="flex:1"></span><button class="btn clair petit" data-pg="-1" ${stPage?"":"disabled"}>‹ Précédents</button><span class="muted">page ${stPage+1} / ${pages}</span><button class="btn clair petit" data-pg="1" ${stPage<pages-1?"":"disabled"}>Suivants ›</button>`:""}</div>
 <p class="muted">Cliquez un article pour le modifier, noter une entrée, une sortie ou un comptage. ${nbFiches?`${nbFiches} fiche${nbFiches>1?"s":""} de l'app d'encodage ajoutée${nbFiches>1?"s":""}.`:""}</p>`}
function brancherStock(){const i=$("#stq");
 i.oninput=()=>{stQ=i.value;stPage=0;const pos=i.selectionStart;render();const j=$("#stq");j.focus();j.setSelectionRange(pos,pos)};
 $("#stCat").onchange=e=>{stCat=e.target.value;stPage=0;render()};
 $("#stStat").onchange=e=>{stStat=e.target.value;stPage=0;render()};
 $$("[data-tri]").forEach(b=>b.onclick=()=>{stTri=b.dataset.tri;render()});
 $$("[data-pg]").forEach(b=>b.onclick=()=>{stPage+=+b.dataset.pg;render();scrollTo(0,0)});
 $$("[data-art]").forEach(t=>t.onclick=()=>ouvrirPanneau(t.dataset.art));
 $("#nouvel").onclick=()=>ouvrirPanneau("",false,true);
 $("#importer").onclick=()=>$("#fichier").click();
 $("#fichier").onchange=e=>importerFichier(e.target.files[0])}

// Fiche article (panneau à droite)
let panneauRef=null;
function prochaineRef(c){let mx=0;CAT.forEach(a=>{const m=a.r.match(/^([A-Z]+)(\d+)$/);if(m&&m[1]===c)mx=Math.max(mx,+m[2])});return c+(mx+1)}
function ouvrirPanneau(r,refresh,nouveau){
 const a=nouveau?{r:"",n:"",c:"DIV",u:"pièce",p:null,s:0,e:"",m:"",kg:null}:parRef(r);if(!a)return;panneauRef=nouveau?null:r;
 const S=STK[a.r]||{ev:[]},rs=reste(a),hist=[...S.ev].reverse().slice(0,30);
 const lib={entree:"Entrée",vente:"Vente",sortie:"Sortie",correction:"Comptage"};
 $("#panneau").innerHTML=`<div class="voile" data-fermep></div><aside class="panneau" role="dialog" aria-label="Fiche article">
 <div class="ph-h"><h2>${nouveau?"Nouvel article":esc(refAff(a)||"sans réf.")+" · "+esc(a.n)}</h2><button class="x" data-fermep aria-label="Fermer">×</button></div>
 <div class="corps">
  ${nouveau?"":`<div style="display:flex;gap:14px;align-items:center">${a.f?`<img src="${esc(a.f)}" alt="" style="width:110px;height:82px;object-fit:cover;border-radius:10px">`:""}
   <div><div class="stockbig">${rs==null?"?":virg(rs)} <small class="muted">${esc(a.u||"pièce")} en stock${m2Txt(a,rs)}</small></div>
   <span class="pill ${STATUTS[statut(a)][1]}">${STATUTS[statut(a)][0]}</span> ${S.compte?`<span class="muted">compté le ${dateBe(jour(new Date(S.compte)))}</span>`:""}</div></div>
  <div class="mv"><button class="btn clair petit" data-mv="entree">+ Entrée</button><button class="btn clair petit" data-mv="sortie">− Sortie (casse, don…)</button><button class="btn clair petit" data-mv="correction">Comptage sur place</button></div>
  <div id="mvForm"></div>`}
  <div class="grille-f">
   <label class="f">Catégorie<select class="champ" id="aC">${CATS.map(c=>`<option value="${c[0]}" ${a.c===c[0]?"selected":""}>${c[1]}</option>`).join("")}</select></label>
   <label class="f">Référence<input class="champ" id="aR" value="${esc(a.r||"")}" ${nouveau?"":"readonly"} placeholder="auto"></label>
  </div>
  <label class="f">Nom de l'annonce<input class="champ" id="aN" value="${esc(a.n)}"></label>
  <div class="grille-f">
   <label class="f">Prix TTC (€)<input class="champ" id="aP" inputmode="decimal" value="${virg(a.p)}"></label>
   <label class="f">Unité<select class="champ" id="aU">${UNITES.map(u=>`<option ${a.u===u?"selected":""}>${u}</option>`).join("")}</select></label>
   ${nouveau?`<label class="f">Stock de départ<input class="champ" id="aS" inputmode="decimal" value="1"></label>`:""}
   <label class="f">Emplacement<input class="champ" id="aE" value="${esc(a.e||"")}" placeholder="ex. B2-3"></label>
   <label class="f">Matière<select class="champ" id="aM"><option value="">?</option>${MATIERES.map(m=>`<option ${a.m===m?"selected":""}>${m}</option>`).join("")}</select></label>
   <label class="f">Poids unitaire (kg)<input class="champ" id="aK" inputmode="decimal" value="${virg(a.kg)}" placeholder="${a.kgEst?"estimé":""}"></label>
   <label class="f">L1 (cm)<input class="champ" id="aL1" inputmode="decimal" value="${virg(a.L)}"></label>
   <label class="f">L2 (cm)<input class="champ" id="aL2" inputmode="decimal" value="${virg(a.l)}"></label>
   <label class="f">L3 (cm)<input class="champ" id="aL3" inputmode="decimal" value="${virg(a.h)}"></label>
  </div>
  <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="aH" ${a.horsLigne?"checked":""} style="width:20px;height:20px"> Hors ligne (retiré du site, même s'il reste du stock)</label>
  <p class="muted" style="margin:0">${a.kgEst?"Poids estimé d'après la matière et les mesures. ":""}Dans Impulsion, rien ne change : reportez les modifications avec le fichier « Stock à jour » (Rapports).</p>
  ${nouveau?"":`<div><h3>Historique</h3><div class="hist">${hist.map(e=>`<div><span>${dateBe(jour(new Date(e.ts)))}</span><span>${lib[e.type]}${e.motif?" · "+esc(MOTIFS[e.motif]||e.motif):""}${e.note?" · "+esc(e.note):""}${e.vid?" · ticket "+esc(e.vid.slice(11)):""}</span><b>${e.type==="correction"?"= ":e.type==="entree"?"+":"−"}${virg(e.q)}</b></div>`).join("")||'<div><span></span><span class="muted">Aucun mouvement depuis l\'export du 14/10.</span><b></b></div>'}
   <div><span></span><span>Stock de départ (export Impulsion ou fiche)</span><b>${a.s==null?"?":virg(a.s)}</b></div></div></div>`}
 </div>
 <div class="pied">${nouveau?"":`<button class="btn clair" id="aVendre">Ajouter au ticket</button>`}<span style="flex:1"></span><button class="btn clair" data-fermep>Fermer</button><button class="btn" id="aSave">Enregistrer</button></div></aside>`;
 $("#panneau").hidden=false;
 $$("[data-fermep]").forEach(b=>b.onclick=fermerPanneau);
 if(nouveau)$("#aC").onchange=e=>{$("#aR").placeholder=prochaineRef(e.target.value)},$("#aR").placeholder=prochaineRef(a.c);
 $$("[data-mv]").forEach(b=>b.onclick=()=>formMouvement(a,b.dataset.mv));
 const v=$("#aVendre");if(v)v.onclick=()=>{fermerPanneau();screen="caisse";ajouterAuPanier(a)};
 $("#aSave").onclick=()=>enregistrerArticle(a,nouveau);
 if(!refresh&&!nouveau){const n=$("#aN");n&&n.blur()}}
function fermerPanneau(){panneauRef=null;const p=$("#panneau");p.hidden=true;p.innerHTML=""}
function formMouvement(a,type){const t={entree:"Entrée en stock",sortie:"Sortie hors vente",correction:"Comptage sur place"}[type];
 $("#mvForm").innerHTML=`<div class="carte" style="background:var(--fond)"><h3>${t}</h3><div class="grille-f" style="margin-top:8px">
  <label class="f">${type==="correction"?"Quantité comptée":"Quantité"}<input class="champ" id="mvQ" inputmode="decimal" value="${type==="correction"?virg(reste(a)??""):"1"}"></label>
  ${type==="sortie"?`<label class="f">Motif<select class="champ" id="mvM">${Object.entries(MOTIFS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></label>`:""}
  <label class="f">Note<input class="champ" id="mvN" placeholder="${type==="entree"?"ex. chantier Waimes":"facultatif"}"></label></div>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn petit" id="mvOk">Enregistrer</button><button class="btn clair petit" id="mvNon">Annuler</button></div></div>`;
 $("#mvQ").focus();$("#mvQ").select();
 $("#mvNon").onclick=()=>$("#mvForm").innerHTML="";
 $("#mvOk").onclick=async()=>{const qv=num($("#mvQ").value);if(qv==null||qv<0||(type!=="correction"&&!qv)){toast("Indiquez une quantité",true);return}
  const now=Date.now(),m={id:"M"+now,ts:now,date:jour(),r:a.r,type,q:qv,note:$("#mvN").value.trim()};if(type==="sortie")m.motif=$("#mvM").value;
  await put("mouvements",m);MVT.push(m);calcStock();toast(t+" enregistrée");render()}}
async function enregistrerArticle(a,nouveau){
 const o={r:nouveau?norm($("#aR").value)||prochaineRef($("#aC").value):a.r,n:$("#aN").value.trim(),c:$("#aC").value,p:num($("#aP").value),u:$("#aU").value,e:$("#aE").value.trim().toUpperCase(),
  m:$("#aM").value,L:num($("#aL1").value),l:num($("#aL2").value),h:num($("#aL3").value),horsLigne:$("#aH").checked,modifie:Date.now()};
 const kg=num($("#aK").value);o.kg=kg;o.kgEst=kg==null?false:(kg===a.kg?!!a.kgEst:false);
 if(kg==null){const r=Poids.estimer({nom:o.n,cat:o.c,matiere:o.m,unite:o.u,L:o.L,l:o.l,h:o.h});if(r){o.kg=r.kg;o.kgEst=true}}
 if(!o.n){toast("Donnez un nom à l'article",true);return}
 if(nouveau){if(parRef(o.r)){toast("La référence "+o.r+" existe déjà",true);return}o.s=num($("#aS").value)??0;o.cree=Date.now();o.src="caisse"}
 ARTS[o.r]={...(ARTS[o.r]||{}),...o};await put("articles",ARTS[o.r]);
 if(nouveau)ajouterArticle({...ARTS[o.r]});else{Object.assign(a,o);indexer(a)}
 calcStock();toast(nouveau?"Article "+o.r+" créé":"Article enregistré");panneauRef=o.r;render()}

// Import : fichier « caractéristiques » de l'app d'encodage (CSV ;) ou sauvegarde JSON de l'app.
async function importerFichier(f){if(!f)return;const t=await f.text();let fiches=[];
 try{if(/\.json$/i.test(f.name)){const j=JSON.parse(t);fiches=Array.isArray(j)?j:j.fiches||[]}
  else{const L=t.replace(/^﻿/,"").split(/\r?\n/).filter(Boolean),H=L.shift().split(";");const ix=n=>H.findIndex(h=>sans(h).startsWith(sans(n)));
   const c={r:ix("Référence"),n:ix("Nom"),c:ix("Catégorie"),L:ix("L1"),l:ix("L2"),h:ix("L3"),m:ix("Matière"),q:ix("Quantité"),u:ix("Unité"),e:ix("Emplacement"),k:ix("Poids (kg)")};
   if(c.L<0){c.L=ix("Largeur");c.l=ix("Profondeur");c.h=ix("Hauteur")}
   L.forEach(l=>{const v=l.split(";");const g=k=>c[k]>=0?(v[c[k]]||"").trim():"";const cc=CATS.find(x=>sans(x[1])===sans(g("c")));
    fiches.push({code:g("r"),nom:g("n"),cat:cc?cc[0]:(g("r").match(/^[A-Z]+/)||["DIV"])[0],L:num(g("L")),l:num(g("l")),h:num(g("h")),matiere:g("m"),qte:g("q"),unite:g("u")||"pièce",empl:g("e"),poids:g("k")})})}}
 catch(e){toast("Fichier illisible",true);return}
 const avant=CAT.length;const n=ajouterFiches(fiches,"import");
 for(const a of CAT.slice(avant)){const o={...a};delete o.k;ARTS[a.r]=o;await put("articles",o)}
 calcStock();toast(n?`${n} nouvel${n>1?"s":""} article${n>1?"s":""} ajouté${n>1?"s":""}`:"Aucun nouvel article (déjà connus)");render()}

// ---------- Mouvements : ventes, entrées, sorties, comptages, dans l'ordre ----------
let mvMois=moisDe(jour()),mvType="";
function tousMouvements(m){const L=[];
 ventes.filter(v=>moisDe(v.date)===m).forEach(v=>v.lignes.forEach(l=>L.push({ts:v.ts,date:v.date,type:"vente",r:l.r||"",n:l.n,q:l.q,u:l.u,mt:r2(l.p*l.q),info:"ticket "+v.num+" · "+modeTxt(v),annule:v.annulee,kg:l.kg})));
 MVT.filter(x=>moisDe(x.date)===m).forEach(x=>{const a=parRef(x.r)||{};L.push({ts:x.ts,date:x.date,type:x.type,r:x.r,n:a.n||"",q:x.q,u:a.u,info:[x.motif?MOTIFS[x.motif]:"",x.note].filter(Boolean).join(" · "),id:x.id,annule:x.annule,kg:a.kg})});
 Object.values(INV).filter(i=>moisDe(jour(new Date(i.ts)))===m).forEach(i=>{const a=parRef(i.k)||{};L.push({ts:i.ts,date:jour(new Date(i.ts)),type:"correction",r:i.k,n:a.n||"",q:i.compte,u:a.u,info:"comptage"})});
 return L.filter(x=>!mvType||x.type===mvType).sort((a,b)=>b.ts-a.ts)}
function ecranMouv(){const L=tousMouvements(mvMois),lib={vente:["Vente","ok"],entree:["Entrée","violet"],sortie:["Sortie","bad"],correction:["Comptage","jaune"]};
 return `<div class="titre"><h2>Mouvements de stock</h2></div>
 <div class="outils"><input class="champ" id="mvMois" type="month" value="${mvMois}" style="flex:0 0 auto;min-width:0">
  <select class="champ" id="mvType"><option value="">Tous les mouvements</option>${Object.entries(lib).map(([k,v])=>`<option value="${k}" ${mvType===k?"selected":""}>${v[0]}s</option>`).join("")}</select>
  <span style="flex:1"></span><button class="btn clair" id="csvMv">Exporter (tableur)</button></div>
 <div class="tab-wrap"><table class="t"><thead><tr><th>Date</th><th>Heure</th><th>Type</th><th>Référence</th><th>Article</th><th class="r">Quantité</th><th class="r">Montant</th><th>Détail</th><th></th></tr></thead><tbody>
 ${L.map(x=>`<tr class="${x.r&&parRef(x.r)?"cl":""}" ${x.r&&parRef(x.r)?`data-art="${esc(x.r)}"`:""} style="${x.annule?"opacity:.5;text-decoration:line-through":""}"><td>${dateBe(x.date)}</td><td>${new Date(x.ts).toTimeString().slice(0,5)}</td>
  <td><span class="pill ${lib[x.type][1]}">${lib[x.type][0]}</span></td><td>${esc(x.r)}</td><td>${esc(x.n)}</td><td class="r">${x.type==="correction"?"= ":x.type==="entree"?"+":"−"}${virg(x.q)} ${x.u&&x.u!=="pièce"?esc(x.u):""}</td>
  <td class="r">${x.mt!=null?eur(x.mt):""}</td><td class="muted">${esc(x.info)}</td><td>${x.id&&!x.annule?`<button class="lien rouge" data-annmv="${x.id}">annuler</button>`:""}</td></tr>`).join("")||'<tr><td colspan="9" class="vide">Aucun mouvement ce mois-ci.</td></tr>'}
 </tbody></table></div>`}
function brancherMouv(){$("#mvMois").onchange=e=>{if(e.target.value){mvMois=e.target.value;render()}};
 $("#mvType").onchange=e=>{mvType=e.target.value;render()};
 $$("[data-art]").forEach(t=>t.onclick=e=>{if(!e.target.closest("button"))ouvrirPanneau(t.dataset.art)});
 $$("[data-annmv]").forEach(b=>b.onclick=async()=>{const m=MVT.find(x=>x.id===b.dataset.annmv);if(!confirm("Annuler ce mouvement ?"))return;m.annule=true;await put("mouvements",m);calcStock();render()});
 $("#csvMv").onclick=()=>telecharger(`mouvements-${mvMois}.csv`,csv([["Date","Heure","Type","Référence","Article","Quantité","Unité","Montant TVAc","Détail","Annulé"]].concat(
  tousMouvements(mvMois).reverse().map(x=>[dateBe(x.date),new Date(x.ts).toTimeString().slice(0,5),x.type,x.r,x.n,virg(x.q),x.u||"pièce",dec(x.mt),x.info,x.annule?"oui":""]))))}

// ---------- Carnet de caisse (comme le carnet papier) ----------
const entreeCaisse=v=>v.mode==="especes"||(v.mode==="facture"&&v.facture.paye==="especes");
// Un bon d'achat utilisé n'est pas de l'argent reçu : ligne négative dans les recettes (et dans la caisse si le reste est payé en espèces).
let moisVu=moisDe(jour());
// Comme un journal des recettes : rien n'est retiré. Un ticket annulé reste à sa place et une ligne
// d'annulation (montants en négatif) est écrite le jour de l'annulation. Un total par jour suit chaque journée.
const quandAnnule=x=>x.annuleeA||x.ts;
function carnet(m){const lignes=[];
 const evts=[...ventes.filter(v=>moisDe(v.date)===m).map(v=>({ts:v.ts,date:v.date,v})),...sorties.filter(s=>moisDe(s.date)===m).map(s=>({ts:s.ts,date:s.date,s})),
  ...ventes.filter(v=>v.annulee&&moisDe(jour(new Date(quandAnnule(v))))===m).map(v=>({ts:quandAnnule(v),date:jour(new Date(quandAnnule(v))),v,ann:1})),
  ...sorties.filter(s=>s.annulee&&moisDe(jour(new Date(quandAnnule(s))))===m).map(s=>({ts:quandAnnule(s),date:jour(new Date(quandAnnule(s))),s,ann:1}))].sort((a,b)=>a.ts-b.ts);
 const neg=x=>x==null?null:-x;let jourEnCours=null,tj=null;
 const finJour=()=>{if(tj)lignes.push({date:"",jour:1,lib:"Total du "+dateBe(jourEnCours),rec:r2(tj.rec),ent:r2(tj.ent),sor:r2(tj.sor)})};
 evts.forEach(e=>{
  if(e.date!==jourEnCours){finJour();jourEnCours=e.date;tj={rec:0,ent:0,sor:0}}
  const avant=lignes.length;
  if(e.v&&e.ann){const v=e.v,cash=entreeCaisse(v),tot=r2(v.total-(v.bon?v.bon.mt:0));
   lignes.push({date:e.date,client:true,vid:v.id,corr:1,lib:`Annulation du ticket n° ${v.num} du ${dateBe(v.date)}`,ref:"",
    rec:v.mode==="facture"?null:-tot,recTxt:v.mode==="facture"?"annul. "+v.facture.num:null,ent:cash?-tot:null,sor:null})}
  else if(e.v){const v=e.v,cash=entreeCaisse(v);
   v.lignes.forEach((l,i)=>{const mt=r2(l.p*l.q);lignes.push({date:i?"":v.date,client:!i,vid:v.id,annule:v.annulee,
    lib:(l.q!==1||qSaisie(l)?qTxt(l)+" ":"")+(l.n||"article"),ref:l.r,
    rec:v.mode==="facture"?null:mt,recTxt:v.mode==="facture"?v.facture.num:null,ent:cash?mt:null,sor:null})});
   if(v.bon)lignes.push({date:"",client:false,vid:v.id,annule:v.annulee,lib:"payé par bon d'achat "+v.bon.num,ref:"",rec:v.mode==="facture"?null:-v.bon.mt,ent:cash?-v.bon.mt:null,sor:null})}
  else if(e.ann)lignes.push({date:e.date,client:true,sid:e.s.id,corr:1,lib:`Annulation de la sortie « ${e.s.lib} » du ${dateBe(e.s.date)}`,ref:"",rec:null,ent:null,sor:-e.s.montant});
  else lignes.push({date:e.s.date,client:true,sid:e.s.id,annule:e.s.annulee,lib:e.s.lib,ref:"",rec:null,ent:null,sor:e.s.montant});
  lignes.slice(avant).forEach(l=>{tj.rec+=l.rec||0;tj.ent+=l.ent||0;tj.sor+=l.sor||0})});
 finJour();
 const t={rec:0,ent:0,sor:0};lignes.filter(l=>!l.jour).forEach(l=>{t.rec+=l.rec||0;t.ent+=l.ent||0;t.sor+=l.sor||0});for(const k in t)t[k]=r2(t[k]);
 // TVA : sur les articles (pas sur les bons d'achat vendus ; un bon utilisé paie des articles, la TVA est due à ce moment-là).
 // Une annulation retire la TVA le jour où elle est faite.
 t.tva=r2(evts.filter(e=>e.v&&e.v.mode!=="facture").reduce((x,e)=>x+(e.ann?-1:1)*tvaV(e.v).tva,0));
 const rep=report(m);t.solde=r2(rep+t.ent-t.sor);t.clients=evts.filter(e=>e.v&&!e.ann&&!e.v.annulee).length;
 return {lignes,t,rep}}
function report(m,prof=0){const k="report-"+m;if(REG[k]!=null)return REG[k];if(prof>24)return 0;
 const pm=moisAvant(m);const aDes=ventes.some(v=>moisDe(v.date)===pm)||sorties.some(s=>moisDe(s.date)===pm)||REG["report-"+pm]!=null;
 return aDes?carnet(pm).t.solde:0}
function ecartHtml(c,s){if(c==null)return"";const e=r2(c-s);if(Math.abs(e)<0.005)return`<div class="rendu">La caisse est juste</div>`;
 return `<div class="rendu bad">${e>0?eur(e)+" en trop":"Il manque "+eur(-e)} : prévenir l'équipe</div>`}
function ecranCarnet(){const {lignes,t,rep}=carnet(moisVu),auj=jour(),cpt=REG["compte-"+auj],estCeMois=moisVu===moisDe(auj);
 return `<div class="titre"><h2>Carnet de caisse · ${moisTxt(moisVu)}</h2><input class="champ" id="mois" type="month" value="${moisVu}" max="${moisDe(auj)}" style="width:auto"></div>
 <div class="deux" style="align-items:start">
 <div class="tab-wrap"><table class="t carnet"><thead><tr><th>Date</th><th>Libellé</th><th>Recettes</th><th>Entrée caisse</th><th>Sortie caisse</th></tr></thead><tbody>
  <tr><td></td><td>Report : <button class="lien" id="report">${eur(rep)}</button></td><td></td><td>${nb(rep)}</td><td></td></tr>
  ${lignes.map(l=>l.jour?`<tr class="jour"><td></td><td>${esc(l.lib)}</td><td>${nb(l.rec)}</td><td>${nb(l.ent)}</td><td>${nb(l.sor)}</td></tr>`:`<tr class="${l.client?"new":""} ${l.vid||l.sid?"cl":""} ${l.annule?"annule":""} ${l.corr?"corr":""}" ${l.vid?`data-v="${l.vid}"`:l.sid&&!l.annule&&!l.corr?`data-s="${l.sid}"`:""}><td>${l.date?dateBe(l.date).slice(0,5):""}</td>
   <td>${esc(l.lib)}${l.ref?` <span class="muted">${esc(l.ref)}</span>`:""}</td><td>${l.recTxt?esc(l.recTxt):nb(l.rec)}</td><td>${l.ent!=null?nb(l.ent):"—"}</td><td>${l.sor!=null?nb(l.sor):"—"}</td></tr>`).join("")||'<tr><td colspan="5" class="vide">Aucune vente ce mois-ci.</td></tr>'}
  <tr class="tot"><td></td><td>Totaux</td><td>${nb(t.rec)}</td><td>${nb(t.ent)}</td><td>${nb(t.sor)}</td></tr></tbody></table></div>
 <div style="display:flex;flex-direction:column;gap:14px">
 ${estCeMois?`<div class="carte"><div class="solde"><span>Solde de caisse</span><span>${eur(t.solde)}</span></div>
  <p class="muted" style="margin:4px 0 12px">Report + entrées − sorties. Les pourboires vont dans le cochon.</p>
  <label class="f">Argent compté dans la caisse aujourd'hui<input class="champ" id="compte" inputmode="decimal" placeholder="Billets + pièces" value="${virg(cpt)}"></label>
  <div id="ecart">${ecartHtml(cpt,t.solde)}</div>
  <div class="grille-f" style="margin-top:14px"><label class="f">Sortie de caisse<input class="champ" id="sLib" value="Dépôt banque"></label><label class="f">Montant<input class="champ" id="sMt" inputmode="decimal" placeholder="€"></label></div>
  <button class="btn clair petit" id="sOk" style="margin-top:8px">Enregistrer la sortie</button></div>`:""}
 <div class="carte"><table class="t"><tbody><tr><td>Clients (passages caisse)</td><td class="r">${t.clients}</td></tr><tr><td>Recettes</td><td class="r">${eur(t.rec)}</td></tr>
  <tr><td>dont TVA 21 %</td><td class="r">${eur(t.tva)}</td></tr><tr class="tot"><td>Solde de la caisse</td><td class="r">${eur(t.solde)}</td></tr></tbody></table>
  <p class="muted">Recettes : sans les ventes sur facture (n° noté à la place). Cliquez une ligne pour voir le ticket.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn clair petit" id="csvMois">Carnet du mois (tableur)</button><button class="btn clair petit" id="prMois">Imprimer</button></div></div>
 </div></div>`}
function brancherCarnet(){
 $("#mois").onchange=e=>{if(e.target.value){moisVu=e.target.value;render()}};
 const c=$("#compte");if(c)c.oninput=async()=>{const k="compte-"+jour(),v=num(c.value);await putSet(k,v);$("#ecart").innerHTML=ecartHtml(v,carnet(moisVu).t.solde)};
 const sk=$("#sOk");if(sk)sk.onclick=async()=>{const mt=num($("#sMt").value);if(!(mt>0)){toast("Indiquez le montant",true);return}
  const now=new Date(),s={id:"S"+now.getTime(),date:jour(now),ts:now.getTime(),lib:$("#sLib").value.trim()||"Sortie de caisse",montant:mt};
  await put("sorties",s);sorties.push(s);render();toast("Sortie enregistrée")};
 $("#report").onclick=async()=>{const v=prompt("Solde de la caisse au départ du mois (report) :",nb(report(moisVu)));if(v==null)return;await putSet("report-"+moisVu,num(v));render()};
 $$("[data-v]").forEach(b=>b.onclick=()=>montrerTicket(ventes.find(v=>v.id===b.dataset.v)));
 $$("[data-s]").forEach(b=>b.onclick=async()=>{const s=sorties.find(x=>x.id===b.dataset.s);
  if(!confirm(`Annuler la sortie « ${s.lib} » de ${eur(s.montant)} ?`))return;s.annulee=true;await put("sorties",s);render()});
 $("#csvMois").onclick=()=>telecharger(`carnet-de-caisse-${moisVu}.csv`,csvCarnet(moisVu));
 $("#prMois").onclick=()=>imprimer(`<h2>Carnet de caisse · ${moisTxt(moisVu)}</h2>`+$(".carnet").outerHTML)}

// ---------- Rapports : statistiques, compta, Intradel, Impulsion, site ----------
let rap="stats",rDu="",rAu="",chPoids="m",chHist=true;
const venduesTout=()=>ventes.filter(v=>!v.annulee).concat(chHist?HIST:[]);
const kgLigne=l=>l.remise||l.bon?0:l.kg==null?null:r2(l.kg*l.q);
const catLigne=l=>{if(l.remise)return "Réductions";if(l.bon)return "Bons d'achat";if(/^livraison$/i.test(l.n)&&!l.r)return "Livraison";const c=l.c||(parRef(l.id)||{}).c||((l.r||"").match(/^[A-Z]+/)||[""])[0];return catLabel(c)||(c?c:"Sans fiche")};
const JOURS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
function moisListe(n){const m=[];let x=moisDe(jour());for(let i=0;i<n;i++){m.unshift(x);x=moisAvant(x)}return m}
function hbars(rows,fmt){const mx=Math.max(...rows.map(r=>r[1]),0)||1;
 return rows.map(([lab,v])=>`<div class="hb"><span class="lab">${esc(lab)}</span><span class="trk"><i style="width:${(100*Math.max(v,0)/mx).toFixed(1)}%"></i></span><span class="val">${fmt(v)}</span></div>`).join("")||'<div class="vide">Rien sur la période.</div>'}
function cols(M,fmt){const mx=Math.max(...M.map(x=>x[1]))||1;
 return `<div class="cols">${M.map(([m,v],i)=>`<button data-tip="${esc(moisTxt(m))} : ${fmt(v)}" class="${i===M.length-1?"sel":""}" aria-label="${esc(moisTxt(m))} : ${fmt(v)}"><i style="height:${(100*v/mx).toFixed(1)}%"></i></button>`).join("")}</div>
 <div class="mois">${M.map(([m])=>`<span>${new Date(m+"-15T12:00").toLocaleDateString("fr-BE",{month:"short"})}</span>`).join("")}</div><div class="tip">${esc(moisTxt(M[M.length-1][0]))} : ${fmt(M[M.length-1][1])}</div>`}
// Période choisie (du / au). Par défaut : le mois en cours.
function periode(){const d=rDu||jour().slice(0,8)+"01",a=rAu||jour();return [d,a]}
const dansPeriode=d=>{const [x,y]=periode();return d>=x&&d<=y};
function choixPeriode(){const auj=jour(),y=auj.slice(0,4),m=moisDe(auj),pm=moisAvant(m),tri=Math.floor((+auj.slice(5,7)-1)/3);
 const fin=mm=>{const d=new Date(+mm.slice(0,4),+mm.slice(5,7),0);return jour(d)};
 const P={"Ce mois":[m+"-01",auj],"Mois passé":[pm+"-01",fin(pm)],"Ce trimestre":[y+"-"+String(tri*3+1).padStart(2,"0")+"-01",auj],[y]:[y+"-01-01",auj],"Tout":["2000-01-01",auj]};
 const [d,a]=periode();
 return `<div class="outils no-print">${Object.entries(P).map(([t,[x,z]])=>`<button class="chip ${d===x&&a===z?"sel":""}" data-per="${x}|${z}">${t}</button>`).join("")}
  <label class="muted">du <input class="champ" type="date" id="rDu" value="${d}" style="width:auto;display:inline-block"></label><label class="muted">au <input class="champ" type="date" id="rAu" value="${a}" style="width:auto;display:inline-block"></label></div>`}
const perTxt=()=>{const [d,a]=periode();return d<="2000-01-01"?"toutes les ventes enregistrées":`du ${dateBe(d)} au ${dateBe(a)}`};
const enTete=t=>`<div class="print-only" style="margin-bottom:10px"><img src="https://www.la-pile.be/img/logo-main.svg" alt="" style="height:40px" onerror="this.remove()"><h2>${t}</h2><p class="muted">Comptoir des Matériaux · La Pile asbl · ${perTxt()} · édité le ${dateBe(jour())}</p></div>`;
const RAPPORTS={stats:["Statistiques","ventes, poids, catégories"],compta:["Comptabilité","journal des recettes, TVA, Z du jour"],intradel:["Intradel","tonnages réemployés et déchets"],impulsion:["Impulsion","stock à jour, articles à retirer"],site:["Site","stock pour le site du Comptoir"]};
function ecranRapports(){return `<div class="rapports"><nav class="menu-r">${Object.entries(RAPPORTS).map(([k,[t,s]])=>`<button data-rap="${k}" class="${rap===k?"sel":""}">${t}<small>${s}</small></button>`).join("")}</nav>
 <section class="carte">${({stats:rStats,compta:rCompta,intradel:rIntradel,impulsion:rImpulsion,site:rSite}[rap])()}</section></div>`}
function brancherRapports(){$$("[data-rap]").forEach(b=>b.onclick=()=>{rap=b.dataset.rap;render()});
 $$("[data-per]").forEach(b=>b.onclick=()=>{[rDu,rAu]=b.dataset.per.split("|");render()});
 const d=$("#rDu");if(d)d.onchange=()=>{rDu=d.value;render()};const a=$("#rAu");if(a)a.onchange=()=>{rAu=a.value;render()};
 $$("[data-chpoids]").forEach(b=>b.onclick=()=>{chPoids=b.dataset.chpoids;render()});
 const h=$("#chHist");if(h)h.onchange=()=>{chHist=h.checked;render()};
 $$(".cols").forEach(c=>{const tip=c.parentNode.querySelector(".tip");c.querySelectorAll("[data-tip]").forEach(b=>b.onclick=()=>{c.querySelectorAll("button").forEach(x=>x.classList.remove("sel"));b.classList.add("sel");tip.textContent=b.dataset.tip})});
 $$("[data-dl]").forEach(b=>b.onclick=()=>EXPORTS[b.dataset.dl]());
 $$("[data-tk]").forEach(r=>r.onclick=()=>{const v=ventes.find(x=>x.id===r.dataset.tk);if(v)montrerTicket(v,false)});
 const p=$("#imprimer");if(p)p.onclick=()=>print()}
const actions=(...l)=>`<div class="outils no-print" style="margin-top:14px">${l.map(([k,t])=>`<button class="btn clair petit" data-dl="${k}">${t}</button>`).join("")}<button class="btn petit" id="imprimer">Imprimer / PDF</button></div>`;

function rStats(){const V=venduesTout().filter(v=>dansPeriode(v.date));
 const ca=r2(V.reduce((t,v)=>t+v.total,0)),cl=V.length,art=V.reduce((t,v)=>t+v.lignes.reduce((s,l)=>s+(l.remise||l.bon?0:qSaisie(l)?1:l.q),0),0);
 const parCat={},parJour=JOURS.map(j=>[j,0]),parMode={},parPoids={};let kg=0,sansPoids=0;
 V.forEach(v=>{parJour[(new Date(v.date+"T12:00").getDay()+6)%7][1]++;parMode[MODES[v.mode]]=r2((parMode[MODES[v.mode]]||0)+v.total);
  v.lignes.forEach(l=>{const c=catLigne(l);parCat[c]=r2((parCat[c]||0)+l.p*l.q);if(c==="Livraison"||l.remise||l.bon)return;const k=kgLigne(l);if(k==null){sansPoids++;return}
   kg+=k;const g=chPoids==="m"?(l.m||"Non précisée"):c;parPoids[g]=r2((parPoids[g]||0)+k)})});
 const TOUT=venduesTout(),M=moisListe(12).map(m=>[m,r2(TOUT.filter(v=>moisDe(v.date)===m).reduce((t,v)=>t+v.total,0))]),
  MK=moisListe(12).map(m=>[m,r2(TOUT.filter(v=>moisDe(v.date)===m).reduce((t,v)=>t+v.lignes.reduce((s,l)=>s+(kgLigne(l)||0),0),0))]);
 const s=Object.entries;
 return `${enTete("Statistiques de vente")}<div class="titre"><h2>Statistiques</h2></div>${choixPeriode()}
 ${HIST.length?`<label class="muted no-print" style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="chHist" ${chHist?"checked":""}> Compter le carnet papier recopié (janvier à septembre 2026)</label>`:""}
 <div class="tuiles"><div class="tuile b"><b>${eur0(ca)}</b><span>vendu TVAc (${eur0(htva(ca))} HTVA)</span></div><div class="tuile"><b>${cl}</b><span>tickets</span></div>
  <div class="tuile"><b>${cl?eur(ca/cl):"–"}</b><span>panier moyen</span></div><div class="tuile"><b>${art}</b><span>articles vendus</span></div>
  <div class="tuile v"><b>${kgTxt(kg)}</b><span>réemployés${sansPoids?` (+ ${sansPoids} ligne${sansPoids>1?"s":""} sans poids)`:""}</span></div></div>
 <div class="deux"><div><div class="sec">Ventes par mois (12 derniers)</div>${cols(M,v=>eur0(v))}</div><div><div class="sec">Poids vendu par mois</div>${cols(MK,kgTxt)}</div></div>
 <div class="deux"><div><div class="sec">Poids vendu <span class="no-print"><button class="chip ${chPoids==="m"?"sel":""}" data-chpoids="m">par matière</button> <button class="chip ${chPoids==="c"?"sel":""}" data-chpoids="c">par catégorie</button></span></div>${hbars(s(parPoids).sort((a,b)=>b[1]-a[1]),kgTxt)}</div>
  <div><div class="sec">Ventes par catégorie</div>${hbars(s(parCat).sort((a,b)=>b[1]-a[1]),eur0)}</div></div>
 <div class="deux"><div><div class="sec">Tickets par jour de la semaine</div>${hbars(parJour.filter(([j,n])=>n||j!=="Dimanche"),String)}</div>
  <div><div class="sec">Paiement</div>${hbars(s(parMode).sort((a,b)=>b[1]-a[1]),eur0)}</div></div>
 ${actions(["poids","Poids par mois, matière et catégorie (tableur)"],["articles","Articles vendus (tableur)"])}
 <p class="muted">Poids pesés à l'encodage, sinon estimés d'après la matière et les mesures, ou le type d'article ; corrigeables à la vente.</p>`}

// Comptabilité : journal des recettes (un ticket par ligne) et récapitulatif par jour (Z de caisse).
// Format standard en attendant le modèle de la comptable.
function compta(){const V=ventes.filter(v=>!v.annulee&&dansPeriode(v.date)).sort((a,b)=>a.ts-b.ts),J={};
 V.forEach(v=>{const j=J[v.date]=J[v.date]||{n:0,especes:0,carte:0,virement:0,facture:0,bon:0,tot:0,ht:0,tva:0};const T=tvaV(v);j.n++;
  if(v.mode!=="bon")j[v.mode]=r2(j[v.mode]+aPayerV(v));if(v.bon)j.bon=r2(j.bon+v.bon.mt);j.tot=r2(j.tot+v.total);j.ht=r2(j.ht+T.ht);j.tva=r2(j.tva+T.tva)});
 const S=sorties.filter(s=>!s.annulee&&dansPeriode(s.date));return {V,J,S}}
function rCompta(){const {V,J,S}=compta(),T={especes:0,carte:0,virement:0,facture:0,bon:0,tot:0,ht:0,tva:0};Object.values(J).forEach(j=>{for(const k in T)T[k]+=j[k]});
 const att=V.filter(v=>v.mode==="facture"&&v.facture.paye==="attente");
 return `${enTete("Journal des recettes")}<div class="titre"><h2>Comptabilité</h2></div>${choixPeriode()}
 <div class="tuiles"><div class="tuile b"><b>${eur(T.tot)}</b><span>recettes TVAc</span></div><div class="tuile"><b>${eur(T.ht)}</b><span>base HTVA</span></div>
  <div class="tuile"><b>${eur(T.tva)}</b><span>TVA 21 %</span></div><div class="tuile j"><b>${eur(S.reduce((t,s)=>t+s.montant,0))}</b><span>sorties de caisse (dépôts)</span></div></div>
 <div class="sec">Récapitulatif par jour (Z de caisse)</div>
 <div class="tab-wrap"><table class="t"><thead><tr><th>Date</th><th class="r">Tickets</th><th class="r">Espèces</th><th class="r">QR code</th><th class="r">Virement</th><th class="r">Facture</th><th class="r">Bon d'achat</th><th class="r">Total TVAc</th><th class="r">HTVA</th><th class="r">TVA 21 %</th></tr></thead><tbody>
 ${Object.entries(J).map(([d,j])=>`<tr><td>${dateBe(d)}</td><td class="r">${j.n}</td><td class="r">${nb(j.especes)}</td><td class="r">${nb(j.carte)}</td><td class="r">${nb(j.virement)}</td><td class="r">${nb(j.facture)}</td><td class="r">${nb(j.bon)}</td><td class="r"><b>${nb(j.tot)}</b></td><td class="r">${nb(j.ht)}</td><td class="r">${nb(j.tva)}</td></tr>`).join("")||'<tr><td colspan="10" class="vide">Aucune vente sur la période.</td></tr>'}
 <tr class="tot"><td>Total</td><td class="r">${V.length}</td><td class="r">${nb(T.especes)}</td><td class="r">${nb(T.carte)}</td><td class="r">${nb(T.virement)}</td><td class="r">${nb(T.facture)}</td><td class="r">${nb(T.bon)}</td><td class="r">${nb(T.tot)}</td><td class="r">${nb(T.ht)}</td><td class="r">${nb(T.tva)}</td></tr></tbody></table></div>
 <div class="sec">Journal des recettes</div>
 <div class="tab-wrap"><table class="t"><thead><tr><th>Date</th><th>Ticket</th><th>Articles</th><th>Paiement</th><th>Facture</th><th class="r">TVAc</th><th class="r">HTVA</th><th class="r">TVA</th></tr></thead><tbody>
 ${V.map(v=>`<tr class="cl" data-tk="${v.id}"><td>${dateBe(v.date)} ${v.heure}</td><td>${v.num}</td><td>${esc(v.lignes.map(l=>l.n).join(", ").slice(0,70))}</td><td>${esc(modeTxt(v))}</td><td>${v.facture?esc(v.facture.num)+(v.facture.client&&v.facture.client.nom?" · "+esc(v.facture.client.nom):"")+(v.facture.paye==="attente"?' <span class="pill jaune">à encaisser</span>':""):""}</td>
  <td class="r">${nb(v.total)}</td><td class="r">${nb(tvaV(v).ht)}</td><td class="r">${nb(tvaV(v).tva)}</td></tr>`).join("")||'<tr><td colspan="8" class="vide">Aucune vente sur la période.</td></tr>'}</tbody></table></div>
 ${S.length?`<div class="sec">Sorties de caisse</div><div class="tab-wrap"><table class="t"><tbody>${S.map(s=>`<tr><td>${dateBe(s.date)}</td><td>${esc(s.lib)}</td><td class="r">${nb(s.montant)}</td></tr>`).join("")}</tbody></table></div>`:""}
 ${att.length?`<p class="muted"><b>${att.length} facture${att.length>1?"s":""} en attente de paiement</b> : ${att.map(v=>esc(v.facture.num)+" ("+eur(v.total)+")").join(", ")}.</p>`:""}
 ${facturesHtml(V)}
 ${bonsHtml()}
 ${actions(["factures","Factures pour la compta (tableur)"],["journal","Journal des recettes (tableur)"],["z","Récapitulatif par jour (tableur)"])}
 <p class="muted">Format standard en attendant le modèle de la comptabilité : il sera adapté dès réception. Toutes les ventes sont à 21 % TVA comprise.</p>`}

// Factures de la période : la liste à envoyer à la comptabilité chaque mois (période « Mois passé »).
function facturesHtml(V){const F=V.filter(v=>v.facture);if(!F.length)return "";
 return `<div class="sec">Factures à transmettre (${F.length})</div><div class="tab-wrap"><table class="t"><thead><tr><th>N°</th><th>Date</th><th>Client</th><th>N° TVA</th><th class="r">HTVA</th><th class="r">TVA</th><th class="r">TVAc</th><th>Paiement</th></tr></thead><tbody>
 ${F.map(v=>{const c=v.facture.client||{},T=tvaV(v);return `<tr class="cl" data-tk="${v.id}"><td>${esc(v.facture.num)}</td><td>${dateBe(v.date)}</td><td>${esc(c.nom||"?")}${c.loc?`<br><small class="muted">${esc(c.loc)}</small>`:""}</td><td>${esc(c.tva||"")}</td>
  <td class="r">${nb(T.ht)}</td><td class="r">${nb(T.tva)}</td><td class="r">${nb(T.ttc)}</td><td>${{banque:"payée par banque",especes:"payée en espèces",attente:'<span class="pill jaune">en attente</span>'}[v.facture.paye]||""}</td></tr>`}).join("")}</tbody></table></div>`}
// Bons d'achat : tous ceux vendus ou utilisés, avec ce qu'il reste (toutes périodes).
function bonsHtml(){const B=Object.values(bonsTous());if(!B.length)return "";
 return `<div class="sec">Bons d'achat</div><div class="tab-wrap"><table class="t"><thead><tr><th>N°</th><th>Vendu le</th><th class="r">Montant</th><th class="r">Utilisé</th><th class="r">Reste</th></tr></thead><tbody>
 ${B.map(b=>`<tr><td>${esc(b.num)}</td><td>${b.emis?dateBe(b.emis):"bon papier"}</td><td class="r">${b.montant==null?"?":nb(b.montant)}</td><td class="r">${nb(b.utilise)}</td><td class="r"><b>${b.montant==null?"?":nb(b.montant-b.utilise)}</b></td></tr>`).join("")}</tbody></table></div>
 <p class="muted">Bon d'achat vendu : encaissé sans TVA ; la TVA est comptée quand il sert à payer des articles.</p>`}
// Intradel : tonnages réemployés (vendus) et sortis comme déchets, par matière, sur la période.
function intradel(){const T={};const add=(m,k,v)=>{const x=T[m]=T[m]||{vendu:0,don:0,interne:0,dechet:0,retour:0,autre:0,n:0,sans:0};x[k]+=v};
 ventes.filter(v=>!v.annulee&&dansPeriode(v.date)).forEach(v=>v.lignes.forEach(l=>{if(/^livraison$/i.test(l.n)&&!l.r||l.remise||l.bon)return;const m=l.m||"Non précisée",k=kgLigne(l);
  if(k==null)T[m]=T[m]||{vendu:0,don:0,interne:0,dechet:0,retour:0,autre:0,n:0,sans:0},T[m].sans++;else add(m,"vendu",k);T[m].n+=qSaisie(l)?1:l.q}));
 MVT.filter(x=>!x.annule&&x.type==="sortie"&&dansPeriode(x.date)).forEach(x=>{const a=parRef(x.r)||{};const m=a.m||"Non précisée";if(a.kg!=null)add(m,x.motif||"autre",r2(a.kg*x.q))});
 if(chHist)HIST.filter(v=>dansPeriode(v.date)).forEach(v=>v.lignes.forEach(l=>{if(l.kg!=null&&l.m)add(l.m,"vendu",l.kg*l.q)}));
 return T}
function rIntradel(){const T=intradel(),L=Object.entries(T).sort((a,b)=>b[1].vendu-a[1].vendu),tot=k=>L.reduce((t,[,x])=>t+x[k],0);
 const remp=tot("vendu")+tot("don")+tot("interne");
 return `${enTete("Tonnages réemployés et déchets")}<div class="titre"><h2>Intradel</h2></div>${choixPeriode()}
 ${HIST.length?`<label class="muted no-print" style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="chHist" ${chHist?"checked":""}> Compter le carnet papier recopié (janvier à septembre 2026, poids estimés)</label>`:""}
 <div class="tuiles"><div class="tuile v"><b>${kgTxt(remp)}</b><span>réemployés (vendus, donnés, utilisés)</span></div><div class="tuile b"><b>${kgTxt(tot("vendu"))}</b><span>vendus</span></div>
  <div class="tuile j"><b>${kgTxt(tot("dechet"))}</b><span>sortis comme déchets</span></div><div class="tuile"><b>${kgTxt(tot("retour"))}</b><span>rendus au donateur</span></div></div>
 <div class="tab-wrap"><table class="t"><thead><tr><th>Matière</th><th class="r">Vendu (kg)</th><th class="r">Donné (kg)</th><th class="r">Usage interne (kg)</th><th class="r">Réemployé (kg)</th><th class="r">Déchet (kg)</th><th class="r">Pièces vendues</th><th class="r">Lignes sans poids</th></tr></thead><tbody>
 ${L.map(([m,x])=>`<tr><td>${esc(m)}</td><td class="r">${nb(x.vendu)}</td><td class="r">${nb(x.don)}</td><td class="r">${nb(x.interne)}</td><td class="r"><b>${nb(x.vendu+x.don+x.interne)}</b></td><td class="r">${nb(x.dechet)}</td><td class="r">${virg(r2(x.n))}</td><td class="r">${x.sans||""}</td></tr>`).join("")||'<tr><td colspan="8" class="vide">Rien sur la période.</td></tr>'}
 <tr class="tot"><td>Total</td><td class="r">${nb(tot("vendu"))}</td><td class="r">${nb(tot("don"))}</td><td class="r">${nb(tot("interne"))}</td><td class="r">${nb(remp)}</td><td class="r">${nb(tot("dechet"))}</td><td class="r">${virg(r2(tot("n")))}</td><td class="r">${tot("sans")||""}</td></tr></tbody></table></div>
 ${actions(["intradel","Tonnages par matière (tableur)"],["poids","Détail par mois et catégorie (tableur)"])}
 <p class="muted">Poids pesés à l'encodage, sinon estimés (masse volumique × mesures, ou poids moyen du type d'article). Les sorties « casse / déchet » se notent dans la fiche article (Stock). Format standard en attendant le modèle d'Intradel.</p>`}

function rImpulsion(){const vendus={};ventes.filter(v=>!v.annulee&&dansPeriode(v.date)).forEach(v=>v.lignes.forEach(l=>{if(l.id)vendus[l.id]=(vendus[l.id]||0)+l.q}));
 const aRetirer=Object.keys(vendus).map(parRef).filter(a=>a&&(reste(a)??1)<=0);
 const modifs=Object.values(ARTS).filter(o=>o.modifie&&dansPeriode(jour(new Date(o.modifie))));
 return `${enTete("Mises à jour pour Impulsion")}<div class="titre"><h2>Impulsion</h2></div>${choixPeriode()}
 <p class="muted">Impulsion n'est pas modifié par la caisse : ces listes servent à reporter les changements à la main (ou par l'import) le jeudi.</p>
 <div class="sec">À mettre hors ligne / VENDU (${aRetirer.length})</div>
 <div class="tab-wrap"><table class="t"><thead><tr><th>Référence</th><th>Article</th><th class="r">Vendu sur la période</th><th>Emplacement</th></tr></thead><tbody>
 ${aRetirer.map(a=>`<tr class="cl" data-art2="${esc(a.r)}"><td><b>${esc(refAff(a))}</b></td><td>${esc(a.n)}</td><td class="r">${virg(vendus[a.r])}</td><td>${esc(a.e||"")}</td></tr>`).join("")||'<tr><td colspan="4" class="vide">Aucun article épuisé sur la période.</td></tr>'}</tbody></table></div>
 <div class="sec">Fiches créées ou modifiées ici (${modifs.length})</div>
 <div class="tab-wrap"><table class="t"><tbody>${modifs.map(o=>`<tr><td><b>${esc(o.r)}</b></td><td>${esc(o.n||"")}</td><td>${o.src?"nouvelle fiche":"modifiée"} le ${dateBe(jour(new Date(o.modifie||o.cree)))}</td></tr>`).join("")||'<tr><td class="vide">Aucune.</td></tr>'}</tbody></table></div>
 ${actions(["stock","Stock à jour, tous les articles (tableur)"],["retirer","Articles à retirer (tableur)"])}`}

// Site : fichier de stock lu par le site du Comptoir (référence, stock, prix, statut, emplacement).
function stockSite(){return {maj:new Date().toISOString(),articles:CAT.filter(a=>!a.x).map(a=>({r:a.r,s:reste(a),p:a.p||0,u:a.u||"pièce",e:a.e||"",st:statut(a),n:a.src?a.n:undefined}))}}
function rSite(){const S=stockSite(),n=k=>S.articles.filter(a=>a.st===k).length;
 return `<div class="titre"><h2>Site du Comptoir</h2></div>
 <p>Le site affiche le stock à partir du fichier <b>stock.json</b> produit ici : articles vendus retirés, quantités et prix à jour, nouvelles fiches ajoutées.</p>
 <div class="tuiles"><div class="tuile b"><b>${n("ok")}</b><span>en stock</span></div><div class="tuile v"><b>${n("vendu")}</b><span>vendus</span></div><div class="tuile"><b>${n("rupture")}</b><span>plus en stock</span></div><div class="tuile j"><b>${n("hors")}</b><span>hors ligne</span></div></div>
 ${actions(["site","Télécharger stock.json"])}
 <p class="muted">${syncPret()?"Envoi automatique au site activé : ce fichier est publié après chaque vente ou mouvement.":"Cet appareil n'est pas encore relié au site : réglez la liaison dans Réglages. En attendant, ce fichier peut être déposé à la main dans le dossier comptoir du site."}</p>`}

// ---------- Fichiers pour tableur (Excel belge : « ; », virgule décimale, Windows-1252) ----------
const qv=v=>{v=String(v??"");return /[;"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const dec=n=>n==null?"":r2(n).toFixed(2).replace(".",",");
const csv=rows=>rows.map(r=>r.map(qv).join(";")).join("\r\n")+"\r\n";
const CP={0x20AC:0x80,0x201A:0x82,0x192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x2C6:0x88,0x2030:0x89,0x160:0x8A,0x2039:0x8B,0x152:0x8C,0x17D:0x8E,
 0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2DC:0x98,0x2122:0x99,0x161:0x9A,0x203A:0x9B,0x153:0x9C,0x17E:0x9E,0x178:0x9F};
function cp1252(s){const out=new Uint8Array(s.length);let n=0;for(const ch of s){const c=ch.codePointAt(0);out[n++]=c<0x80||(c>=0xA0&&c<=0xFF)?c:(CP[c]??0x3F)}return out.slice(0,n)}
async function telecharger(nom,txt,type){const f=new File([type?txt:cp1252(txt)],nom,{type:type||"text/csv"});
 const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=nom;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
const perNom=()=>{const [d,a]=periode();return d<="2000-01-01"?"tout":d+"_"+a};
function csvCarnet(m){const {lignes,t,rep}=carnet(m),rows=[["N°","Date","Libellé","Recettes","Entrée caisse","Sortie caisse"],["","","report :","",dec(rep),""]];
 let n=0;lignes.forEach(l=>rows.push([l.jour?"":++n,l.date?dateBe(l.date):"",l.lib+(l.ref?" "+l.ref:"")+(l.annule?" (annulé plus loin)":""),l.recTxt||dec(l.rec),dec(l.ent),dec(l.sor)]));
 rows.push(["","","TOTAUX du mois",dec(t.rec),dec(t.ent),dec(t.sor)],["","","Solde de la caisse du mois","","",dec(t.solde)]);return csv(rows)}
const EXPORTS={
 articles(){const rows=[["Date","Ticket","Référence","Article","Quantité","Unité","Prix unitaire TVAc","Total ligne","Paiement","Statut"]];
  ventes.filter(v=>dansPeriode(v.date)).sort((a,b)=>a.ts-b.ts).forEach(v=>v.lignes.forEach(l=>rows.push([dateBe(v.date),v.num,l.r,l.n,virg(l.q),l.u||"pièce",dec(l.p),dec(l.p*l.q),modeTxt(v),v.annulee?"annulée":""])));
  telecharger(`articles-vendus-${perNom()}.csv`,csv(rows))},
 poids(){const t={};venduesTout().filter(v=>dansPeriode(v.date)).forEach(v=>v.lignes.forEach(l=>{if(/^livraison$/i.test(l.n)&&!l.r||l.remise||l.bon)return;
   const k=[moisDe(v.date),l.m||"Non précisée",catLigne(l)].join("|"),x=t[k]=t[k]||{kg:0,n:0,est:0,sans:0,eur:0};
   x.n+=qSaisie(l)?1:l.q;x.eur+=l.p*l.q;const p=kgLigne(l);if(p==null)x.sans++;else{x.kg+=p;if(l.kgEst)x.est+=p}}));
  const rows=[["Mois","Matière","Catégorie","Poids (kg)","dont estimé (kg)","Articles","Lignes sans poids","Vendu TVAc"]];
  Object.keys(t).sort().forEach(k=>{const[m,ma,c]=k.split("|"),x=t[k];rows.push([m.split("-").reverse().join("/"),ma,c,dec(x.kg),dec(x.est),virg(r2(x.n)),x.sans,dec(x.eur)])});
  telecharger(`poids-vendu-${perNom()}.csv`,csv(rows))},
 journal(){const {V}=compta(),rows=[["Date","Heure","Ticket","Articles","Paiement","N° facture","Client facture","Facture payée","Bon d'achat utilisé","Montant bon","Total TVAc","Base HTVA","TVA 21 %"]];
  V.forEach(v=>{const T=tvaV(v);rows.push([dateBe(v.date),v.heure,v.num,v.lignes.map(l=>(l.r?l.r+" ":"")+l.n).join(" + "),modeTxt(v),v.facture?v.facture.num:"",v.facture&&v.facture.client?v.facture.client.nom||"":"",v.facture?v.facture.paye:"",v.bon?v.bon.num:"",v.bon?dec(v.bon.mt):"",dec(v.total),dec(T.ht),dec(T.tva)])});
  telecharger(`journal-recettes-${perNom()}.csv`,csv(rows))},
 factures(){const {V}=compta(),rows=[["N° facture","Date","Client","Adresse","Code postal et localité","N° TVA / entreprise","E-mail","Téléphone","Articles","Base HTVA","TVA 21 %","Total TVAc","Paiement","Ticket"]];
  V.filter(v=>v.facture).forEach(v=>{const c=v.facture.client||{},T=tvaV(v);rows.push([v.facture.num,dateBe(v.date),c.nom||"",c.adr||"",c.loc||"",c.tva||"",c.mail||"",c.tel||"",
   v.lignes.map(l=>(l.remise?"":virg(l.q)+" × ")+(l.r?l.r+" ":"")+l.n+" : "+dec(l.p*l.q)).join(" + "),dec(T.ht),dec(T.tva),dec(T.ttc),{banque:"payée par banque",especes:"payée en espèces",attente:"en attente"}[v.facture.paye]||"",v.num])});
  telecharger(`factures-${perNom()}.csv`,csv(rows))},
 z(){const {J,S}=compta(),rows=[["Date","Tickets","Espèces","QR code","Virement","Facture","Bon d'achat","Total TVAc","Base HTVA","TVA 21 %","Sorties de caisse"]];
  Object.entries(J).forEach(([d,j])=>rows.push([dateBe(d),j.n,dec(j.especes),dec(j.carte),dec(j.virement),dec(j.facture),dec(j.bon),dec(j.tot),dec(j.ht),dec(j.tva),dec(S.filter(s=>s.date===d).reduce((t,s)=>t+s.montant,0))]));
  telecharger(`recap-jour-${perNom()}.csv`,csv(rows))},
 intradel(){const T=intradel(),rows=[["Matière","Vendu (kg)","Donné (kg)","Usage interne (kg)","Réemployé total (kg)","Déchet (kg)","Rendu au donateur (kg)","Pièces vendues","Lignes sans poids"]];
  Object.entries(T).forEach(([m,x])=>rows.push([m,dec(x.vendu),dec(x.don),dec(x.interne),dec(x.vendu+x.don+x.interne),dec(x.dechet),dec(x.retour),virg(r2(x.n)),x.sans]));
  telecharger(`intradel-tonnages-${perNom()}.csv`,csv(rows))},
 stock(){const rows=[["Référence","Nom","Catégorie","Emplacement","Stock de départ","Vendu (caisse)","Compté le","Stock actuel","Unité","Prix TVAc","Valeur","Matière","Poids unitaire (kg)","Statut","Origine"]];
  CAT.forEach(a=>{const S=STK[a.r]||{},r=reste(a);rows.push([refAff(a),a.n,catLabel(a.c)||a.c||"",a.e||"",virg(a.s),virg(S.vendu||0),S.compte?dateBe(jour(new Date(S.compte))):"",virg(r),a.u||"pièce",dec(a.p),r>0?dec(r*(a.p||0)):"",a.m||"",a.kg==null?"":dec(a.kg)+(a.kgEst?" (estimé)":""),STATUTS[statut(a)][0],a.src?"fiche "+a.src:"export Impulsion"])});
  telecharger(`stock-a-jour-${jour()}.csv`,csv(rows))},
 retirer(){const v={};ventes.filter(x=>!x.annulee&&dansPeriode(x.date)).forEach(x=>x.lignes.forEach(l=>{if(l.id)v[l.id]=1}));
  const rows=[["Référence","Nom","Emplacement","Stock actuel"]];Object.keys(v).map(parRef).filter(a=>a&&(reste(a)??1)<=0).forEach(a=>rows.push([refAff(a),a.n,a.e||"",virg(reste(a))]));
  telecharger(`a-mettre-hors-ligne-${perNom()}.csv`,csv(rows))},
 site(){telecharger("stock.json",JSON.stringify(stockSite()),"application/json")}};

// ---------- Réglages : sauvegarde, restauration ----------
function ecranReglages(){return `<div class="titre"><h2>Réglages</h2></div><div class="deux">
 <div class="carte"><h3>Sauvegarde</h3><p class="muted">Ventes, mouvements, fiches et réglages sont gardés dans ce navigateur, sur cet appareil. Faites une sauvegarde chaque semaine (clé USB ou Drive).</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="save">Télécharger une sauvegarde</button><button class="btn clair" id="restore">Restaurer une sauvegarde</button><input type="file" id="fRestore" accept=".json" hidden></div>
  <p class="muted">Dernière sauvegarde (manuelle ou automatique) : ${REG.derniereSauvegarde?dateBe(jour(new Date(REG.derniereSauvegarde))):"jamais"}.</p>
  <p class="muted">${stockageProtege?"Le navigateur s'est engagé à ne pas effacer ces données de lui-même.":"Le navigateur n'a pas garanti la conservation : gardez la caisse dans les favoris et faites les sauvegardes."} Attention : « Effacer les données de navigation » (cookies et données de sites) efface aussi la caisse.</p></div>
 <div class="carte"><h3>Douchette</h3><p class="muted">Scannez un QR d'étiquette ici pour tester :</p><input class="champ" id="testScan" placeholder="Cliquez puis scannez" autocomplete="off"><div id="testRes" class="muted" style="margin-top:8px"></div>
  <p class="muted">La douchette doit être réglée en clavier AZERTY (code dans son manuel). Si elle reste en QWERTY, la caisse corrige d'elle-même.</p></div>
 <div class="carte"><h3>Paiement par QR code</h3><p class="muted">Avec le mode « QR code », la caisse affiche un QR de virement avec le montant déjà rempli (norme européenne, lue par les apps des banques belges).</p>
  <label class="f">IBAN de La Pile<input class="champ" id="rIban" value="${esc(REG.iban||"")}" placeholder="BE00 0000 0000 0000" autocomplete="off"></label>
  <label class="f">Bénéficiaire<input class="champ" id="rBenef" value="${esc(REG.beneficiaire||"La Pile asbl")}"></label>
  <label class="f">BIC (facultatif)<input class="champ" id="rBic" value="${esc(REG.bic||"")}" placeholder="ex. GEBABEBB"></label><p class="muted" id="rIbanOk">${REG.iban?(ibanOk(REG.iban)?"IBAN valide.":"IBAN incorrect : vérifiez-le."):""}</p></div>
 ${carteSauvAuto()}
 ${carteSync()}
 <div class="carte"><h3>Factures</h3><label class="f">Dernier n° de facture utilisé<input class="champ" id="dFact" value="${esc(REG.derniereFacture||"")}" placeholder="ex. F49-26"></label></div>
 <div class="carte"><h3>À propos</h3><p class="muted">Caisse & stock ${VERSION} · ${CAT.length} articles (export Impulsion du 14/10/2026, annonces du site, fiches) · ${ventes.length} tickets · ${MVT.length} mouvements.</p></div></div>`}
function brancherReglages(){
 $("#save").onclick=async()=>{const d=donneesSauvegarde();
  telecharger(`sauvegarde-caisse-${jour()}.json`,JSON.stringify(d),"application/json");await putSet("derniereSauvegarde",Date.now());render()};
 $("#restore").onclick=()=>$("#fRestore").click();
 $("#fRestore").onchange=async e=>{const f=e.target.files[0];if(!f)return;let d;try{d=JSON.parse(await f.text())}catch(x){toast("Fichier illisible",true);return}
  if(!confirm(`Restaurer la sauvegarde du ${d.date?dateBe(d.date.slice(0,10)):"?"} ? Les ventes et mouvements absents d'ici sont ajoutés ; rien n'est effacé ni remplacé.`))return;
  // Même fusion que la synchro : une vente déjà ici n'est pas remplacée par sa copie plus ancienne.
  try{await fusionner({...d,appareil:"sauvegarde"})}catch(x){alert("La restauration s'est arrêtée en cours : "+(x&&x.message||x)+". Rien n'a été effacé.");return}
  location.reload()};
 const t=$("#testScan");t.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const r=lireCode(t.value);$("#testRes").innerHTML=r?`Reconnu : <b>${esc(r)}</b> · ${esc(parRef(r).n)}`:`Non reconnu : « ${esc(t.value)} »`;t.value=""}};
 brancherSauvAuto();
 $("#dFact").onchange=e=>putSet("derniereFacture",e.target.value.trim().toUpperCase());brancherSync();
 $("#rIban").onchange=async e=>{const v=ibanNet(e.target.value);await putSet("iban",v);$("#rIbanOk").textContent=v?(ibanOk(v)?"IBAN valide.":"IBAN incorrect : vérifiez-le."):""};
 $("#rBenef").onchange=e=>putSet("beneficiaire",e.target.value.trim()||"La Pile asbl");$("#rBic").onchange=e=>putSet("bic",e.target.value.trim())}

// Bandeau sous l'en-tête : dit si les ventes sont à l'abri, et sinon ce qu'il faut faire.
let stockageKo=false,stockageProtege=null;
function bandeau(){const el=$("#bandeau");if(!el)return;let t,mal=false;
 const j=REG.derniereSauvegarde?Math.floor((Date.now()-REG.derniereSauvegarde)/864e5):null;
 if(!stockageKo&&sauvAuto==="pause"){el.textContent="Sauvegarde automatique en pause depuis le redémarrage du navigateur : cliquez ici pour la réactiver.";el.classList.add("mal");el.style.cursor="pointer";return}
 el.style.cursor="";
 if(stockageKo){t="Stockage indisponible dans ce navigateur (fenêtre privée ?) : les ventes ne sont pas gardées. Notez-les dans le carnet papier.";mal=true}
 else if(syncPret())t=Sync.etat==="err"?"Liaison en erreur : les ventes sont gardées sur cet appareil, mais pas encore copiées. Voir Réglages.":"Version d'essai : les ventes sont gardées sur cet appareil et copiées dans le dépôt du Comptoir. Le carnet papier fait toujours foi.";
 else if(j==null||j>=7){t=`Version d'essai : les ventes ne sont gardées que dans ce navigateur. ${j==null?"Aucune sauvegarde faite":"Dernière sauvegarde il y a "+j+" jours"} : Réglages › Télécharger une sauvegarde.`;mal=ventes.length>0}
 else t="Version d'essai : les ventes sont gardées dans ce navigateur, dernière sauvegarde "+(j?"il y a "+j+" jour"+(j>1?"s":""):"aujourd'hui")+". Le carnet papier fait toujours foi.";
 el.textContent=t;el.classList.toggle("mal",mal)}

// ---------- Sauvegarde automatique dans un dossier (Chrome ou Edge sur PC) ----------
// Un fichier par jour, réécrit après chaque vente. Si le dossier est synchronisé (OneDrive, Google Drive),
// une copie quitte le PC sans rien faire. Après un redémarrage du navigateur, il faut parfois réautoriser d'un clic.
const donneesSauvegarde=()=>({version:VERSION,date:new Date().toISOString(),ventes,sorties,mouvements:MVT,articles:Object.values(ARTS),inventaire:Object.values(INV),reglages:sansSecrets(REG)});
let sauvAuto="";
function planifierSauv(){if(!REG.dossierSauv)return;clearTimeout(planifierSauv.t);planifierSauv.t=setTimeout(()=>sauvegardeAuto(false),3000)}
async function sauvegardeAuto(geste){const h=REG.dossierSauv;if(!h||!h.getFileHandle)return false;
 try{let p=await h.queryPermission({mode:"readwrite"});if(p!=="granted"&&geste)p=await h.requestPermission({mode:"readwrite"});
  if(p!=="granted"){sauvAuto="pause";bandeau();return false}
  const f=await h.getFileHandle(`sauvegarde-caisse-${jour()}.json`,{create:true}),w=await f.createWritable();
  await w.write(JSON.stringify(donneesSauvegarde()));await w.close();
  await putSet("derniereSauvegarde",Date.now());sauvAuto="ok";bandeau();return true}
 catch(e){sauvAuto="err";bandeau();return false}}
function carteSauvAuto(){const ok=!!window.showDirectoryPicker,h=REG.dossierSauv;
 return `<div class="carte"><h3>Sauvegarde automatique</h3>${!ok?'<p class="muted">Ce navigateur ne le permet pas : utilisez Chrome ou Edge sur le PC.</p>':
 `<p class="muted">Après chaque vente, la caisse écrit la sauvegarde du jour dans un dossier. Choisissez un dossier synchronisé (OneDrive ou Google Drive) : une copie quitte alors le PC.</p>
  <p><b>Dossier :</b> ${h?esc(h.name):"aucun"}${h?` · ${{ok:"dernière copie à "+new Date(REG.derniereSauvegarde||0).toTimeString().slice(0,5),pause:"en pause, à réautoriser",err:"erreur d'écriture"}[sauvAuto]||"en attente"}`:""}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="sauvDos">${h?"Changer de dossier":"Choisir le dossier"}</button>${h&&sauvAuto!=="ok"?'<button class="btn clair" id="sauvGo">Réautoriser et sauvegarder</button>':""}</div>`}</div>`}
function brancherSauvAuto(){const d=$("#sauvDos");if(d)d.onclick=async()=>{let h;try{h=await showDirectoryPicker({id:"sauvegarde-caisse",mode:"readwrite"})}catch(e){return}
  await putSet("dossierSauv",h);toast(await sauvegardeAuto(true)?"Sauvegarde écrite dans « "+h.name+" »":"Le dossier n'a pas pu être utilisé",!sauvAuto||sauvAuto!=="ok");render()};
 const g=$("#sauvGo");if(g)g.onclick=async()=>{await sauvegardeAuto(true);render()}}
document.addEventListener("click",e=>{if(e.target.closest("#bandeau")&&sauvAuto==="pause")sauvegardeAuto(true)});

// Le jeton GitHub et la phrase secrète ne sortent jamais de cet appareil.
const sansSecrets=r=>{const o={...r};delete o.ghJeton;delete o.ghPhrase;delete o.dossierSauv;delete o.ticketEnCours;Object.keys(o).forEach(k=>{if(k.startsWith("sha:")||k.startsWith("empreinte"))delete o[k]});return o};

// ---------- Démarrage ----------
(async()=>{
 try{await openDb();ventes=await all("ventes");sorties=await all("sorties");MVT=await all("mouvements");REG=await allSet();
  (await all("inventaire")).forEach(i=>INV[i.k]=i);(await all("articles")).forEach(a=>ARTS[a.r]=a);
  const te=REG.ticketEnCours;if(te&&te.panier&&te.panier.length){panier=te.panier;if(te.pay)pay={...pay,...te.pay};if(te.remise)remise=te.remise}}
 catch(e){idb=null;stockageKo=true}
 try{(await (await fetch("catalogue.json")).json()).forEach(ajouterArticle)}catch(e){}
 try{HIST=await (await fetch("historique.json")).json()}catch(e){HIST=[]}
 appliquerArticles();
 nbFiches=ajouterFiches(await lireFiches("comptoir"),"app")+ajouterFiches(await lireFiches("comptoir-essai"),"essai");
 CAT.forEach(a=>{aLaPiece(a);indexer(a);if(!a.m)a.m=Poids.matiere({nom:a.t||a.n,titre:a.n,cat:a.c});
  if(a.kg==null){const r=Poids.estimer({nom:a.t||a.n,titre:a.n,cat:a.c,matiere:a.m,unite:a.u,L:a.L,l:a.l,h:a.h});a.kg=r?r.kg:null;a.kgEst=!!r;
   // carreau : poids au m² estimé, ramené à un carreau
   if(a.kg==null&&a.pm){const m=Poids.estimer({nom:a.t||a.n,titre:a.n,cat:a.c,matiere:a.m,unite:"m²",L:a.L,l:a.l,h:a.h});if(m){a.kg=r2(m.kg/a.pm);a.kgEst=true}}}});
 calcStock();render();demarrerSync();
 $("#modal").addEventListener("keydown",e=>{if(e.key==="Escape")fermerModal()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#modal").hidden)fermerModal();else if(!$("#panneau").hidden)fermerPanneau()}});
 // Demande au navigateur de ne jamais effacer les données de la caisse pour faire de la place.
 if(navigator.storage&&navigator.storage.persist)try{stockageProtege=await navigator.storage.persisted()||await navigator.storage.persist()}catch(e){}
 bandeau();sauvegardeAuto(false);
 if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js");
})();
