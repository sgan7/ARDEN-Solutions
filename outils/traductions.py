#!/usr/bin/env python3
"""Traduction du site ARDEN Solutions (français par défaut).

    python3 outils/traductions.py

1. Génère les dictionnaires assets/i18n/<langue>.json à partir des textes de
   outils/i18n_textes_1.py, _2.py et _3.py (une ligne = un texte français et
   ses traductions en anglais, arabe, japonais, italien et allemand).
2. Ajoute, si elles manquent, dans l'accueil, les pages domaines et les pages
   actualités : les balises hreflang et le script /assets/i18n.js qui traduit
   la page et affiche le sélecteur de langue à drapeau.

Pour traduire un nouveau texte du site : ajouter une ligne dans un des fichiers
i18n_textes_*.py (le texte français exactement comme sur le site), puis relancer
ce script. Un texte absent des dictionnaires reste simplement en français.
"""
import glob
import json
import os
import re
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
SITE = "https://arden-solutions.net"
LANGUES = ["en", "ar", "ja", "it", "de"]
sys.path.insert(0, ICI)


def chemin(*p):
    return os.path.join(RACINE, *p)


def dictionnaires():
    import i18n_textes_1, i18n_textes_2, i18n_textes_3
    lignes = i18n_textes_1.LIGNES + i18n_textes_2.LIGNES + i18n_textes_3.LIGNES
    os.makedirs(chemin("assets", "i18n"), exist_ok=True)
    vus = set()
    for l in lignes:
        assert len(l) == 6, l[0]
        assert l[0] not in vus, "texte en double : " + l[0]
        vus.add(l[0])
    for i, code in enumerate(LANGUES, start=1):
        d = {l[0]: l[i] for l in lignes}
        with open(chemin("assets", "i18n", code + ".json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=0, sort_keys=True)
            f.write("\n")
    print(f"{len(lignes)} textes traduits en {len(LANGUES)} langues")


def balises(url):
    """hreflang : la version française est l'adresse normale, les autres
    ajoutent ?lang=xx (même page, traduite dans le navigateur)."""
    lignes = [f'<link rel="alternate" hreflang="fr" href="{url}">']
    lignes += [f'<link rel="alternate" hreflang="{c}" href="{url}?lang={c}">' for c in LANGUES]
    lignes.append(f'<link rel="alternate" hreflang="x-default" href="{url}">')
    return "\n".join(lignes)


SCRIPT = '<script src="/assets/i18n.js"></script>'


def page_statique(fichier):
    s = open(fichier, encoding="utf-8").read()
    if SCRIPT in s:
        return False
    m = re.search(r'<link rel="canonical" href="([^"]+)">', s)
    if not m:  # page non indexée (modèle) : pas de hreflang, seulement le script
        s = s.replace("</head>", SCRIPT + "\n</head>", 1)
    else:
        s = s.replace(m.group(0), m.group(0) + "\n" + balises(m.group(1)) + "\n" + SCRIPT, 1)
    open(fichier, "w", encoding="utf-8").write(s)
    return True


def accueil():
    f = chemin("index.html")
    s = open(f, encoding="utf-8").read()
    if 'hreflang=\\"fr\\"' in s:
        return False
    can = f'<link rel="canonical" href="{SITE}/">'
    # 1. En-tête du chargeur (ce que lisent les robots sans JavaScript).
    assert s.count(can) == 1
    s = s.replace(can, can + "\n" + balises(SITE + "/"), 1)
    # 2. En-tête du gabarit (chaîne JSON) : hreflang + script de traduction.
    #    Dans cette chaîne, « </ » est écrit « <\/ » ; on remplace le texte brut.
    can_json = json.dumps(can)[1:-1].replace("</", "<\\/")
    ajout = json.dumps("\n" + balises(SITE + "/") + "\n" + SCRIPT)[1:-1].replace("</", "<\\/")
    assert s.count(can_json) == 1, "canonical du gabarit introuvable"
    s = s.replace(can_json, can_json + ajout, 1)
    open(f, "w", encoding="utf-8").write(s)
    return True


def main():
    dictionnaires()
    n = 0
    n += accueil()
    for f in sorted(glob.glob(chemin("domaines", "*.html")) + glob.glob(chemin("actualites", "*.html"))):
        n += page_statique(f)
    print(f"{n} page(s) reliée(s) au sélecteur de langue")


if __name__ == "__main__":
    main()
