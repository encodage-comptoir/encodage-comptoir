// Photos des fiches article : plein écran au toucher, zoom (toucher ou pincer), photo suivante en glissant.
(function(){
const imgs=[...document.querySelectorAll('.galerie img')];if(!imgs.length)return;
// styles ici et non dans style.css : une ancienne feuille en cache ne peut plus casser la visionneuse
const st=document.createElement('style');st.textContent=`.galerie img{cursor:zoom-in}.visionneuse{position:fixed;inset:0;z-index:50;background:rgba(15,20,22,.94);display:flex;align-items:center;justify-content:center}.v-cadre{width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:pinch-zoom}.v-cadre img{max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;transition:transform .2s}.visionneuse.zoom .v-cadre img{cursor:zoom-out}.visionneuse button{position:absolute;z-index:2;background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:50%;width:48px;height:48px;font-size:28px;line-height:1;cursor:pointer}.v-fermer{top:12px;right:12px;font-size:22px!important}.v-prec{left:10px;top:50%;transform:translateY(-50%)}.v-suiv{right:10px;top:50%;transform:translateY(-50%)}.v-num,.v-aide{position:absolute;color:#fff;margin:0;font-size:14px}.v-num{top:22px;left:16px}.v-aide{bottom:16px;left:0;right:0;text-align:center;opacity:.7}.visionneuse.zoom .v-aide{display:none}.visionneuse[hidden]{display:none}`;document.head.append(st);
const grande=s=>s.replace('/gallery_images/thumbs/','/gallery_images/');
const v=document.createElement('div');v.className='visionneuse';v.hidden=true;
v.innerHTML='<button class="v-fermer" aria-label="Fermer">✕</button><button class="v-prec" aria-label="Photo précédente">‹</button><div class="v-cadre"><img alt=""></div><button class="v-suiv" aria-label="Photo suivante">›</button><p class="v-num"></p><p class="v-aide">Touchez la photo pour zoomer</p>';
document.body.append(v);
const im=v.querySelector('img'),cadre=v.querySelector('.v-cadre');let i=0,zoom=false,x0=null;
function montre(n){i=(n+imgs.length)%imgs.length;im.src=grande(imgs[i].src);im.alt=imgs[i].alt;dezoom();v.querySelector('.v-num').textContent=imgs.length>1?`${i+1} / ${imgs.length}`:'';
 v.querySelectorAll('.v-prec,.v-suiv').forEach(b=>b.hidden=imgs.length<2)}
function dezoom(){zoom=false;im.style.transform='';v.classList.remove('zoom')}
function zoomer(e){const r=im.getBoundingClientRect();im.style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`;im.style.transform='scale(2.5)';zoom=true;v.classList.add('zoom')}
function ouvrir(n){montre(n);v.hidden=false;if(getComputedStyle(v).position==='fixed')document.body.style.overflow='hidden'}
function fermer(){v.hidden=true;document.body.style.overflow=''}
imgs.forEach((x,n)=>{x.style.cursor='zoom-in';x.tabIndex=0;x.onclick=()=>ouvrir(n);x.onkeydown=e=>{if(e.key==='Enter')ouvrir(n)}});
im.onclick=e=>{e.stopPropagation();zoom?dezoom():zoomer(e)};
// au doigt ou à la souris, la zone agrandie suit le déplacement
im.onmousemove=e=>{if(zoom&&e.buttons===0&&matchMedia('(hover:hover)').matches){const r=cadre.getBoundingClientRect();im.style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`}};
cadre.addEventListener('touchstart',e=>{if(e.touches.length===1)x0=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});
cadre.addEventListener('touchmove',e=>{if(zoom&&e.touches.length===1&&x0){e.preventDefault();const r=cadre.getBoundingClientRect(),t=e.touches[0];
 im.style.transformOrigin=`${Math.min(100,Math.max(0,(t.clientX-r.left)/r.width*100))}% ${Math.min(100,Math.max(0,(t.clientY-r.top)/r.height*100))}%`}},{passive:false});
cadre.addEventListener('touchend',e=>{if(!zoom&&x0){const dx=e.changedTouches[0].clientX-x0[0];if(Math.abs(dx)>50)montre(i+(dx<0?1:-1))}x0=null});
v.querySelector('.v-fermer').onclick=fermer;v.querySelector('.v-prec').onclick=e=>{e.stopPropagation();montre(i-1)};v.querySelector('.v-suiv').onclick=e=>{e.stopPropagation();montre(i+1)};
v.onclick=e=>{if(e.target===v||e.target===cadre)fermer()};
document.addEventListener('keydown',e=>{if(v.hidden)return;if(e.key==='Escape')fermer();if(e.key==='ArrowRight')montre(i+1);if(e.key==='ArrowLeft')montre(i-1)});
})();
