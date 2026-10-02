# Publier une actualité ou des photos

## Ce que vous envoyez à Claude (dans le projet ARDEN Solutions)

Pour un article :

1. **Le titre** (ou laissez Claude le proposer).
2. **La date** de l'événement et **le lieu** (ville, région).
3. **Le texte**, même brut : notes, compte rendu, message WhatsApp. Claude le met en forme
   (résumé, intertitres, points clés) sans changer le sens, et vous montre le résultat.
4. **Les photos** (3 à 10 conseillées), avec si possible une légende pour chacune
   (qui, quoi, où) et le crédit photo. Indiquez celle à mettre en couverture.
5. Facultatif : le **domaine d'expertise** concerné et le **partenaire** à citer.

Pour la galerie seule : envoyez les photos avec leurs légendes, sans texte.

Claude publie, vérifie la page en ligne et vous envoie le lien à partager.
Pour corriger ou retirer un article, il suffit de le demander.

À vérifier avant d'envoyer : l'accord des personnes reconnaissables sur les photos
(surtout les enfants) et l'accord du partenaire pour citer le projet.

## Ce que Claude fait (procédure technique)

- Les articles sont dans `contenu/actualites.json`, les photos de la galerie qui ne viennent
  pas d'un article dans `contenu/galerie.json`.
- Photos d'un article : `images/actualites/<slug>/couverture.jpg`, `photo-01.jpg`, …
  Photos de galerie : `images/galerie/<date>-<nom>.jpg`. Le générateur les réduit à 1600 px,
  les enregistre en JPEG, retire les métadonnées (dont la position GPS) et crée une vignette
  `-640.jpg`. Un fichier .png ou .jpeg au même nom est converti en .jpg. Les .heic sont à
  convertir en .jpg avant.
- Champs d'un article : `slug` (minuscules et tirets, devient l'adresse
  `/actualites/<slug>.html`), `publie` (true/false), `titre`, `date` (AAAA-MM-JJ), `lieu`,
  `domaine` (slug d'une page de `/domaines/`, facultatif), `resume` (1 à 2 phrases, sert aussi
  de description Google), `couverture` {`fichier`, `alt`, `legende`}, `corps` (liste de
  paragraphes ; `## ` intertitre, `- ` liste, `> ` citation, `**gras**`, `[lien](url)`),
  `photos` [{`fichier`, `alt`, `legende`}], `modifie` (date de mise à jour, facultatif).
  Une photo galerie : {`fichier`, `alt`, `legende`, `date`}.
- `alt` est obligatoire : une description factuelle de la photo.
- Lancer `python3 outils/actualites.py` (Pillow requis). Il régénère `actualites/index.html`,
  chaque `actualites/<slug>.html` et `sitemap.xml`, et supprime les pages d'articles retirés
  du fichier.
- `modele-article` reste à `publie: false` : page de démonstration en noindex, absente de la
  liste et du sitemap (https://arden-solutions.net/actualites/modele-article.html).
- Pousser sur `main` (Render redéploie), puis ouvrir la page en ligne.
