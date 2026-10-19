# Illustrations « Faire avec » : une scène par projet, un pictogramme par fonction, aux couleurs de La Pile.
# SVG en ligne (pas de fichier image à héberger) ; style plat, sans texte.

B, BF, J, V, ENC = '#449ca8', '#2f7c87', '#fec300', '#7b2382', '#1f2a2c'
BOIS, BOIS2, VERT, VERT2, GRIS, CIEL, SOL, BLANC = '#c98b4f', '#e3b47a', '#6aa84f', '#3f7d3a', '#9aa5a7', '#e4f2f4', '#d9cbb3', '#ffffff'


def scene(corps, fond=CIEL):
    return (f'<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            f'<rect width="240" height="150" fill="{fond}"/>{corps}</svg>')


def picto(corps):
    return (f'<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            f'<circle cx="32" cy="32" r="31" fill="{CIEL}"/>{corps}</svg>')


def plante(x, y, c=VERT):
    return (f'<path d="M{x} {y}v-14" stroke="{VERT2}" stroke-width="2"/><ellipse cx="{x - 5}" cy="{y - 10}" rx="6" ry="3" fill="{c}" transform="rotate(-30 {x - 5} {y - 10})"/>'
            f'<ellipse cx="{x + 5}" cy="{y - 14}" rx="6" ry="3" fill="{c}" transform="rotate(30 {x + 5} {y - 14})"/>')


SOL_JARDIN = f'<rect y="118" width="240" height="32" fill="#a8cf8e"/>'
SOL_INT = f'<rect y="120" width="240" height="30" fill="{SOL}"/>'

PROJETS = {
    'Coin potager': scene(SOL_JARDIN +
        # baignoire en bac surélevé, cuve de pluie, arrosoir
        f'<rect x="30" y="84" width="110" height="34" rx="16" fill="{BLANC}" stroke="{GRIS}" stroke-width="3"/>'
        f'<rect x="38" y="118" width="8" height="12" fill="{GRIS}"/><rect x="124" y="118" width="8" height="12" fill="{GRIS}"/>'
        f'<rect x="36" y="80" width="98" height="10" rx="5" fill="#7a5a3a"/>' + plante(50, 82) + plante(72, 82, VERT2) + plante(96, 82) + plante(118, 82, VERT2) +
        f'<circle cx="62" cy="64" r="5" fill="#e0533d"/><circle cx="108" cy="62" r="5" fill="#e0533d"/>'
        f'<rect x="168" y="66" width="40" height="56" rx="6" fill="{B}"/><rect x="168" y="76" width="40" height="4" fill="{BF}"/><rect x="168" y="104" width="40" height="4" fill="{BF}"/>'
        f'<path d="M188 66V20h30" stroke="{GRIS}" stroke-width="6" fill="none"/><rect x="200" y="112" width="6" height="8" fill="{GRIS}"/>'
        f'<circle cx="40" cy="28" r="12" fill="{J}"/>'),
    'Coin WC': scene(SOL_INT +
        f'<rect x="0" y="0" width="240" height="120" fill="#f2efe6"/>'
        + ''.join(f'<rect x="{x}" y="120" width="30" height="30" fill="{"#d7c8a8" if (x // 30) % 2 else SOL}"/>' for x in range(0, 240, 30)) +
        f'<rect x="78" y="40" width="44" height="36" rx="4" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><rect x="92" y="50" width="16" height="8" rx="2" fill="{B}"/>'
        f'<path d="M72 80h56v8c0 16-12 26-28 26s-28-10-28-26z" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><rect x="88" y="112" width="24" height="10" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/>'
        f'<rect x="70" y="76" width="60" height="6" rx="3" fill="{B}"/>'
        f'<path d="M160 60h44l-4 16h-36z" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><path d="M182 60v-10h8" stroke="{GRIS}" stroke-width="3" fill="none"/>'
        f'<rect x="168" y="22" width="28" height="30" rx="14" fill="{CIEL}" stroke="{GRIS}" stroke-width="2"/>'
        f'<rect x="24" y="30" width="30" height="90" fill="{BOIS2}" stroke="{BOIS}" stroke-width="2"/><circle cx="48" cy="78" r="3" fill="{J}"/>'
        f'<path d="M120 0v12" stroke="{GRIS}" stroke-width="2"/><circle cx="120" cy="16" r="6" fill="{J}"/>'),
    'Petite salle de bain': scene(SOL_INT +
        ''.join(f'<rect x="{x}" y="{y}" width="19" height="19" fill="{BLANC}" stroke="#cfe3e6"/>' for x in range(0, 240, 20) for y in range(0, 120, 20)) +
        f'<rect x="14" y="20" width="76" height="100" fill="{CIEL}" fill-opacity=".6" stroke="{B}" stroke-width="3"/><path d="M52 20v100" stroke="{B}" stroke-width="2"/>'
        f'<path d="M30 28h10v8" stroke="{GRIS}" stroke-width="3" fill="none"/><circle cx="40" cy="40" r="5" fill="{GRIS}"/>'
        + ''.join(f'<path d="M{36 + i * 4} 48l-2 10" stroke="{B}" stroke-width="2"/>' for i in range(3)) +
        f'<rect x="10" y="112" width="84" height="8" fill="{GRIS}"/>'
        f'<rect x="124" y="24" width="40" height="44" rx="20" fill="{CIEL}" stroke="{GRIS}" stroke-width="3"/>'
        f'<path d="M118 76h52l-6 14h-40z" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><rect x="132" y="90" width="24" height="30" fill="{BOIS2}"/>'
        f'<path d="M144 76v-6" stroke="{GRIS}" stroke-width="3"/>'
        f'<rect x="190" y="40" width="34" height="54" rx="4" fill="none" stroke="{J}" stroke-width="4"/>'
        + ''.join(f'<path d="M190 {48 + i * 10}h34" stroke="{J}" stroke-width="3"/>' for i in range(4))),
    "Cuisine d'appoint": scene(SOL_INT +
        f'<rect x="0" y="0" width="240" height="120" fill="#f2efe6"/>'
        f'<rect x="20" y="60" width="200" height="22" fill="#e9e9ea"/>'
        + ''.join(f'<path d="M{20 + i * 25} 60l18 22" stroke="#d0d0d4" stroke-width="1"/>' for i in range(8)) +
        f'<rect x="16" y="82" width="208" height="8" fill="{BOIS}"/><rect x="20" y="90" width="200" height="30" fill="{B}"/>'
        + ''.join(f'<path d="M{20 + i * 50} 90v30" stroke="{BF}" stroke-width="2"/><rect x="{40 + i * 50}" y="96" width="10" height="3" fill="{J}"/>' for i in range(4)) +
        f'<rect x="40" y="76" width="44" height="6" fill="{GRIS}"/><path d="M62 76v-14h8" stroke="{GRIS}" stroke-width="3" fill="none"/>'
        f'<rect x="130" y="78" width="50" height="4" fill="{ENC}"/><circle cx="145" cy="80" r="1" fill="#e0533d"/>'
        f'<path d="M135 20h40l8 22h-56z" fill="{GRIS}"/><rect x="148" y="0" width="14" height="20" fill="{GRIS}"/>'
        f'<rect x="30" y="34" width="70" height="5" fill="{BOIS}"/><rect x="38" y="20" width="10" height="14" fill="{J}"/><rect x="54" y="24" width="8" height="10" fill="{V}"/><circle cx="80" cy="28" r="6" fill="{B}"/>'),
    'Atelier': scene(f'<rect y="120" width="240" height="30" fill="#c9c9c9"/><rect width="240" height="120" fill="#eef1f1"/>'
        f'<rect x="14" y="20" width="90" height="56" fill="{BOIS2}" stroke="{BOIS}" stroke-width="2"/>'
        + ''.join(f'<circle cx="{24 + i * 14}" cy="28" r="2" fill="{ENC}"/>' for i in range(6)) +
        f'<path d="M24 30v26M36 30l6 26M50 30v20M64 30v30M78 30v18M92 30v24" stroke="{GRIS}" stroke-width="4"/>'
        f'<rect x="64" y="40" width="10" height="6" fill="#e0533d"/>'
        f'<rect x="20" y="78" width="150" height="10" fill="{BOIS}"/>'
        f'<path d="M36 88l-10 32M46 88l10 32M144 88l-10 32M154 88l10 32" stroke="{BOIS2}" stroke-width="5"/>'
        f'<rect x="120" y="66" width="30" height="12" fill="{J}"/><rect x="146" y="70" width="14" height="4" fill="{ENC}"/>'
        f'<rect x="184" y="20" width="44" height="100" fill="none" stroke="{BF}" stroke-width="3"/>'
        + ''.join(f'<rect x="184" y="{40 + i * 26}" width="44" height="3" fill="{BF}"/><rect x="{190 + (i * 9) % 20}" y="{28 + i * 26}" width="14" height="12" fill="{[B, V, J][i]}"/>' for i in range(3)) +
        f'<path d="M110 0v10" stroke="{GRIS}" stroke-width="2"/><path d="M94 10h32l-6 8h-20z" fill="{GRIS}"/><path d="M100 18l-10 30h40l-10-30" fill="{J}" fill-opacity=".35"/>'),
    'Abri bois': scene(SOL_JARDIN +
        f'<path d="M20 50l100-26 100 26v8H20z" fill="{GRIS}"/>' + ''.join(f'<path d="M{30 + i * 20} {48 - i * 0}v8" stroke="#7f8a8c"/>' for i in range(10)) +
        f'<rect x="34" y="56" width="8" height="66" fill="{BOIS}"/><rect x="198" y="56" width="8" height="66" fill="{BOIS}"/><rect x="116" y="56" width="8" height="66" fill="{BOIS}"/>'
        + ''.join(f'<circle cx="{52 + c * 14 + (r % 2) * 7}" cy="{112 - r * 12}" r="7" fill="{BOIS2}" stroke="{BOIS}" stroke-width="2"/><circle cx="{52 + c * 14 + (r % 2) * 7}" cy="{112 - r * 12}" r="2" fill="{BOIS}"/>'
                  for r in range(4) for c in range(4 - (r % 2)))
        + ''.join(f'<circle cx="{134 + c * 14 + (r % 2) * 7}" cy="{112 - r * 12}" r="7" fill="{BOIS2}" stroke="{BOIS}" stroke-width="2"/><circle cx="{134 + c * 14 + (r % 2) * 7}" cy="{112 - r * 12}" r="2" fill="{BOIS}"/>'
                  for r in range(4) for c in range(4 - (r % 2))) +
        f'<rect x="20" y="118" width="200" height="6" fill="{GRIS}"/>'),
    'Poulailler': scene(SOL_JARDIN +
        f'<path d="M30 60l40-26 40 26z" fill="#e0533d"/><rect x="38" y="60" width="64" height="40" fill="{BOIS2}" stroke="{BOIS}" stroke-width="2"/>'
        f'<rect x="60" y="72" width="18" height="28" fill="{BOIS}"/><path d="M60 100l-14 18" stroke="{BOIS}" stroke-width="4"/>'
        f'<rect x="42" y="100" width="5" height="20" fill="{BOIS}"/><rect x="94" y="100" width="5" height="20" fill="{BOIS}"/>'
        f'<path d="M120 60h110M120 120h110" stroke="{GRIS}" stroke-width="2"/>'
        + ''.join(f'<path d="M{120 + i * 14} 60v60" stroke="{GRIS}" stroke-width="1"/>' for i in range(9))
        + ''.join(f'<path d="M120 {60 + i * 12}h110" stroke="{GRIS}" stroke-width="1"/>' for i in range(5)) +
        f'<rect x="118" y="56" width="5" height="66" fill="{BOIS}"/><rect x="228" y="56" width="5" height="66" fill="{BOIS}"/>'
        f'<ellipse cx="160" cy="104" rx="16" ry="12" fill="{BLANC}" stroke="{GRIS}"/><circle cx="174" cy="92" r="7" fill="{BLANC}" stroke="{GRIS}"/>'
        f'<path d="M180 92l6 2-6 2z" fill="{J}"/><path d="M172 85l2-5 2 5z" fill="#e0533d"/><path d="M156 116v4M164 116v4" stroke="{J}" stroke-width="2"/>'
        f'<ellipse cx="206" cy="114" rx="14" ry="5" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><ellipse cx="206" cy="113" rx="10" ry="2" fill="{B}"/>'),
    'Abri de jardin': scene(SOL_JARDIN +
        f'<path d="M50 54l70-34 70 34z" fill="{BF}"/><rect x="60" y="54" width="120" height="66" fill="{BOIS2}"/>'
        + ''.join(f'<path d="M{68 + i * 12} 54v66" stroke="{BOIS}" stroke-width="2"/>' for i in range(10)) +
        f'<rect x="80" y="70" width="32" height="50" fill="{B}"/><circle cx="106" cy="96" r="2.5" fill="{J}"/>'
        f'<rect x="130" y="70" width="34" height="26" fill="{CIEL}" stroke="{BLANC}" stroke-width="4"/><path d="M147 70v26M130 83h34" stroke="{BLANC}" stroke-width="2"/>'
        f'<rect x="196" y="76" width="4" height="44" fill="{BOIS}"/><path d="M190 76h16l-4 10h-8z" fill="{GRIS}"/>'
        + plante(30, 120) + plante(214, 120, VERT2)),
    'Terrasse': scene(f'<rect width="240" height="80" fill="{CIEL}"/>'
        f'<path d="M0 80h240v70H0z" fill="#a8cf8e"/><path d="M20 150l30-66h140l30 66z" fill="{SOL}"/>'
        + ''.join(f'<path d="M{50 - i * 6} {84 + i * 13}h{140 + i * 12}" stroke="#bfae8f" stroke-width="1.5"/>' for i in range(6))
        + ''.join(f'<path d="M{70 + i * 25} 84l{(i - 2.5) * 14} 66" stroke="#bfae8f" stroke-width="1.5"/>' for i in range(6)) +
        f'<rect x="90" y="88" width="64" height="6" fill="{BOIS}"/><path d="M96 94v24M148 94v24" stroke="{BOIS}" stroke-width="4"/>'
        f'<rect x="34" y="106" width="44" height="6" fill="{BOIS2}"/><rect x="38" y="112" width="10" height="12" fill="{GRIS}"/><rect x="64" y="112" width="10" height="12" fill="{GRIS}"/>'
        f'<rect x="170" y="96" width="44" height="18" rx="8" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/>' + plante(182, 98) + plante(200, 98, VERT2) +
        f'<rect x="20" y="30" width="3" height="56" fill="{ENC}"/><circle cx="21" cy="28" r="6" fill="{J}"/>'
        f'<path d="M30 30 Q120 10 220 30" stroke="{ENC}" fill="none"/>' + ''.join(f'<circle cx="{50 + i * 34}" cy="{24 - (2 - abs(i - 2)) * 3}" r="4" fill="{J}"/>' for i in range(5))),
    'Serre': scene(SOL_JARDIN +
        f'<path d="M40 62l80-34 80 34v58H40z" fill="{CIEL}" fill-opacity=".7" stroke="{BLANC}" stroke-width="5"/>'
        f'<path d="M80 45v75M120 28v92M160 45v75M40 90h160" stroke="{BLANC}" stroke-width="4"/>'
        f'<path d="M40 62l80-34 80 34" stroke="{BF}" stroke-width="3" fill="none"/>'
        f'<rect x="36" y="112" width="168" height="10" fill="#b5523b"/>'
        + plante(60, 112) + plante(100, 112, VERT2) + plante(140, 112) + plante(180, 112, VERT2) +
        f'<circle cx="64" cy="98" r="4" fill="#e0533d"/><circle cx="142" cy="96" r="4" fill="#e0533d"/>'),
    'Mare': scene(SOL_JARDIN + f'<rect y="70" width="240" height="50" fill="#a8cf8e"/>'
        f'<ellipse cx="120" cy="108" rx="90" ry="28" fill="{B}"/><ellipse cx="114" cy="104" rx="70" ry="18" fill="#5fb3bf"/>'
        + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="12" ry="7" fill="{GRIS}"/>' for x, y in ((34, 104), (52, 126), (196, 92), (214, 112), (180, 132), (90, 136)))
        + ''.join(f'<path d="M{x} 104v-{h}" stroke="{VERT2}" stroke-width="2"/><ellipse cx="{x}" cy="{104 - h}" rx="2.5" ry="6" fill="#7a5a3a"/>' for x, h in ((176, 44), (184, 36), (192, 48))) +
        f'<ellipse cx="96" cy="104" rx="10" ry="4" fill="{VERT}"/><circle cx="100" cy="102" r="3" fill="#f5a3c7"/>'
        f'<path d="M60 40q8-8 16 0q8-8 16 0" stroke="{ENC}" fill="none" stroke-width="2"/>'),
    'Sapin de Noël': scene(f'<rect width="240" height="150" fill="#2a3a4c"/><rect y="124" width="240" height="26" fill="#e8eef2"/>'
        + ''.join(f'<rect x="{120 - (i + 1) * 9}" y="{30 + i * 14}" width="{(i + 1) * 18}" height="10" rx="2" fill="{BOIS2 if i % 2 else BOIS}"/>' for i in range(6)) +
        f'<rect x="116" y="30" width="8" height="90" fill="#7a5a3a"/><rect x="104" y="114" width="32" height="12" fill="#b5523b"/>'
        f'<path d="M120 8l4 10h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z" fill="{J}"/>'
        + ''.join(f'<circle cx="{120 + dx}" cy="{y}" r="3" fill="{c}"/>' for dx, y, c in ((-14, 46, J), (12, 60, '#e0533d'), (-22, 74, B), (26, 88, J), (-34, 102, '#e0533d'), (6, 102, V), (-4, 74, J)))
        + ''.join(f'<rect x="{20 + (i * 47) % 200}" y="{12 + (i * 29) % 100}" width="2" height="2" fill="{BLANC}"/>' for i in range(14))),
    'Petite chambre': scene(SOL_INT +
        f'<rect width="240" height="120" fill="#eef4f0"/>'
        + ''.join(f'<rect x="{150 + i * 9}" y="0" width="8" height="120" fill="{BOIS2 if i % 2 else BOIS}" opacity=".55"/>' for i in range(10)) +
        f'<rect x="24" y="50" width="120" height="40" rx="3" fill="#8a5a33"/>' + ''.join(f'<rect x="{30 + i * 38}" y="56" width="32" height="28" rx="2" fill="none" stroke="#6b4425" stroke-width="2"/>' for i in range(3)) +
        f'<rect x="20" y="88" width="200" height="20" rx="4" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><rect x="20" y="96" width="200" height="12" fill="{B}"/>'
        f'<rect x="30" y="80" width="30" height="12" rx="6" fill="{BLANC}" stroke="{GRIS}"/><rect x="64" y="80" width="30" height="12" rx="6" fill="{BLANC}" stroke="{GRIS}"/>'
        f'<path d="M24 108v12M216 108v12" stroke="#6b4425" stroke-width="4"/>'
        f'<path d="M120 0v20" stroke="{ENC}"/><path d="M110 20h20l4 10h-28z" fill="{J}"/>'
        f'<rect x="168" y="36" width="56" height="5" fill="{BOIS}"/><rect x="176" y="22" width="8" height="14" fill="{V}"/><rect x="188" y="26" width="8" height="10" fill="{B}"/>' + plante(210, 36)),
}

FONCTIONS = {
    'Séparer un espace': picto(f'<rect x="14" y="16" width="10" height="32" fill="{BOIS2}"/><rect x="27" y="16" width="10" height="32" fill="{BOIS}"/><rect x="40" y="16" width="10" height="32" fill="{BOIS2}"/><path d="M14 50h36" stroke="{ENC}" stroke-width="2"/>'),
    'Clôturer': picto(''.join(f'<path d="M{14 + i * 9} 22l3-5 3 5v26h-6z" fill="{BOIS}"/>' for i in range(5)) + f'<path d="M12 28h40M12 40h40" stroke="{BOIS2}" stroke-width="3"/>'),
    'Couvrir / abriter': picto(f'<path d="M10 30l22-14 22 14z" fill="{BF}"/><path d="M16 30v20M48 30v20" stroke="{BOIS}" stroke-width="3"/><path d="M22 10l-2 4M30 8l-2 4M40 10l-2 4" stroke="{B}" stroke-width="2"/>'),
    'Apporter de la lumière': picto(f'<rect x="18" y="18" width="28" height="30" fill="{CIEL}" stroke="{BLANC}" stroke-width="4"/><rect x="18" y="18" width="28" height="30" fill="none" stroke="{BF}" stroke-width="2"/><path d="M32 18v30M18 33h28" stroke="{BF}" stroke-width="2"/><circle cx="46" cy="16" r="6" fill="{J}"/>'),
    'Faire un plateau': picto(f'<rect x="10" y="24" width="44" height="7" fill="{BOIS}"/><path d="M16 31v20M48 31v20" stroke="{ENC}" stroke-width="3"/><rect x="22" y="16" width="8" height="8" fill="{V}"/>'),
    'Ranger': picto(f'<rect x="16" y="12" width="32" height="40" fill="none" stroke="{BF}" stroke-width="3"/><path d="M16 26h32M16 39h32" stroke="{BF}" stroke-width="3"/><rect x="20" y="16" width="8" height="10" fill="{J}"/><rect x="32" y="30" width="12" height="9" fill="{V}"/><rect x="21" y="43" width="10" height="9" fill="{B}"/>'),
    'Planter': picto(f'<path d="M18 36h28l-4 16H22z" fill="#b5523b"/>' + plante(32, 36) + f'<circle cx="32" cy="20" r="4" fill="{J}"/>'),
    "Récupérer l'eau": picto(f'<rect x="20" y="26" width="24" height="26" rx="4" fill="{B}"/><path d="M32 26V12h14" stroke="{GRIS}" stroke-width="4" fill="none"/><path d="M14 14q-3 5 0 7q3-2 0-7z" fill="{B}"/><path d="M24 36h16" stroke="{BF}" stroke-width="2"/>'),
    "Point d'eau": picto(f'<path d="M14 34h36l-4 10H18z" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><path d="M32 34V20h10v4" stroke="{GRIS}" stroke-width="3" fill="none"/><path d="M42 28q-2 3 0 4q2-1 0-4z" fill="{B}"/>'),
    'Revêtir un sol': picto(''.join(f'<rect x="{12 + c * 14}" y="{20 + r * 9}" width="13" height="8" fill="{[BOIS, BOIS2][(r + c) % 2]}"/>' for r in range(3) for c in range(3)) + f'<path d="M12 48h40" stroke="{ENC}" stroke-width="2"/>'),
    'Habiller un mur': picto(''.join(f'<rect x="{14 + c * 12}" y="{14 + r * 12}" width="11" height="11" fill="{[B, BLANC, J][(r + c) % 3]}" stroke="#cfe3e6"/>' for r in range(3) for c in range(3))),
    'Chauffer': picto(''.join(f'<rect x="{14 + i * 7}" y="20" width="5" height="28" rx="2" fill="{BLANC}" stroke="{GRIS}" stroke-width="1.5"/>' for i in range(5)) + f'<path d="M24 14q3-4 0-8M32 14q3-4 0-8M40 14q3-4 0-8" stroke="#e0533d" stroke-width="2" fill="none"/>'),
    'Éclairer': picto(f'<path d="M32 8v10" stroke="{ENC}" stroke-width="2"/><path d="M20 30q12-16 24 0z" fill="{BF}"/><circle cx="32" cy="32" r="5" fill="{J}"/><path d="M22 34l-8 18h36l-8-18" fill="{J}" fill-opacity=".4"/>'),
    'Isoler': picto(f'<rect x="12" y="20" width="40" height="26" rx="3" fill="{J}"/><path d="M14 33q4-6 8 0t8 0 8 0 8 0 6 0" stroke="#d29e00" stroke-width="3" fill="none"/>'),
    'Fixer / assembler': picto(f'<path d="M30 12h8v6h-8z" fill="{GRIS}"/><path d="M32 18h4v28l-2 6-2-6z" fill="{GRIS}"/><path d="M32 24l4 3M32 30l4 3M32 36l4 3" stroke="{ENC}" stroke-width="1.5"/><rect x="14" y="40" width="14" height="6" fill="{BOIS}"/><rect x="40" y="40" width="14" height="6" fill="{BOIS}"/>'),
    "S'asseoir": picto(f'<rect x="12" y="30" width="40" height="7" fill="{BOIS}"/><rect x="14" y="37" width="10" height="15" fill="{GRIS}"/><rect x="40" y="37" width="10" height="15" fill="{GRIS}"/>'),
    'Toilettes': picto(f'<rect x="22" y="12" width="20" height="16" rx="2" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><path d="M18 30h28v4c0 9-6 14-14 14s-14-5-14-14z" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/><rect x="26" y="46" width="12" height="6" fill="{BLANC}" stroke="{GRIS}" stroke-width="2"/>'),
    'Composter': picto(''.join(f'<rect x="14" y="{22 + i * 8}" width="36" height="6" fill="{BOIS2 if i % 2 else BOIS}"/>' for i in range(4)) + f'<path d="M20 22q4-8 8-2q4-8 8 0q4-6 8 2" fill="{VERT}"/>'),
    'Construire une structure': picto(f'<path d="M14 50V20h36v30M14 20l36 30M50 20L14 50" stroke="{BOIS}" stroke-width="4" fill="none"/><path d="M10 52h44" stroke="{ENC}" stroke-width="2"/>'),
    'Décorer': picto(f'<path d="M32 12l5 12h12l-10 8 4 12-11-8-11 8 4-12-10-8h12z" fill="{J}"/><circle cx="16" cy="48" r="4" fill="{V}"/><circle cx="48" cy="48" r="4" fill="{B}"/>'),
    'Cuisiner': picto(f'<path d="M14 30h36v6c0 8-8 14-18 14s-18-6-18-14z" fill="{B}"/><path d="M50 32h8" stroke="{ENC}" stroke-width="3"/><path d="M24 24q3-5 0-10M32 24q3-5 0-10M40 24q3-5 0-10" stroke="{GRIS}" stroke-width="2" fill="none"/>'),
}
