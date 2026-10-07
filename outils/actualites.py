#!/usr/bin/env python3
"""Génère la rubrique Actualités et la galerie du site ARDEN Solutions.

Sources :
  contenu/actualites.json  articles (voir PUBLIER-ACTUALITES.md pour le format)
  contenu/galerie.json     photos de la galerie qui ne viennent pas d'un article
  images/...               photos ; elles sont optimisées ici (1600 px max, JPEG,
                           métadonnées et position GPS retirées) et une vignette
                           -640.jpg est créée à côté de chacune

Sorties : actualites/index.html, actualites/<slug>.html, sitemap.xml.

Usage : python3 outils/actualites.py   (depuis la racine du dépôt ; nécessite Pillow)
"""
import datetime
import glob
import html
import json
import os
import re
import sys

from PIL import Image, ImageOps

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://arden-solutions.net"
LARGEUR_MAX = 1600
LARGEUR_VIGNETTE = 640
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]


def chemin(*p):
    return os.path.join(RACINE, *p)


def e(s):
    return html.escape(str(s), quote=True)


def date_fr(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day}{'er' if d.day == 1 else ''} {MOIS[d.month - 1]} {d.year}"


def inline(texte):
    """Texte échappé, avec **gras** et [lien](url)."""
    t = e(texte)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', t)


def corps_html(blocs):
    out, liste = [], []

    def fermer():
        if liste:
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in liste) + "</ul>")
            liste.clear()

    for b in blocs:
        b = b.strip()
        if b.startswith("- "):
            liste.append(b[2:])
            continue
        fermer()
        if b.startswith("## "):
            out.append(f"<h2>{inline(b[3:])}</h2>")
        elif b.startswith("> "):
            out.append(f"<blockquote>{inline(b[2:])}</blockquote>")
        elif b:
            out.append(f"<p>{inline(b)}</p>")
    fermer()
    return "\n".join(out)


# ---------- photos ----------

def preparer_photo(rel):
    """Optimise la photo (en place) et crée sa vignette. Renvoie (largeur, hauteur)."""
    rel = rel.lstrip("/")
    dest = chemin(rel)
    if not os.path.exists(dest):
        base = os.path.splitext(dest)[0]
        autres = [p for p in glob.glob(base + ".*") if not p.endswith(".jpg")]
        if not autres:
            sys.exit(f"Photo introuvable : {rel}")
        src = autres[0]
    else:
        src = dest
    vignette = os.path.splitext(dest)[0] + f"-{LARGEUR_VIGNETTE}.jpg"
    if src == dest and os.path.exists(vignette) and os.path.getmtime(vignette) >= os.path.getmtime(dest):
        with Image.open(dest) as im:
            return im.size
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        if im.width > LARGEUR_MAX:
            im = im.resize((LARGEUR_MAX, round(im.height * LARGEUR_MAX / im.width)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
        petite = im.copy()
        petite.thumbnail((LARGEUR_VIGNETTE, LARGEUR_VIGNETTE * 2), Image.LANCZOS)
        petite.save(vignette, "JPEG", quality=78, optimize=True, progressive=True)
        taille = im.size
    if src != dest:
        os.remove(src)
    return taille


def vignette(rel):
    return "/" + os.path.splitext(rel.lstrip("/"))[0] + f"-{LARGEUR_VIGNETTE}.jpg"


def url_photo(rel):
    return "/" + rel.lstrip("/")


# ---------- gabarit commun ----------

def domaines():
    """slug -> nom, lus dans les pages /domaines/."""
    res = {}
    for p in sorted(glob.glob(chemin("domaines", "*.html"))):
        m = re.search(r"<h1>(.*?)</h1>", open(p, encoding="utf-8").read())
        if m:
            res[os.path.basename(p)[:-5]] = html.unescape(m.group(1))
    return res


def hreflang(url):
    """Versions traduites (sélecteur de langue, voir outils/traductions.py)."""
    langues = ["en", "ar", "ja", "it", "de"]
    return "\n".join([f'<link rel="alternate" hreflang="fr" href="{url}">']
                     + [f'<link rel="alternate" hreflang="{c}" href="{url}?lang={c}">' for c in langues]
                     + [f'<link rel="alternate" hreflang="x-default" href="{url}">'])


def page(titre, description, url, corps, jsonld, og_image=None, og_type="website",
         robots=None, extra_head=""):
    og_image = og_image or f"{SITE}/og-image.png"
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<title>{e(titre)}</title>
<meta name="description" content="{e(description)}">
{f'<meta name="robots" content="{robots}">' if robots else f'<link rel="canonical" href="{url}">' + chr(10) + hreflang(url)}
<script src="/assets/i18n.js"></script>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0E1B4D">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="ARDEN Solutions">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(titre)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
{extra_head}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/actualites.css">
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>
</head>
<body>
<header><div class="wrap">
<a href="/" aria-label="ARDEN Solutions, accueil"><img src="/logo.png" alt="ARDEN Solutions" width="150" height="44"></a>
<nav aria-label="Navigation principale"><a href="/#secteurs">Secteurs</a><a href="/#approche">Approche</a><a href="/#valeurs">Valeurs</a><a class="news" href="/actualites/" aria-current="page">Actualités</a><a class="btn" href="/#contact">Nous contacter</a></nav>
</div></header>
<main>
{corps}
<section><div class="wrap">
<div class="cta">
<div><h2>Parlons de votre projet</h2>
<p class="coords">Cité Keur-Gorgui, Dakar, Sénégal · <a href="tel:+221338436491">+221 33 84364 91</a> · <a href="mailto:contact@arden-solutions.net">contact@arden-solutions.net</a></p>
<p>Nous revenons vers vous sous 48h pour un premier échange, sans engagement.</p></div>
<a class="btn" href="/#contact">Nous écrire</a>
</div>
</div></section>
</main>
<footer><div class="wrap"><span>© {datetime.date.today().year} ARDEN Solutions. Tous droits réservés.</span><span>Conseil &amp; solutions multi-secteurs · Dakar, Sénégal</span></div></footer>
<script src="/assets/galerie.js" defer></script>
</body>
</html>
"""


ORGANISATION = {"@type": "ProfessionalService", "@id": f"{SITE}/#organisation", "name": "ARDEN Solutions",
                "url": f"{SITE}/", "logo": f"{SITE}/logo.png"}


def carte(a, doms, une=False):
    c = a["couverture"]
    w, h = a["_tailles"][c["fichier"]]
    dom = f'<span class="dom">{e(doms[a["domaine"]])}</span>' if a.get("domaine") in doms else ""
    src = url_photo(c["fichier"]) if une else vignette(c["fichier"])
    return (f'<li><article class="card"><div class="ph"><img src="{src}" alt="{e(c["alt"])}" '
            f'width="{w}" height="{h}" loading="{"eager" if une else "lazy"}"></div><div class="bd">'
            f'<time datetime="{a["date"]}">{date_fr(a["date"])}{" · " + e(a["lieu"]) if a.get("lieu") else ""}</time>'
            f'<h3><a href="/actualites/{a["slug"]}.html">{e(a["titre"])}</a></h3>'
            f'<p>{e(a["resume"])}</p>{dom}<span class="more">Lire l\'article →</span></div></article></li>')


def grille_photos(photos, tailles, classe="gal"):
    items = []
    for p in photos:
        w, h = tailles[p["fichier"]]
        leg = p.get("legende", "")
        lien = f' · <a href="/actualites/{p["_article"]}.html">voir l\'article</a>' if p.get("_article") else ""
        items.append(
            f'<li><figure><a href="{url_photo(p["fichier"])}" data-lb="{e(leg)}"><img src="{vignette(p["fichier"])}" '
            f'alt="{e(p["alt"])}" width="{w}" height="{h}" loading="lazy"></a>'
            + (f"<figcaption>{e(leg)}{lien}</figcaption>" if leg or lien else "") + "</figure></li>")
    return f'<ul class="{classe}">' + "".join(items) + "</ul>"


def page_article(a, publies, doms):
    url = f"{SITE}/actualites/{a['slug']}.html"
    c = a["couverture"]
    w, h = a["_tailles"][c["fichier"]]
    brouillon = not a.get("publie")
    dom = (f'<a href="/domaines/{a["domaine"]}.html">{e(doms[a["domaine"]])}</a>'
           if a.get("domaine") in doms else "")
    meta = [f'<time datetime="{a["date"]}">{date_fr(a["date"])}</time>']
    if a.get("lieu"):
        meta.append(f"<span>{e(a['lieu'])}</span>")
    if dom:
        meta.append(dom)
    partage = (f'<div class="share"><span>Partager :</span>'
               f'<a href="https://www.linkedin.com/sharing/share-offsite/?url={url}" rel="noopener" target="_blank">LinkedIn</a>'
               f'<a href="https://wa.me/?text={e(a["titre"])}%20{url}" rel="noopener" target="_blank">WhatsApp</a>'
               f'<a href="https://www.facebook.com/sharer/sharer.php?u={url}" rel="noopener" target="_blank">Facebook</a></div>')
    photos = a.get("photos", [])
    autres = [x for x in publies if x["slug"] != a["slug"]][:3]
    corps = (
        (f'<div class="draft"><div class="wrap"><strong>Modèle, non publié.</strong> Cette page montre la mise en forme '
         f'd\'un article. Elle n\'apparaît ni dans la liste des actualités ni dans Google.</div></div>' if brouillon else "")
        + f'<div class="hero"><div class="wrap">'
        f'<nav class="crumbs" aria-label="Fil d\'Ariane"><a href="/">Accueil</a> › <a href="/actualites/">Actualités</a> › {e(a["titre"])}</nav>'
        f'<h1>{e(a["titre"])}</h1><div class="meta">{"<span>·</span>".join(meta)}</div>'
        f'<p class="intro">{e(a["resume"])}</p></div></div>'
        f'<div class="cover"><div class="wrap"><figure><img src="{url_photo(c["fichier"])}" alt="{e(c["alt"])}" '
        f'width="{w}" height="{h}" fetchpriority="high">'
        + (f'<figcaption>{e(c["legende"])}</figcaption>' if c.get("legende") else "")
        + f'</figure></div></div>'
        f'<section><div class="wrap"><article class="prose">{corps_html(a["corps"])}{partage}</article></div></section>'
        + (f'<section style="padding-top:0"><div class="wrap"><h2>En images</h2>'
           f'{grille_photos(photos, a["_tailles"], "gal g3")}</div></section>' if photos else "")
        + (f'<section style="padding-top:0"><div class="wrap"><h2>Autres actualités</h2><ul class="cards">'
           + "".join(carte(x, doms) for x in autres) + "</ul></div></section>" if autres else "")
    )
    images = [f"{SITE}{url_photo(c['fichier'])}"] + [f"{SITE}{url_photo(p['fichier'])}" for p in photos]
    jsonld = {"@context": "https://schema.org", "@graph": [
        {"@type": "NewsArticle", "@id": f"{url}#article", "headline": a["titre"], "description": a["resume"],
         "datePublished": a["date"], "dateModified": a.get("modifie", a["date"]), "image": images,
         "mainEntityOfPage": url, "inLanguage": "fr",
         "author": {"@id": f"{SITE}/#organisation"}, "publisher": {"@id": f"{SITE}/#organisation"}},
        ORGANISATION,
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Actualités", "item": f"{SITE}/actualites/"},
            {"@type": "ListItem", "position": 3, "name": a["titre"], "item": url}]}]}
    head = (f'<meta property="article:published_time" content="{a["date"]}">\n'
            f'<meta property="og:image:alt" content="{e(c["alt"])}">\n')
    return page(f"{a['titre']} | ARDEN Solutions", a["resume"], url, corps, jsonld,
                og_image=images[0], og_type="article", robots="noindex, nofollow" if brouillon else None,
                extra_head=head).replace(' aria-current="page"', "")


def page_index(publies, galerie, tailles, doms):
    url = f"{SITE}/actualites/"
    if publies:
        liste = (f'<ul class="cards une">{carte(publies[0], doms, une=True)}</ul>'
                 + (f'<ul class="cards" style="margin-top:24px">' + "".join(carte(a, doms) for a in publies[1:]) + "</ul>"
                    if len(publies) > 1 else ""))
    else:
        liste = ('<div class="empty"><strong>Nos premières actualités arrivent bientôt.</strong>'
                 'Missions sur le terrain, ateliers, rapports et partenariats : nous partagerons ici la vie de nos projets.</div>')
    gal = (f'<section style="padding-top:0" id="galerie"><div class="wrap"><h2>Galerie photos</h2>'
           f'{grille_photos(galerie, tailles)}</div></section>' if galerie else "")
    corps = (
        '<div class="hero"><div class="wrap">'
        '<nav class="crumbs" aria-label="Fil d\'Ariane"><a href="/">Accueil</a> › Actualités</nav>'
        '<div class="eyebrow">Actualités</div><h1>Nos actualités</h1>'
        '<p class="intro">Missions sur le terrain, ateliers, publications et partenariats : '
        'suivez les projets que nous menons au Sénégal et en Afrique de l\'Ouest.</p></div></div>'
        f'<section><div class="wrap">{liste}</div></section>{gal}')
    jsonld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": f"{url}#page", "name": "Actualités d'ARDEN Solutions", "url": url,
         "inLanguage": "fr", "isPartOf": {"@id": f"{SITE}/#organisation"},
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/actualites/{a['slug']}.html", "name": a["titre"]}
             for i, a in enumerate(publies)]}},
        ORGANISATION,
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Actualités", "item": url}]}]}
    return page("Actualités et galerie photos | ARDEN Solutions",
                "Les actualités d'ARDEN Solutions, cabinet de conseil à Dakar : missions sur le terrain, ateliers, "
                "publications, partenariats et galerie photos.", url, corps, jsonld)


def sitemap(publies):
    fichier = chemin("sitemap.xml")
    anciennes = dict(re.findall(r"<loc>(.*?)</loc>\s*<lastmod>(.*?)</lastmod>",
                                open(fichier, encoding="utf-8").read())) if os.path.exists(fichier) else {}
    aujourdhui = datetime.date.today().isoformat()
    urls = [f"{SITE}/"] + [f"{SITE}/domaines/{os.path.basename(p)}" for p in sorted(glob.glob(chemin("domaines", "*.html")))]
    urls.append(f"{SITE}/actualites/")
    dates = {f"{SITE}/actualites/": max([a.get("modifie", a["date"]) for a in publies], default=None)}
    for a in publies:
        u = f"{SITE}/actualites/{a['slug']}.html"
        urls.append(u)
        dates[u] = a.get("modifie", a["date"])
    lignes = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lignes.append(f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{dates.get(u) or anciennes.get(u) or aujourdhui}</lastmod>\n  </url>")
    lignes.append("</urlset>")
    open(fichier, "w", encoding="utf-8").write("\n".join(lignes) + "\n")


def main():
    articles = json.load(open(chemin("contenu", "actualites.json"), encoding="utf-8"))
    galerie_seule = json.load(open(chemin("contenu", "galerie.json"), encoding="utf-8"))
    doms = domaines()
    slugs = set()
    for a in articles:
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", a["slug"]) or a["slug"] in slugs or a["slug"] == "index":
            sys.exit(f"Slug invalide ou en double : {a['slug']}")
        slugs.add(a["slug"])
        datetime.date.fromisoformat(a["date"])
        if a.get("domaine") and a["domaine"] not in doms:
            sys.exit(f"Domaine inconnu pour {a['slug']} : {a['domaine']} (choix : {', '.join(doms)})")
        a["_tailles"] = {}
        for p in [a["couverture"]] + a.get("photos", []):
            if not p.get("alt"):
                sys.exit(f"Texte alternatif (alt) manquant pour {p['fichier']}")
            a["_tailles"][p["fichier"]] = preparer_photo(p["fichier"])
    publies = sorted([a for a in articles if a.get("publie")], key=lambda a: a["date"], reverse=True)

    # Galerie : photos des articles publiés (la plus récente d'abord), puis photos seules.
    tailles, galerie = {}, []
    for a in publies:
        for p in [a["couverture"]] + a.get("photos", []):
            galerie.append(dict(p, _article=a["slug"]))
            tailles[p["fichier"]] = a["_tailles"][p["fichier"]]
    for p in sorted(galerie_seule, key=lambda p: p.get("date", ""), reverse=True):
        if not p.get("alt"):
            sys.exit(f"Texte alternatif (alt) manquant pour {p['fichier']}")
        tailles[p["fichier"]] = preparer_photo(p["fichier"])
        galerie.append(p)

    # Les anciennes pages d'articles retirés du fichier sont supprimées.
    for p in glob.glob(chemin("actualites", "*.html")):
        if os.path.basename(p) != "index.html" and os.path.basename(p)[:-5] not in slugs:
            os.remove(p)
    for a in articles:
        open(chemin("actualites", f"{a['slug']}.html"), "w", encoding="utf-8").write(page_article(a, publies, doms))
    open(chemin("actualites", "index.html"), "w", encoding="utf-8").write(page_index(publies, galerie, tailles, doms))
    sitemap(publies)
    print(f"{len(publies)} article(s) publié(s), {len(articles) - len(publies)} non publié(s), "
          f"{len(galerie)} photo(s) en galerie.")


if __name__ == "__main__":
    main()
