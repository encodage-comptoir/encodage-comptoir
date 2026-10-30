// Lit l'outilthèque actuelle (outils.la-pile.be, lecture seule) : page, captures et réponses de son API.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'https://outils.la-pile.be/cities/Malmedy';
const OUT = 'donnees/outilheque-source';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const reqs = [];
p.on('response', async r => {
  const t = r.request().resourceType();
  if (['xhr', 'fetch', 'document'].includes(t)) {
    let body = '';
    try { body = await r.text(); } catch {}
    reqs.push({ t, method: r.request().method(), u: r.url(), post: r.request().postData(), status: r.status(), body });
  }
});
await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 3000); await p.waitForTimeout(700); }
fs.writeFileSync(OUT + '/page.html', await p.content());
fs.writeFileSync(OUT + '/texte.txt', await p.innerText('body'));
await p.screenshot({ path: OUT + '/page.png', fullPage: true });
const liens = await p.$$eval('a', as => as.map(a => ({ t: a.textContent.trim(), h: a.href })));
fs.writeFileSync(OUT + '/liens.json', JSON.stringify(liens, null, 1));
// Ouvrir quelques fiches d'outils pour voir le détail (prix, caution, description).
const fiches = [...new Set(liens.map(l => l.h).filter(h => /outils\.la-pile\.be\/.+\/.+/.test(h) && !/cities\/Malmedy$/.test(h)))].slice(0, 200);
const detail = [];
for (const h of fiches) {
  try {
    await p.goto(h, { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(800);
    detail.push({ h, texte: await p.innerText('body'), imgs: await p.$$eval('img', is => is.map(i => i.src)) });
  } catch (e) { detail.push({ h, erreur: String(e) }); }
}
fs.writeFileSync(OUT + '/fiches.json', JSON.stringify(detail, null, 1));
fs.writeFileSync(OUT + '/requetes.json', JSON.stringify(reqs, null, 1));
await b.close();
