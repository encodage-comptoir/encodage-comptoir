// Relais d'envoi de l'app d'encodage du Comptoir des Matériaux.
// Reçoit le fichier préparé par l'app (fiches + photos) et l'envoie par e-mail à Audrey, en pièce jointe.
// Mise en place (une seule fois, avec un compte Google) :
//   1. script.google.com › Nouveau projet › coller ce fichier à la place du contenu.
//   2. Déployer › Nouveau déploiement › type « Application Web » ; Exécuter en tant que : Moi ; Qui a accès : Tout le monde.
//   3. Autoriser l'envoi d'e-mails, puis copier l'URL qui se termine par « /exec » dans l'app (Réglages › Envoi à Audrey).
// Le destinataire est fixe : le relais ne peut écrire qu'à Audrey.
const DEST = "audrey@la-pile.be";
const CLE = "comptoir-pile-2026";        // la même que ENVOI_CLE dans l'app

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.cle !== CLE) return reponse({ ok: false, err: "clé refusée" });
    const piece = Utilities.newBlob(d.html, "text/html", d.fichier || "comptoir.html");
    MailApp.sendEmail({ to: DEST, subject: d.objet || "Comptoir – envoi de l'app", body: d.texte || "", attachments: [piece], name: "Encodage Comptoir" });
    return reponse({ ok: true });
  } catch (err) {
    return reponse({ ok: false, err: String(err) });
  }
}

function doGet() {
  return reponse({ ok: true, info: "Relais d'envoi du Comptoir : prêt." });
}

function reponse(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
