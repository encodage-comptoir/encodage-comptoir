// Garde l'app disponible même sans réseau au comptoir.
const C="comptoir-v7-4-essai", BIG="comptoir-modele-v1", FILES=["./","index.html","poids.js","manifest.webmanifest","icon-192.png","icon-512.png","modeles/libelles.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==BIG).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);
 // Modèle de reconnaissance et moteur (35 Mo) : téléchargés une seule fois, puis lus dans le cache.
 if(u.origin===location.origin&&/\/(vendor\/|modeles\/.*\.onnx$)/.test(u.pathname)){
  e.respondWith(caches.open(BIG).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok)c.put(e.request,n.clone());return n}))));return}
 e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const c=r.clone();if(r.ok&&u.origin===location.origin)caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
