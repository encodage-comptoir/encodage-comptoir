// Estimation du poids d'un matériau : masse volumique de la matière × volume (dimensions en cm) × part « pleine » de l'objet.
// Copie identique dans essai/poids.js et caisse/poids.js : modifier les deux.
"use strict";
const Poids=(()=>{
const sans=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const num=v=>{const x=parseFloat(String(v??"").replace(",","."));return isFinite(x)&&x>0?x:0};
// Mêmes valeurs que l'app d'encodage et le moteur « Faire avec ».
const MATIERES=["Bois massif","Panneau (multiplex, OSB, MDF)","Métal","Verre","Céramique","Pierre / béton","PVC / plastique","Textile","Mélange / autre"];
// Masse volumique moyenne (kg/m³).
const DENSITE={"Bois massif":650,"Panneau (multiplex, OSB, MDF)":650,"Métal":7850,"Verre":2500,"Céramique":2300,"Pierre / béton":2300,"PVC / plastique":1400,"Textile":300};
const DENSITE_CAT={ISO:40}; // isolants : laine, polystyrène
// Matière devinée d'après le nom, puis d'après la catégorie, quand la fiche ne la donne pas.
const MAT_MOTS=[[/pvc|plastique|acryl/,"PVC / plastique"],[/\balu|acier|inox|fonte|metal|zinc|cuivre/,"Métal"],[/osb|mdf|multiplex|agglo|stratifi|trespa/,"Panneau (multiplex, OSB, MDF)"],
 [/chene|bois|sapin|hetre|pin\b|meleze|parquet/,"Bois massif"],[/vitr|verre|miroir/,"Verre"],[/ceram|porcelaine|gres|faience|carrelage|evier|\bwc\b|lavabo|vasque/,"Céramique"],
 [/beton|pierre|brique|marbre|granit|pave|tuile|ardoise|ytong|mortier|bloc/,"Pierre / béton"]];
const MAT_CAT={CAR:"Céramique",GRO:"Pierre / béton",RA:"Métal",Q:"Métal",OUT:"Métal",BOI:"Bois massif",PAR:"Bois massif",LAM:"Bois massif",ISO:"Mélange / autre",ELECTRO:"Mélange / autre",ELEC:"Mélange / autre",LUM:"Mélange / autre"};
// Part de la boîte (largeur × profondeur × hauteur) réellement occupée par la matière, selon le type d'objet.
// 1 = objet plein (planche, dalle, brique…). Sans type reconnu, on ne calcule pas par le volume.
const PLEIN=[[/baignoire/,0.04],[/bac de douche/,0.25],[/\bwc\b|toilette/,0.12],[/evier|lavabo|vasque|lave-mains/,0.12],[/meuble|colonne/,0.15],
 [/radiateur|seche-serviettes/,0.05],[/chassis|fenetre|velux/,0.3,"CH"],[/porte/,0.6,"PO"],
 [/planche|poutre|panneau|plaque|dalle|carrelage|faience|pave|brique|bloc|pierre|marbre|granit|tuile|ardoise|lame|parquet|bardage|lambris|vitre|plan de travail|linteau|osb|multiplex|trespa|isolant|laine|polystyrene/,1]];
// En métal, éviers, lavabos, bacs et baignoires sont une tôle mince (inox, acier émaillé) : la part pleine des tables ci-dessus
// (calée sur la céramique) donnerait un poids 10 fois trop grand. La fonte reste plus lourde.
const PLEIN_METAL=[[/baignoire.*fonte|fonte.*baignoire/,0.02],[/baignoire/,0.006],[/evier|lavabo|vasque|lave-mains|bac de douche/,0.01]];
// Poids moyen d'après le type (kg par pièce), quand les dimensions manquent. null = inconnu, à peser.
const PAR_TYPE=[[/baignoire/,40],[/bac de douche/,20],[/\bwc\b|toilette/,25],[/evier/,15],[/lave-mains/,6],[/lavabo|vasque/,12],[/colonne/,15],[/meuble/,25],
 [/paroi|porte de douche/,25],[/mitigeur|robinet|tete de douche|douchette|porte-serviettes|porte-papier|cache-siphon/,1],
 [/porte de garage/,80,"PO"],[/porte exterieure|porte d'entree|porte-fenetre/,45,"PO"],[/bloc-porte/,35,"PO"],[/porte/,25,"PO"],[/chassis|fenetre|velux/,35,"CH"],
 [/seche-serviettes/,12],[/radiateur electrique/,10],[/radiateur/,25],[/boiler/,40],[/thermostat|vanne/,0.5],
 [/frigo|refrigerateur/,50],[/lave-linge/,70],[/lave-vaisselle/,45],[/four/,35],[/taque/,10],[/hotte/,12],
 [/spot|prise|interrupteur|variateur/,0.2],[/plafonnier|applique|suspension|reglette/,2],[/poignee|charniere|serrure/,0.3]];
const PAR_M2={CAR:22,PAR:12,LAM:8,TOI:30,ISO:3}; // kg/m² quand l'épaisseur manque
const cherche=(L,txt,cat)=>L.find(([re,,c])=>(!c||c===cat)&&re.test(txt));
const arrondi=kg=>kg<5?Math.round(kg*10)/10:Math.round(kg*2)/2;

function matiere(o){const txt=sans([o.nom,o.titre].join(" "));const x=cherche(MAT_MOTS,txt,o.cat);return x?x[1]:MAT_CAT[o.cat]||""}
// o = {nom, titre, cat, matiere, unite, L, l, h} (dimensions en cm). Renvoie {kg, base} ou null.
// kg est par pièce, ou par m² si l'unité est m².
function estimer(o){const txt=sans([o.nom,o.titre].join(" ")),m=o.matiere||matiere(o),d=DENSITE_CAT[o.cat]||DENSITE[m];
 const dims=[o.L,o.l,o.h].map(num).filter(Boolean),u=o.unite||"pièce";
 if(u==="m²"){const ep=dims.length===3?Math.min(...dims):0; // épaisseur = la plus petite des 3 mesures
  if(d&&ep&&ep<=10)return {kg:arrondi(d*ep/100),base:"épaisseur et matière"};
  return PAR_M2[o.cat]?{kg:PAR_M2[o.cat],base:"type d'article"}:null}
 if(u!=="pièce")return null;
 const p=(m==="Métal"&&cherche(PLEIN_METAL,txt,o.cat))||cherche(PLEIN,txt,o.cat);
 if(d&&p&&dims.length===3){const kg=dims.reduce((a,b)=>a*b,1)/1e6*d*p[1];if(kg>=0.1)return {kg:arrondi(kg),base:"dimensions et matière"}}
 const t=cherche(PAR_TYPE,txt,o.cat);return t?{kg:t[1],base:"type d'article"}:null}
return {MATIERES,matiere,estimer}})();
