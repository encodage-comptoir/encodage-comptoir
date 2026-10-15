// Lit le catalogue public du Comptoir (lecture seule) et note les requêtes que la page fait pour charger les produits.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'https://www.la-pile.be/fr/comptoir-des-materiaux.htm';
fs.mkdirSync('site', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
const reqs = [];
p.on('response', async r => {
  const u = r.url(), t = r.request().resourceType();
  if (['xhr', 'fetch', 'document', 'script'].includes(t)) {
    let body = '';
    try { if (t !== 'script') body = (await r.text()).slice(0, 20000); } catch {}
    reqs.push({ t, method: r.request().method(), u, post: r.request().postData(), status: r.status(), body });
  }
});
await p.goto(URL, { waitUntil: 'networkidle' });
fs.writeFileSync('site/page.html', await p.content());
await p.screenshot({ path: 'site/page.png', fullPage: true });
// Cliquer sur une catégorie pour voir comment la liste se charge.
const liens = await p.$$eval('a', as => as.map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href'), o: a.getAttribute('onclick') })).filter(a => a.t));
fs.writeFileSync('site/liens.json', JSON.stringify(liens, null, 1));
const cat = await p.$('text=Sanitaire');
if (cat) { await cat.click(); await p.waitForTimeout(4000); fs.writeFileSync('site/apres-clic.html', await p.content()); await p.screenshot({ path: 'site/apres-clic.png', fullPage: true }); }
fs.writeFileSync('site/requetes.json', JSON.stringify(reqs, null, 1));
await b.close();
