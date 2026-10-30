"use strict";
// Onglet « Locations » : outilthèque, camionnette et atelier partagé, membres et demandes venues du site
// comptoir-materiaux.be. Tout est sur le serveur du site (PlanetHoster, api/index.php) : la caisse le lit et le modifie
// avec sa clé (Réglages > Site). Sans connexion internet, l'onglet ne peut rien afficher ; la caisse, elle, continue.
const Loc={d:null,err:"",vue:"demandes",charge:false,q:""};
const siteApiPret=()=>!!(REG.siteApi&&REG.siteCle);
const LOC_ST={demandee:["Demandée","jaune"],confirmee:["Confirmée","ok"],refusee:["Refusée","bad"],annulee:["Annulée",""],en_cours:["Sortie","violet"],rendue:["Rendue",""]};
const MEMBRE_ST={en_attente:["Adhésion à valider","jaune"],actif:["Actif","ok"],suspendu:["Suspendu","bad"]};
const TYPES_LOC={outil:"Outil",camionnette:"Camionnette",atelier:"Atelier"};

async function siteApi(a,corps,get={},brut){
 const u=new URL(REG.siteApi.replace(/\/?(index\.php)?$/,"/index.php"));u.searchParams.set("a",a);Object.entries(get).forEach(([k,v])=>u.searchParams.set(k,v));
 const r=await fetch(u,{method:"POST",headers:{"X-Cle-Caisse":REG.siteCle,"Content-Type":"application/json"},body:brut??JSON.stringify(corps||{})});
 const j=await r.json().catch(()=>({erreur:"Réponse illisible du site ("+r.status+")"}));
 if(!r.ok||j.erreur)throw new Error(j.erreur||"Erreur "+r.status);return j}
// Photo réduite à 1600 px avant l'envoi au site.
async function envoyerPhoto(f){const i=await createImageBitmap(f),k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement("canvas");
 c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext("2d").drawImage(i,0,0,c.width,c.height);
 const b=await new Promise(ok=>c.toBlob(ok,"image/jpeg",.85)),fd=new FormData();fd.append("photo",b,"photo.jpg");
 const u=new URL(REG.siteApi.replace(/\/?(index\.php)?$/,"/index.php"));u.searchParams.set("a","c_photo");
 const r=await fetch(u,{method:"POST",headers:{"X-Cle-Caisse":REG.siteCle},body:fd}),j=await r.json().catch(()=>({erreur:"Réponse illisible"}));
 if(!r.ok||j.erreur)throw new Error(j.erreur||"Erreur "+r.status);return j.url}
async function chargerLoc(){if(!siteApiPret()||Loc.charge)return;Loc.charge=true;
 try{Loc.d=await siteApi("c_tout");Loc.err=""}catch(e){Loc.err=navigator.onLine?e.message:"Hors ligne : les locations ont besoin d'internet."}
 Loc.charge=false;if(screen==="locations")render()}
// Le stock publié pour le site GitHub l'est aussi sur comptoir-materiaux.be (appelé par la synchro).
async function publierStockSite(S){if(!siteApiPret())return;const t=JSON.stringify(S),e=await empreinte(t);
 if(e===REG.empreinteStockSite)return;await siteApi("c_publier",null,{f:"stock.json"},t);await putSet("empreinteStockSite",e)}

const ddmm=s=>s?new Date(s.replace(" ","T")).toLocaleString("fr-BE",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
const outilDe=ref=>(Loc.d.outils.find(o=>o.ref===ref)||{ref,nom:ref,type:"outil"});
const membreDe=id=>(Loc.d.membres.find(m=>+m.id===+id)||{nom:"?",email:"",tel:""});
const prixLoc=(o,r)=>{if(o.type==="outil")return o.prix_periode;const h=(Date.parse(r.fin.replace(" ","T"))-Date.parse(r.debut.replace(" ","T")))/36e5;
 return h<=5&&o.prix_we!=null?o.prix_we:o.prix_jour!=null?Math.ceil(h/24)*o.prix_jour:null};

function ecranLocations(){
 if(!siteApiPret())return `<div class="titre"><h2>Locations</h2></div><div class="carte" style="max-width:640px">${formSite()}</div>`;
 if(!Loc.d){if(!Loc.err)chargerLoc();return `<div class="titre"><h2>Locations</h2></div><p class="muted">${Loc.err?esc(Loc.err)+` <button class="btn petit clair" id="locRe">Réessayer</button>`:"Chargement des locations…"}</p>`}
 const R=Loc.d.reservations,dem=R.filter(r=>r.statut==="demandee"),att=Loc.d.membres.filter(m=>m.statut==="en_attente");
 const dep=(Loc.d.depots||[]).filter(d=>d.statut==="nouveau");
 const V={demandes:[`Demandes${dem.length?` (${dem.length})`:""}`,vueDemandes],planning:["Planning",vuePlanning],depots:[`Dépôts proposés${dep.length?` (${dep.length})`:""}`,vueDepots],outils:[`Outils (${Loc.d.outils.length})`,vueOutils],membres:[`Membres${att.length?` (${att.length} à valider)`:""}`,vueMembres]};
 return `<div class="titre"><h2>Locations</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn petit clair" id="locRe">Actualiser</button><button class="btn petit" id="locNouv">+ Réservation au comptoir</button></div></div>
 ${Loc.err?`<p class="muted" style="color:var(--rouge)">${esc(Loc.err)}</p>`:""}
 <div class="onglets-loc">${Object.entries(V).map(([k,[t]])=>`<button data-lv="${k}" class="${Loc.vue===k?"sel":""}">${t}</button>`).join("")}</div>${V[Loc.vue][1]()}`}

function ligneRes(r,boutons){const o=outilDe(r.ref),m=membreDe(r.membre),p=prixLoc(o,r),ms=MEMBRE_ST[m.statut]||["",""];
 const retard=r.statut==="en_cours"&&r.fin<new Date().toISOString().slice(0,16).replace("T"," ");
 return `<div class="carte res-loc${retard?" retard":""}"><div><div><b>${esc(o.nom)}</b> <span class="pill">${TYPES_LOC[o.type]||""}</span> <span class="pill ${LOC_ST[r.statut][1]}">${LOC_ST[r.statut][0]}</span>${retard?` <span class="pill bad">En retard</span>`:""}</div>
 <div>${ddmm(r.debut)} → ${ddmm(r.fin)}${p!=null?` · ${eur(p)}`:""}${o.caution?` · caution ${eur(o.caution)}`:""}</div>
 <div class="muted">${esc(m.nom)} · ${m.tel?`<a href="tel:${esc(m.tel)}">${esc(m.tel)}</a> · `:""}<a href="mailto:${esc(m.email)}">${esc(m.email)}</a> ${ms[0]?`<span class="pill ${ms[1]}">${ms[0]}</span>`:""}</div>
 ${r.message?`<div class="muted">« ${esc(r.message)} »</div>`:""}${r.code_acces?`<div class="muted">Accès : <b>${esc(r.code_acces)}</b></div>`:""}${r.note?`<div class="muted">Note : ${esc(r.note)}</div>`:""}</div>
 <div class="res-btns">${boutons.map(([s,t,c])=>`<button class="btn petit ${c||""}" data-st="${s}" data-id="${r.id}">${t}</button>`).join("")}</div></div>`}
function vueDemandes(){const L=Loc.d.reservations.filter(r=>r.statut==="demandee").sort((a,b)=>a.debut<b.debut?-1:1);
 return L.length?L.map(r=>ligneRes(r,[["confirmee","Confirmer"],["refusee","Refuser","rouge"]])).join(""):`<p class="muted">Aucune demande en attente. Les demandes envoyées depuis le site arrivent ici (et par e-mail).</p>`}
function vuePlanning(){const R=Loc.d.reservations,auj=jour();
 const dehors=R.filter(r=>r.statut==="en_cours").sort((a,b)=>a.fin<b.fin?-1:1);
 const asortir=R.filter(r=>r.statut==="confirmee").sort((a,b)=>a.debut<b.debut?-1:1);
 const fin=R.filter(r=>["rendue","refusee","annulee"].includes(r.statut)).sort((a,b)=>a.maj<b.maj?1:-1).slice(0,20);
 return `<h3>Dehors en ce moment (${dehors.length})</h3>${dehors.map(r=>ligneRes(r,[["rendue","Retour"],["encaisser","Encaisser","jaune"]])).join("")||`<p class="muted">Rien n'est sorti.</p>`}
 <h3>À sortir (${asortir.length})</h3>${asortir.map(r=>ligneRes(r,[["en_cours",r.debut.slice(0,10)<=auj?"Sortie":"Sortie (en avance)"],["encaisser","Encaisser","jaune"],["annulee","Annuler","rouge"]])).join("")||`<p class="muted">Aucune réservation confirmée à venir.</p>`}
 <details><summary class="muted">Terminées récemment</summary>${fin.map(r=>ligneRes(r,[])).join("")}</details>`}
const DEP_ST={nouveau:["Nouveau","jaune"],accepte:["Accepté, à venir","ok"],refuse:["Refusé","bad"],recu:["Reçu",""]};
function vueDepots(){const L=(Loc.d.depots||[]);
 if(!L.length)return `<p class="muted">Aucune proposition. Les dons proposés depuis la page « Donner des matériaux » du site arrivent ici (et par e-mail).</p>`;
 return L.map(d=>`<div class="carte res-loc"><div><div><b>${esc(d.nom)}</b> <span class="pill ${DEP_ST[d.statut][1]}">${DEP_ST[d.statut][0]}</span>${+d.enlevement?` <span class="pill violet">Enlèvement demandé</span>`:""}</div>
 <div style="white-space:pre-wrap">${esc(d.quoi)}</div><div class="muted">${d.lieu?esc(d.lieu)+" · ":""}${d.tel?`<a href="tel:${esc(d.tel)}">${esc(d.tel)}</a> · `:""}${d.email?`<a href="mailto:${esc(d.email)}">${esc(d.email)}</a> · `:""}reçu le ${dateBe(d.cree.slice(0,10))}</div>
 ${d.photos.length?`<div class="dep-photos">${d.photos.map(p=>`<a href="${esc(p)}" target="_blank"><img src="${esc(p)}" alt=""></a>`).join("")}</div>`:""}${d.note?`<div class="muted">Note : ${esc(d.note)}</div>`:""}</div>
 <div class="res-btns">${d.statut==="nouveau"?`<button class="btn petit" data-dep="${d.id}" data-v="accepte">Accepter</button><button class="btn petit rouge" data-dep="${d.id}" data-v="refuse">Refuser</button>`:""}${d.statut==="accepte"?`<button class="btn petit" data-dep="${d.id}" data-v="recu">Reçu</button>`:""}</div></div>`).join("")}
function vueOutils(){const mots=sans(Loc.q).split(/\s+/).filter(Boolean);
 const L=Loc.d.outils.filter(o=>mots.every(w=>sans([o.ref,o.nom,o.cat].join(" ")).includes(w)));
 const dehors={};Loc.d.reservations.filter(r=>r.statut==="en_cours").forEach(r=>dehors[r.ref]=r);
 return `<div class="outils" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input class="champ" id="locQ" placeholder="Chercher un outil" value="${esc(Loc.q)}"><button class="btn petit" id="locAjOutil">+ Nouvel outil</button>${Loc.d.outils.length?"":`<button class="btn petit jaune" id="locImport">Reprendre l'ancienne outilthèque</button>`}</div>
 <div class="carte" style="padding:0;overflow:auto"><table class="t"><thead><tr><th></th><th>Réf.</th><th>Nom</th><th>Famille</th><th>Cat.</th><th class="r">Prix</th><th>État</th><th>Où ?</th><th>Site</th></tr></thead><tbody>
 ${L.map(o=>`<tr class="cl" data-outil="${esc(o.ref)}"><td>${o.photos[0]?`<img src="${esc(o.photos[0])}" alt="" loading="lazy">`:""}</td><td>${esc(o.ref)}</td><td>${esc(o.nom)}</td><td>${esc(o.type==="outil"?o.cat:TYPES_LOC[o.type])}</td><td>${o.tarif||""}</td>
 <td class="r">${o.type==="outil"?(o.prix_periode!=null?eur(o.prix_periode)+" /pér.":""):(o.prix_jour!=null?eur(o.prix_jour)+" /j":"")}</td><td>${esc(o.etat)}</td>
 <td>${dehors[o.ref]?`<span class="pill violet">Chez ${esc(membreDe(dehors[o.ref].membre).nom)}</span>`:`<span class="pill ok">Au Comptoir</span>`}</td><td>${o.en_ligne?"✓":"—"}</td></tr>`).join("")}</tbody></table></div>`}
function vueMembres(){const mots=sans(Loc.q).split(/\s+/).filter(Boolean);
 const L=Loc.d.membres.filter(m=>mots.every(w=>sans([m.nom,m.email,m.tel].join(" ")).includes(w))).sort((a,b)=>(a.statut==="en_attente")===(b.statut==="en_attente")?a.nom.localeCompare(b.nom):a.statut==="en_attente"?-1:1);
 return `<div class="outils" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input class="champ" id="locQ" placeholder="Chercher un membre" value="${esc(Loc.q)}"><button class="btn petit" id="locAjMembre">+ Nouveau membre</button></div>
 <div class="carte" style="padding:0;overflow:auto"><table class="t"><thead><tr><th>Nom</th><th>Contact</th><th>Adhésion</th><th>Jusqu'au</th><th>Inscrit le</th><th></th></tr></thead><tbody>
 ${L.map(m=>`<tr><td><b>${esc(m.nom)}</b>${m.adresse?`<div class="muted">${esc(m.adresse)}</div>`:""}</td><td>${esc(m.email)}<div class="muted">${esc(m.tel||"")}</div></td>
 <td><span class="pill ${MEMBRE_ST[m.statut][1]}">${MEMBRE_ST[m.statut][0]}</span></td><td>${m.jusqua?dateBe(m.jusqua):""}</td><td>${dateBe(m.cree.slice(0,10))}</td>
 <td style="white-space:nowrap"><button class="btn petit" data-adh="${m.id}">${m.statut==="actif"?"Prolonger 1 an":"Adhésion payée"}</button> ${m.statut==="suspendu"?`<button class="btn petit clair" data-msus="${m.id}" data-v="actif">Réactiver</button>`:`<button class="btn petit rouge" data-msus="${m.id}" data-v="suspendu">Suspendre</button>`}</td></tr>`).join("")||`<tr><td colspan="6" class="muted">Aucun membre.</td></tr>`}</tbody></table></div>`}

function formSite(){return `<h3>Site comptoir-materiaux.be</h3><p class="muted">Les comptes membres, l'outilthèque et les réservations (camionnette, atelier) sont sur le serveur du site. Indiquez son adresse et la clé de la caisse (la même que dans <code>api/config.php</code> sur PlanetHoster).</p>
 <label class="f">Adresse de l'API<input class="champ" id="sApi" value="${esc(REG.siteApi||"")}" placeholder="https://www.comptoir-materiaux.be/api/"></label>
 <label class="f">Clé de la caisse<input class="champ" id="sCle" type="password" value="${esc(REG.siteCle||"")}" autocomplete="off"></label>
 <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="sOk">Enregistrer et tester</button></div><p class="muted" id="sRes"></p>`}
function brancherSite(){const b=$("#sOk");if(!b)return;b.onclick=async()=>{await putSet("siteApi",$("#sApi").value.trim());await putSet("siteCle",$("#sCle").value.trim());
 $("#sRes").textContent="Test…";try{Loc.d=await siteApi("c_tout");Loc.err="";$("#sRes").textContent=`Liaison OK : ${Loc.d.outils.length} outils, ${Loc.d.membres.length} membres.`;toast("Site relié")}
 catch(e){$("#sRes").textContent="Échec : "+e.message;Loc.d=null}}}

function formOutil(o){o=o||{type:"outil",en_ligne:1,qte:1,photos:[]};const n=!o.ref;
 const F=(id,l,v,ph="")=>`<label class="f">${l}<input class="champ" id="${id}" value="${esc(v??"")}" placeholder="${esc(ph)}"></label>`;
 modal(`<h3>${n?"Nouvel outil":esc(o.nom)}</h3><div class="form-loc">
 <label class="f">Type<select class="champ" id="oType">${Object.entries(TYPES_LOC).map(([k,t])=>`<option value="${k}" ${o.type===k?"selected":""}>${t}</option>`).join("")}</select></label>
 ${F("oRef","Référence",o.ref,"ex. LOC75")}${F("oNom","Nom",o.nom)}${F("oCat","Famille",o.cat,"ex. Perçage et vissage")}
 <div class="deux-c">${F("oTarif","Catégorie de tarif (1 ou 2)",o.tarif)}${F("oPer","Prix par période (€)",virg(o.prix_periode))}</div>
 <div class="deux-c">${F("oJour","Prix par jour (€, camionnette / atelier)",virg(o.prix_jour))}${F("oDemi","Prix demi-journée (€)",virg(o.prix_we))}</div>
 <div class="deux-c">${F("oCaution","Caution (€)",virg(o.caution))}${F("oQte","Exemplaires",o.qte)}</div>
 ${F("oEtat","État",o.etat,"Neuf, Bon état, Usagé…")}
 <label class="f">Description<textarea class="champ" id="oDescr" rows="4">${esc(o.descr||"")}</textarea></label>
 <label class="f">Photos (une adresse par ligne)<textarea class="champ" id="oPhotos" rows="2">${esc((o.photos||[]).join("\n"))}</textarea></label>
 <label class="f">Ajouter une photo<input type="file" class="champ" id="oFichier" accept="image/*"></label>
 <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="oLigne" ${o.en_ligne?"checked":""}> Visible sur le site</label></div>
 <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="oOk">Enregistrer</button><button class="btn clair" data-ferme>Fermer</button></div>`);
 if(!n)$("#oRef").readOnly=true;
 $("#oFichier").onchange=async e=>{const f=e.target.files[0];if(!f)return;toast("Envoi de la photo…");
  try{const url=await envoyerPhoto(f);const t=$("#oPhotos");t.value=(t.value.trim()?t.value.trim()+"\n":"")+url;toast("Photo ajoutée : pensez à enregistrer")}catch(x){toast(x.message,true)}e.target.value=""};
 $("#oOk").onclick=async()=>{const v=id=>$("#"+id).value.trim();
  try{await siteApi("c_outil",{ref:v("oRef"),type:v("oType"),nom:v("oNom"),cat:v("oCat"),tarif:v("oTarif"),prix_periode:v("oPer"),prix_jour:v("oJour"),prix_we:v("oDemi"),
   caution:v("oCaution"),qte:v("oQte"),etat:v("oEtat"),descr:$("#oDescr").value,photos:v("oPhotos").split(/\n+/).map(s=>s.trim()).filter(Boolean),en_ligne:$("#oLigne").checked?1:0});
   fermerModal();toast("Outil enregistré");Loc.d=null;render()}catch(e){toast(e.message,true)}}}
function formMembre(){modal(`<h3>Nouveau membre</h3><p class="muted">Pour quelqu'un qui s'inscrit au comptoir. Il pourra se connecter au site après « mot de passe oublié » (à venir) : en attendant, il peut aussi créer son compte lui-même en ligne.</p>
 <label class="f">Nom et prénom<input class="champ" id="mNom"></label><label class="f">E-mail<input class="champ" id="mMail" type="email"></label><label class="f">Téléphone<input class="champ" id="mTel"></label><label class="f">Adresse<input class="champ" id="mAdr"></label>
 <label class="f">Adhésion payée jusqu'au<input class="champ" type="date" id="mJ" value="${unAn()}"></label>
 <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="mOk">Créer</button><button class="btn clair" data-ferme>Fermer</button></div>`);
 $("#mOk").onclick=async()=>{try{await siteApi("c_membre",{nom:$("#mNom").value.trim(),email:$("#mMail").value.trim(),tel:$("#mTel").value.trim(),adresse:$("#mAdr").value.trim(),jusqua:$("#mJ").value});fermerModal();toast("Membre créé");Loc.d=null;render()}catch(e){toast(e.message,true)}}}
const unAn=d=>{const x=d?new Date(d):new Date();if(d&&x<new Date())x.setTime(Date.now());x.setFullYear(x.getFullYear()+1);return jour(x)};
function formResa(){const M=Loc.d.membres.filter(m=>m.statut!=="suspendu").sort((a,b)=>a.nom.localeCompare(b.nom));
 modal(`<h3>Réservation au comptoir</h3><p class="muted">Pour un membre au téléphone ou au comptoir : elle est confirmée tout de suite.</p>
 <label class="f">Membre<select class="champ" id="rM">${M.map(m=>`<option value="${m.id}">${esc(m.nom)} (${esc(m.email)})</option>`).join("")}</select></label>
 <label class="f">Quoi ?<select class="champ" id="rO">${Loc.d.outils.map(o=>`<option value="${esc(o.ref)}">${esc(o.nom)} · ${esc(o.ref)}</option>`).join("")}</select></label>
 <div class="deux-c"><label class="f">Début<input class="champ" type="datetime-local" id="rD" value="${jour()}T09:00"></label><label class="f">Fin<input class="champ" type="datetime-local" id="rF" value="${jour()}T17:00"></label></div>
 <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="rOk" ${M.length?"":"disabled"}>Réserver</button><button class="btn clair" data-ferme>Fermer</button></div>${M.length?"":`<p class="muted">Créez d'abord le membre (onglet Membres).</p>`}`);
 $("#rOk").onclick=async()=>{try{await siteApi("c_reserver",{membre:+$("#rM").value,ref:$("#rO").value,debut:$("#rD").value.replace("T"," "),fin:$("#rF").value.replace("T"," ")});fermerModal();toast("Réservation enregistrée");Loc.vue="planning";Loc.d=null;render()}catch(e){toast(e.message,true)}}}

// Encaisser une location : une ligne sur le ticket, au prix calculé (modifiable comme toute ligne).
function encaisserLoc(r){const o=outilDe(r.ref),m=membreDe(r.membre),p=prixLoc(o,r);
 panier.push({r:"",n:`Location ${o.nom} (${r.ref}) · ${m.nom} · ${ddmm(r.debut)} → ${ddmm(r.fin)}`,p:p??null,q:1,loc:r.id});
 screen="caisse";render();toast(p==null?"Ligne ajoutée : indiquez le prix":"Location ajoutée au ticket")}

function brancherLocations(){brancherSite();
 const re=$("#locRe");if(re)re.onclick=()=>{Loc.d=null;Loc.err="";render()};
 if(!Loc.d)return;
 $$("[data-lv]").forEach(b=>b.onclick=()=>{Loc.vue=b.dataset.lv;Loc.q="";render()});
 $("#locNouv").onclick=formResa;
 const q=$("#locQ");if(q)q.oninput=e=>{Loc.q=e.target.value;const p=q.selectionStart;render();const n=$("#locQ");n.focus();n.setSelectionRange(p,p)};
 $$("[data-st]").forEach(b=>b.onclick=async()=>{const r=Loc.d.reservations.find(x=>+x.id===+b.dataset.id),st=b.dataset.st;
  if(st==="encaisser")return encaisserLoc(r);
  let note;if(st==="refusee"||st==="annulee"){note=prompt(st==="refusee"?"Motif du refus (envoyé au membre, facultatif) :":"Motif de l'annulation (facultatif) :","");if(note===null)return}
  try{await siteApi("c_statut",{id:r.id,statut:st,...(note!=null?{note}:{})});toast({confirmee:"Confirmée : le membre est prévenu par e-mail",refusee:"Refusée : le membre est prévenu",en_cours:"Sortie notée",rendue:"Retour noté",annulee:"Annulée"}[st]);
   const enc=st==="en_cours"&&confirm("Encaisser la location maintenant ?");if(enc)encaisserLoc(r);Loc.d=null;render()}catch(e){toast(e.message,true)}});
 $$("[data-outil]").forEach(t=>t.onclick=()=>formOutil(Loc.d.outils.find(o=>o.ref===t.dataset.outil)));
 const ao=$("#locAjOutil");if(ao)ao.onclick=()=>formOutil();
 const im=$("#locImport");if(im)im.onclick=async()=>{try{const o=await (await fetch("../comptoir/outils.json",{cache:"no-cache"})).json();const j=await siteApi("c_outils",{outils:o});toast(j.ajoutes+" outils repris");Loc.d=null;render()}catch(e){toast(e.message,true)}};
 const am=$("#locAjMembre");if(am)am.onclick=formMembre;
 $$("[data-dep]").forEach(b=>b.onclick=async()=>{let note="";if(b.dataset.v==="refuse"){note=prompt("Motif (pour mémoire, facultatif) :","");if(note===null)return}
  try{await siteApi("c_depot",{id:+b.dataset.dep,statut:b.dataset.v,note});Loc.d=null;render()}catch(e){toast(e.message,true)}});
 $$("[data-adh]").forEach(b=>b.onclick=async()=>{const m=membreDe(b.dataset.adh);try{await siteApi("c_membre",{id:m.id,statut:"actif",jusqua:unAn(m.statut==="actif"?m.jusqua:null)});toast("Adhésion enregistrée jusqu'au "+dateBe(unAn(m.statut==="actif"?m.jusqua:null)));Loc.d=null;render()}catch(e){toast(e.message,true)}});
 $$("[data-msus]").forEach(b=>b.onclick=async()=>{try{await siteApi("c_membre",{id:+b.dataset.msus,statut:b.dataset.v});Loc.d=null;render()}catch(e){toast(e.message,true)}})}
