# CO₂ évité par un article de réemploi = émissions de fabrication (modules A1-A3) d'un produit neuf équivalent,
# d'après une seule base : ÖKOBAUDAT (BBSR, Allemagne), facteurs relevés dans co2_facteurs.csv.
# On ne calcule que quand l'article a les mesures nécessaires ; sinon rien n'est affiché.
import csv, os, re

F = {}
for r in csv.DictReader(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'co2_facteurs.csv'), encoding='utf-8'), delimiter=';'):
    try:
        F[r['famille']] = (float(r['valeur_kgco2e'].replace(',', '.')), r['produit_de_reference'].split(' (')[0], r['source_url'].split('?')[0])
    except ValueError:
        pass

def _n(x):
    try:
        return float(str(x).replace(',', '.'))
    except ValueError:
        return 0.0

def _f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.').replace('.', ',')

def co2(a, dims, unite):
    """Renvoie (kg CO₂e, par quoi, calcul lisible, nom du jeu de données, lien) ou None."""
    t = (a['titre'] + ' ' + ' '.join(a['mots_cles'])).lower()
    fam, mat = a['famille'], a['matiere'].lower()
    d1, d2, d3 = (_n(x) / 100 for x in dims)          # en mètres, d1 ≥ d2 ≥ d3
    surf = d1 * d2

    def par_m2(cle, quoi):
        v = F[cle][0]
        if unite == 'm²':
            return v, 'm²', f'{_f(v)} kg CO₂e par m² de {quoi} neuf', cle
        if unite == 'pièce' and surf:
            return v * surf, 'pièce', f'{_f(d1)} × {_f(d2)} m = {_f(surf)} m² × {_f(v)} kg CO₂e/m² ({quoi} neuf)', cle
        return None

    def par_m3(cle, quoi):
        v = F[cle][0]
        if unite == 'pièce' and d1 and d2 and d3:
            vol = d1 * d2 * d3
            return v * vol, 'pièce', f'{_f(d1)} × {_f(d2)} × {_f(d3)} m = {vol:.4f} m³ × {_f(v)} kg CO₂e/m³ ({quoi} neuf)'.replace('.', ','), cle
        return None

    r = None
    if fam == 'Portes' and surf >= 1:
        if 'garage' in t:
            # seul le modèle sectionnel (acier + mousse) a un jeu de données ; pas les basculantes en bois
            r = par_m2('porte_garage_sectionnelle', 'porte de garage sectionnelle') if 'sectionnel' in t else None
        elif re.search(r'extérieur|entrée|d.entrée', t):
            r = par_m2('porte_exterieure_pvc' if 'pvc' in t + mat else 'porte_exterieure_bois', 'porte extérieure')
        elif 'bois' in t + mat or 'chêne' in t or 'sapin' in t or 'peindre' in t or mat == '':
            r = par_m2('porte_interieure_bois', 'porte intérieure en bois')
    elif fam == 'Châssis et fenêtres' and surf >= 0.15:
        cle = 'fenetre_alu' if 'alu' in t + mat else 'fenetre_bois' if 'bois' in t + mat else 'fenetre_pvc' if 'pvc' in t + mat else None
        if cle:
            r = par_m2(cle, 'châssis ' + cle.split('_')[1].upper().replace('BOIS', 'bois').replace('ALU', 'alu'))
    elif fam == 'Parois de douche' and 'verre' in t + mat and surf >= 0.3:
        v = F['paroi_douche_verre_trempe'][0] * 8
        r = (v * surf, 'pièce', f'{_f(d1)} × {_f(d2)} m = {_f(surf)} m² de verre trempé 8 mm × {_f(v)} kg CO₂e/m²', 'paroi_douche_verre_trempe') if unite == 'pièce' else None
    elif fam == 'Carrelage':
        r = par_m2('carrelage_ceramique', 'carrelage en grès émaillé')
    elif fam == 'Parquet et lambris':
        if 'stratifié' in t:
            r = par_m2('parquet_stratifie', 'parquet stratifié')
        elif 'contrecollé' in t:
            r = par_m2('parquet_contrecolle', 'parquet contrecollé')
        elif 'parquet' in t and 'massif' in t + mat:
            r = par_m2('parquet_massif', 'parquet massif')
    elif fam == 'Baignoires et douches' and surf >= 0.5 and unite == 'pièce':
        if 'acier' in t or 'émail' in t:
            r = par_m2('baignoire_acier_emaille', 'baignoire ou receveur en acier émaillé')
        elif 'acrylique' in t:
            r = par_m2('baignoire_acrylique', 'baignoire ou receveur en acrylique')
    elif fam == 'Robinetterie' and unite == 'pièce' and re.search(r'mitigeur|robinet', t) and 'lavabo' in t:
        v = F['robinet_mitigeur_lavabo'][0]
        r = (v, 'pièce', f'{_f(v)} kg CO₂e par robinet de lavabo neuf', 'robinet_mitigeur_lavabo')
    elif fam == 'Gros œuvre et pierre' and unite == 'pièce':
        if re.search(r'creux|coffrage|boisseau|thermoplan|perfor', t):
            r = None                           # éléments creux : le volume extérieur surestimerait la matière
        elif 'brique' in t:
            r = par_m3('brique_parement', 'brique')
        elif re.search(r'bloc|bordure', t) and 'béton' in t and 'terre cuite' not in t:
            r = par_m3('bloc_beton', 'élément en béton')
        elif 'pavé' in t and d3:
            v = F['paves_beton'][0] / 0.08
            r = (v * surf * d3, 'pièce', f'{_f(surf)} m² × {_f(d3 * 100)} cm de pavé béton × {_f(F["paves_beton"][0])} kg CO₂e/m² pour 8 cm', 'paves_beton') if surf else None
    elif fam == 'Bois et panneaux':
        if 'osb' in t:
            r = par_m3('panneau_osb', 'panneau OSB')
        elif 'aggloméré' in t:
            r = par_m3('panneau_agglomere', 'panneau aggloméré')
        elif re.search(r'planche|madrier|poutre|chevron|latte', t) and 'chêne' in t:
            r = par_m3('bois_scie_chene', 'chêne scié')
        elif re.search(r'planche|madrier|poutre|chevron|latte', t):
            r = par_m3('bois_scie_resineux', 'résineux scié')
    elif fam == 'Toiture et gouttières' and 'tuile' in t and unite == 'm²':
        r = par_m2('tuile_terre_cuite', 'tuiles en terre cuite')
    if not r or r[0] < 0.5:
        return None
    kg, par, calcul, cle = r
    return round(kg, 1 if kg < 10 else 0), par, calcul, F[cle][1], F[cle][2]

NOTE = ('Émissions de fabrication (modules A1-A3, norme EN 15804+A2, part fossile pour le bois) d’un produit neuf équivalent, '
        'calculées avec les mesures de l’article, d’après la base publique ÖKOBAUDAT (ministère fédéral allemand de la construction, '
        'jeux génériques 2026 et moyennes sectorielles), consultée en octobre 2026. Valeur indicative, hors transport et remise en état.')
