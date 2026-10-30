// Compte membre et réservations (outilthèque, camionnette, atelier partagé).
// Sur comptoir-materiaux.be (PlanetHoster), tout passe par api/index.php. Sur la maquette GitHub Pages, il n'y a pas
// de serveur : on bascule en « démo », les comptes et demandes restent dans ce navigateur.
const RACINE = new URL('.', document.currentScript.src);
const API = new URL('api/index.php', RACINE);
const Compte = {
  demo: null,   // true si pas d'API joignable
  membre: undefined,
  async api(a, corps, get = {}) {
    if (this.demo === null) await this.sonder();
    if (this.demo) return Demo.api(a, corps, get);
    const u = new URL(API); u.searchParams.set('a', a); Object.entries(get).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, corps ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { credentials: 'same-origin' });
    const j = await r.json().catch(() => ({ erreur: 'Réponse illisible du serveur.' }));
    if (!r.ok || j.erreur) throw new Error(j.erreur || 'Erreur ' + r.status);
    return j;
  },
  async sonder() {
    try { const r = await fetch(API + '?a=moi', { credentials: 'same-origin' }); const j = await r.json(); this.demo = false; this.membre = j.membre; }
    catch { this.demo = true; }
  },
  async moi() { if (this.membre === undefined) { const j = await this.api('moi'); this.membre = j.membre; } return this.membre; },
  // Outils, camionnette et atelier : l'API en direct, sinon le fichier publié par la caisse.
  async outils() {
    if (this.demo === null) await this.sonder();
    // Tant que la caisse n'a pas repris les outils (base vide), on montre le fichier publié.
    if (!this.demo) try { const l = await this.api('outils'); if (l.length) return l; } catch {}
    const r = await fetch(new URL('outils.json', RACINE), { cache: 'no-cache' });
    return r.ok ? (await r.json()).filter(o => o.en_ligne !== 0) : [];
  },
  dispo(ref) { return this.api('dispo', null, { ref }); },
};

// ——— Démo (maquette sans serveur) ———
const Demo = {
  lire() { try { return JSON.parse(localStorage.getItem('comptoir-demo')) || { membres: [], res: [], moi: null }; } catch { return { membres: [], res: [], moi: null }; } },
  ecrire(d) { try { localStorage.setItem('comptoir-demo', JSON.stringify(d)); } catch {} },
  async api(a, c = {}, get = {}) {
    const d = this.lire(), moi = d.membres.find(m => m.id === d.moi) || null, now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const err = m => { throw new Error(m); };
    const sansMdp = m => m && (({ mdp, ...x }) => x)(m);
    switch (a) {
      case 'moi': return { membre: sansMdp(moi) };
      case 'inscription':
        if (!/^\S+@\S+\.\S+$/.test(c.email || '')) err('Adresse e-mail invalide.');
        if ((c.mdp || '').length < 8) err('Mot de passe : 8 caractères au moins.');
        if (d.membres.some(m => m.email === c.email.toLowerCase())) err('Un compte existe déjà avec cette adresse : connectez-vous.');
        const m = { id: d.membres.length + 1, email: c.email.toLowerCase(), nom: c.nom, tel: c.tel || '', adresse: c.adresse || '', mdp: c.mdp, statut: 'en_attente', cree: now };
        d.membres.push(m); d.moi = m.id; this.ecrire(d); return { membre: sansMdp(m) };
      case 'connexion': {
        const m = d.membres.find(m => m.email === (c.email || '').toLowerCase() && m.mdp === c.mdp);
        if (!m) err('E-mail ou mot de passe incorrect.'); d.moi = m.id; this.ecrire(d); return { membre: sansMdp(m) };
      }
      case 'deconnexion': d.moi = null; this.ecrire(d); return { ok: true };
      case 'profil': if (!moi) err('Connectez-vous d\'abord.'); Object.assign(moi, { nom: c.nom || moi.nom, tel: c.tel, adresse: c.adresse }); this.ecrire(d); return { membre: sansMdp(moi) };
      case 'dispo': return { ref: get.ref, qte: 1, pris: d.res.filter(r => r.ref === get.ref && ['demandee', 'confirmee', 'en_cours'].includes(r.statut)).map(({ debut, fin, statut }) => ({ debut, fin, statut })) };
      case 'reserver': {
        if (!moi) err('Connectez-vous d\'abord.');
        if (!c.debut || !c.fin || c.fin <= c.debut) err('Dates invalides.');
        if (d.res.some(r => r.ref === c.ref && ['confirmee', 'en_cours'].includes(r.statut) && r.debut < c.fin && r.fin > c.debut)) err('Déjà réservé sur cette période : choisissez d\'autres dates.');
        const r = { id: d.res.length + 1, membre: moi.id, ref: c.ref, nom: c.nom || c.ref, debut: c.debut, fin: c.fin, statut: 'demandee', message: c.message || '', cree: now };
        d.res.push(r); this.ecrire(d); return { reservation: r };
      }
      case 'mes': if (!moi) err('Connectez-vous d\'abord.'); return d.res.filter(r => r.membre === moi.id).reverse();
      case 'annuler': { const r = d.res.find(r => r.id === c.id && moi && r.membre === moi.id); if (!r) err('Introuvable.'); r.statut = 'annulee'; this.ecrire(d); return { ok: true }; }
      default: err('Indisponible dans la maquette.');
    }
  },
};

// ——— Petits outils d'affichage communs ———
const eurs = v => v == null || v === '' ? '' : Number(v).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(v) % 1 ? 2 : 0 });
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const dateFr = s => new Date(s.replace(' ', 'T')).toLocaleString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUT_FR = { demandee: ['Demandée', 'jaune'], confirmee: ['Confirmée', 'ok'], refusee: ['Refusée', 'bad'], annulee: ['Annulée', 'gris'], en_cours: ['En cours', 'ok'], rendue: ['Terminée', 'gris'] };

// Calendrier des 6 prochaines semaines : jours libres, partiellement pris, pris.
function calendrierHtml(pris, choisi, fermes = []) {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const lundi = new Date(auj); lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
  let h = '<div class="cal"><div class="cal-tete">' + ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'].map(j => `<span>${j}</span>`).join('') + '</div><div class="cal-jours">';
  for (let i = 0; i < 42; i++) {
    const j = new Date(lundi); j.setDate(lundi.getDate() + i);
    const d0 = j.getTime(), d1 = d0 + 864e5;
    let occ = 0; pris.forEach(p => { const a = Math.max(d0, Date.parse(p.debut.replace(' ', 'T'))), b = Math.min(d1, Date.parse(p.fin.replace(' ', 'T'))); if (b > a) occ += b - a; });
    const etat = j < auj ? 'passe' : fermes.includes(j.getDay()) ? 'ferme' : occ >= 864e5 * .5 ? 'pris' : occ > 0 ? 'partiel' : 'libre';
    const iso = `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}-${String(j.getDate()).padStart(2, '0')}`;
    h += `<button type="button" class="cal-j ${etat}${iso === choisi ? ' sel' : ''}" data-jour="${iso}" ${etat === 'passe' || etat === 'ferme' ? 'disabled' : ''}>${j.getDate()}${j.getDate() === 1 ? `<small>${j.toLocaleString('fr-BE', { month: 'short' })}</small>` : ''}</button>`;
  }
  return h + '</div><p class="cal-legende"><span class="libre">libre</span><span class="partiel">en partie pris</span><span class="pris">pris</span>' + (fermes.length ? '<span class="ferme">indisponible</span>' : '') + '</p></div>';
}

// Bloc « connectez-vous » réutilisé par les pages de réservation.
function blocConnexion(retour) {
  return `<div class="encart-compte"><p><b>Réservé aux membres de La Pile.</b> Connectez-vous ou créez votre compte pour envoyer votre demande.</p>
  <a class="bouton" href="${RACINE}compte.html?retour=${encodeURIComponent(retour || location.href)}">Me connecter / créer un compte</a></div>`;
}
function bandeauDemo() {
  return Compte.demo ? '<p class="note-demo">Maquette : les comptes et demandes restent dans ce navigateur. Sur comptoir-materiaux.be, ils arriveront dans la caisse du Comptoir.</p>' : '';
}
