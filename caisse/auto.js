// Complète seule une nouvelle fiche de l'app : famille, prix du neuf, CO₂ évité, accroche, description et idées.
// S'appuie sur reference.json (outils/fiches_auto.py) : les articles du catalogue harmonisé les plus proches donnent
// la famille, la fourchette du prix du neuf et les textes ; le CO₂ reprend le calcul de outils/site_co2.py (ÖKOBAUDAT).
"use strict";
const Auto=(()=>{
let REF=null;
const sans=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const n=x=>{const v=parseFloat(String(x??"").replace(",","."));return isFinite(v)&&v>0?v:0};
const VIDES=new Set("avec pour dans sans plus vendu vendue lot les des une sur par cm de du la le et en".split(" "));
const mots=s=>new Set(sans(s).split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!/^\d+$/.test(w)&&!VIDES.has(w)));
const med=L=>{const s=[...L].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const rond=v=>v<20?Math.round(v):v<200?Math.round(v/5)*5:Math.round(v/10)*10;
const fr=v=>(Math.round(v*100)/100).toString().replace(".",",");
async function charger(){if(!REF){try{REF=await (await fetch("reference.json")).json()}catch(e){REF={F:{},A:[]}}}return REF}

// Articles du catalogue les plus proches : même rayon, mots du titre en commun, taille comparable.
// Le premier mot du titre dit ce qu'est l'objet (évier, porte, radiateur…) : les voisins doivent le partager.
const typeDe=a=>sans(a.n||a.t).split(/[^a-z0-9]+/).find(w=>w.length>=3&&!VIDES.has(w)&&!/^\d+$/.test(w))||"";
function voisins(a){if(!REF)return [];const pre=(String(a.r||"").match(/^[A-Z]+/)||[a.c])[0],W=mots([a.n,a.t].join(" ")),s=n(a.L)*n(a.l)/1e4,tw=typeDe(a);
 const meme=REF.A.filter(x=>x.c===pre&&tw&&x.t===tw);   // même type d'objet d'abord (lavabo ≠ cache-siphon pour lavabo)
 return (meme.length>=2?meme:REF.A.filter(x=>x.c===pre&&(!tw||x.w.includes(tw)))).map(x=>{let sc=0;x.w.forEach(w=>{if(W.has(w))sc+=2});if(sc&&a.m&&x.m===a.m)sc+=3;
  if(sc&&s)sc-=x.s?Math.min(2,Math.abs(Math.log(s/x.s))):1;return {x,sc}}).filter(o=>o.sc>=2).sort((p,q)=>q.sc-p.sc).slice(0,5)}

// Calcul du CO₂ évité, repris de outils/site_co2.py.
function co2(a,fam){const F=REF.F,t=sans([a.n,a.t].join(" ")),mat=sans(a.m),u=a.u||"pièce";
 const d=[n(a.L),n(a.l),n(a.h)].sort((x,y)=>y-x).map(x=>x/100),[d1,d2,d3]=d,surf=d1*d2;
 const f=k=>F[k]&&F[k][0];
 const parM2=(k,quoi)=>{const v=f(k);if(v==null)return null;if(u==="m²")return [v,"m²",`${fr(v)} kg CO₂e par m² de ${quoi} neuf`,k];
  if(u==="pièce"&&surf)return [v*surf,"pièce",`${fr(d1)} × ${fr(d2)} m = ${fr(surf)} m² × ${fr(v)} kg CO₂e/m² (${quoi} neuf)`,k];return null};
 const parM3=(k,quoi)=>{const v=f(k);if(v==null||u!=="pièce"||!(d1&&d2&&d3))return null;const vol=d1*d2*d3;
  return [v*vol,"pièce",`${fr(d1)} × ${fr(d2)} × ${fr(d3)} m = ${vol.toFixed(4).replace(".",",")} m³ × ${fr(v)} kg CO₂e/m³ (${quoi} neuf)`,k]};
 const parKg=(kg,k,hyp,fac)=>{const v=fac??f(k);if(v==null||u!=="pièce"||kg<=0)return null;return [v*kg,"pièce",`poids estimé ≈ ${fr(Math.round(kg*10)/10)} kg (${hyp}) × ${fr(Math.round(v*1000)/1000)} kg CO₂e/kg`,k]};
 let r=null;const tm=t+" "+mat;
 if(fam==="Radiateurs et chauffage"&&/radiateur/.test(t)&&!/electrique/.test(t)&&!/fonte/.test(tm)&&surf>=0.1)
  r=/serviette/.test(t)?parKg(surf*15,"radiateur_acier_panneau",`sèche-serviettes en tubes d’acier, ≈ 15 kg par m² de face, ${fr(d1)} × ${fr(d2)} m`)
   :parKg(surf*35,"radiateur_acier_panneau",`radiateur à panneaux en acier, ≈ 35 kg par m² de face, ${fr(d1)} × ${fr(d2)} m`);
 else if((fam==="Éviers et lavabos"||fam==="WC")&&!/inox|resine|composite|granit|acier|plaque de commande|robinet seul|metal/.test(tm)){
  const cer=/ceramique|porcelaine/.test(tm),sup=cer?"":", matière supposée céramique";
  if(fam==="WC"||/\bwc\b|bidet|cuvette/.test(t)){const kg=/enfant/.test(t)?15:/bidet/.test(t)?18:/suspendu/.test(t)?20:25;
   r=parKg(kg,"ceramique_sanitaire_wc_lavabo",`poids courant d’un ${/bidet/.test(t)?"bidet":"WC"} en céramique${sup}`)}
  else if(surf>=0.05&&(cer||!mat))r=parKg(Math.max(8,surf*60),"ceramique_sanitaire_wc_lavabo",`≈ 60 kg de céramique par m² d’emprise, ${fr(d1)} × ${fr(d2)} m${sup}`)}
 else if(fam==="Portes"&&surf>=1&&!/garage/.test(t)&&/panneau|melamin|mdf|multiplex/.test(tm))r=parM2("porte_interieure_bois","porte intérieure en bois et dérivés");
 else if(fam==="Portes"&&surf>=1&&!/garage/.test(t)&&(/metal/.test(mat)||/metallique/.test(t))&&f("acier_tole_galvanisee"))
  r=parKg(surf*2*5.72*1.3,"acier_tole_galvanisee",`deux faces en tôle d’acier + 30 % pour le cadre, ${fr(surf)} m²`,f("acier_tole_galvanisee")/5.72);
 else if(fam==="Châssis et fenêtres"&&/velux/.test(t)&&surf>=0.3)r=parM2("fenetre_bois","fenêtre de toit en bois");
 if(!r){
  if(fam==="Portes"&&surf>=1){if(/garage/.test(t))r=/sectionnel/.test(t)?parM2("porte_garage_sectionnelle","porte de garage sectionnelle"):null;
   else if(/exterieur|entree/.test(t))r=parM2(/pvc/.test(tm)?"porte_exterieure_pvc":"porte_exterieure_bois","porte extérieure");
   else if(/bois|chene|sapin|peindre/.test(tm)||!mat)r=parM2("porte_interieure_bois","porte intérieure en bois")}
  else if(fam==="Châssis et fenêtres"&&surf>=0.15){const k=/alu/.test(tm)?"fenetre_alu":/bois/.test(tm)?"fenetre_bois":/pvc/.test(tm)?"fenetre_pvc":null;
   if(k)r=parM2(k,"châssis "+(k==="fenetre_alu"?"alu":k==="fenetre_bois"?"bois":"PVC"))}
  else if(fam==="Parois de douche"&&/verre/.test(tm)&&surf>=0.3&&u==="pièce"&&f("paroi_douche_verre_trempe")!=null){const v=f("paroi_douche_verre_trempe")*8;
   r=[v*surf,"pièce",`${fr(d1)} × ${fr(d2)} m = ${fr(surf)} m² de verre trempé 8 mm × ${fr(v)} kg CO₂e/m²`,"paroi_douche_verre_trempe"]}
  else if(fam==="Carrelage")r=parM2("carrelage_ceramique","carrelage en grès émaillé");
  else if(fam==="Parquet et lambris")r=/stratifie/.test(t)?parM2("parquet_stratifie","parquet stratifié"):/contrecolle/.test(t)?parM2("parquet_contrecolle","parquet contrecollé"):/parquet/.test(t)&&/massif/.test(tm)?parM2("parquet_massif","parquet massif"):null;
  else if(fam==="Baignoires et douches"&&surf>=0.5&&u==="pièce")r=/acier|emai/.test(tm)?parM2("baignoire_acier_emaille","baignoire ou receveur en acier émaillé"):/acrylique/.test(t)?parM2("baignoire_acrylique","baignoire ou receveur en acrylique"):null;
  else if(fam==="Robinetterie"&&u==="pièce"&&/mitigeur|robinet/.test(t)&&/lavabo/.test(t)&&f("robinet_mitigeur_lavabo")!=null){const v=f("robinet_mitigeur_lavabo");r=[v,"pièce",`${fr(v)} kg CO₂e par robinet de lavabo neuf`,"robinet_mitigeur_lavabo"]}
  else if(fam==="Gros œuvre et pierre"&&u==="pièce"){if(/creux|coffrage|boisseau|thermoplan|perfor/.test(t))r=null;else if(/brique/.test(t))r=parM3("brique_parement","brique");
   else if(/bloc|bordure/.test(t)&&/beton/.test(t)&&!/terre cuite/.test(t))r=parM3("bloc_beton","élément en béton")}
  else if(fam==="Bois et panneaux")r=/osb/.test(t)?parM3("panneau_osb","panneau OSB"):/agglomere/.test(t)?parM3("panneau_agglomere","panneau aggloméré")
   :/planche|madrier|poutre|chevron|latte/.test(t)?parM3(/chene/.test(t)?"bois_scie_chene":"bois_scie_resineux",/chene/.test(t)?"chêne scié":"résineux scié"):null;
  else if(fam==="Toiture et gouttières"&&/tuile/.test(t)&&u==="m²")r=parM2("tuile_terre_cuite","tuiles en terre cuite")}
 if(!r||r[0]<0.5)return null;const kg=r[0];
 return {kg:kg<10?Math.round(kg*10)/10:Math.round(kg),par:r[1],calcul:r[2],jeu:REF.F[r[3]][1],lien:REF.F[r[3]][2]}}

// Première phrase de la description, par famille : générale, pour ne rien affirmer de faux sur l'objet.
const ACCROCHE={"Portes":"Une porte de réemploi, à remettre en service pour une fraction du prix du neuf.",
 "Éviers et lavabos":"De quoi installer un point d'eau à prix de réemploi.","WC":"Un sanitaire de réemploi, contrôlé au Comptoir, pour équiper une salle de bain ou un WC à petit prix.",
 "Radiateurs et chauffage":"Du matériel de chauffage de réemploi, pour chauffer sans payer le prix du neuf.","Châssis et fenêtres":"Un châssis de réemploi, pour une annexe, un atelier, un abri ou une rénovation à petit budget.",
 "Parois de douche":"Une paroi de douche de réemploi, à prix doux.","Baignoires et douches":"Pour une salle de bain de réemploi, à prix doux.",
 "Carrelage":"Du carrelage de réemploi, idéal pour une petite surface, une crédence ou un projet créatif.","Parquet et lambris":"Des lames de réemploi pour habiller un sol ou un mur à petit prix.",
 "Gros œuvre et pierre":"Des matériaux de construction de réemploi, solides et bon marché.","Bois et panneaux":"Du bois de réemploi pour vos travaux, meubles et aménagements.",
 "Toiture et gouttières":"Des matériaux de toiture de réemploi, pour réparer ou construire une petite annexe.","Luminaires":"Un luminaire de réemploi pour éclairer à petit prix.",
 "Électricité":"Du matériel électrique de réemploi, à faire vérifier et installer par un électricien.","Quincaillerie":"De la quincaillerie de réemploi pour vos travaux.",
 "Robinetterie":"De la robinetterie de réemploi, à petit prix.","Plomberie":"Du matériel de plomberie de réemploi.","Isolation":"De l'isolant de réemploi, pour isoler à petit budget.",
 "Électroménager":"De l'électroménager de réemploi, à prix doux.","Outils":"Un outil de réemploi, prêt à resservir.","Jardin et extérieur":"Pour aménager le jardin avec des matériaux de réemploi.",
 "Accessoires de salle de bain":"Un accessoire de salle de bain de réemploi.","Meubles de salle de bain":"Un meuble de salle de bain de réemploi, à prix doux.","Divers":""};
// Ce que la caisse propose pour la fiche ; les valeurs saisies dans la caisse (a.nMin, a.nMax, a.dc) passent devant.
function proposer(a){if(!REF)return {};const V=voisins(a),u=a.u||"pièce";
 const cpt={};V.forEach(o=>cpt[o.x.f]=(cpt[o.x.f]||0)+o.sc);const fam=Object.keys(cpt).sort((p,q)=>cpt[q]-cpt[p])[0]||"";
 const N=V.filter(o=>o.x.mn&&o.x.u===u),neuf=N.length?[rond(med(N.map(o=>o.x.mn))),rond(med(N.map(o=>o.x.mx)))]:null;
 const ci={};V.forEach(o=>(o.x.i||[]).forEach(i=>ci[i]=(ci[i]||0)+1));
 const idees=Object.keys(ci).filter(i=>ci[i]>=2).sort((p,q)=>ci[q]-ci[p]).slice(0,3);
 const dims=[n(a.L),n(a.l),n(a.h)].filter(Boolean).sort((x,y)=>y-x).map(fr).join(" × ");
 const phrase=[a.n?String(a.n).replace(/\s*[–-]\s*[\d,]+( × [\d,]+)*( cm)?$/,""):"",a.m&&!sans(a.n).includes(sans(a.m).split(" ")[0])?"en "+a.m.toLowerCase():"",dims?dims+" cm":""].filter(Boolean).join(", ");
 const desc=[ACCROCHE[fam]||"",phrase?phrase+".":"",a.et?a.et.replace(/^./,c=>c.toUpperCase())+".":"",a.note||""].filter(Boolean).join(" ");
 return {famille:fam,neuf,co2:co2(a,fam),desc,idees}}
return {charger,proposer,voisins}})();
