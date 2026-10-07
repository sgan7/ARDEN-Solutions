# Traductions du site

Le site est écrit en français (langue par défaut). Un sélecteur à drapeau, en haut à droite de l'en-tête, propose aussi l'anglais, l'arabe (écrit de droite à gauche), le japonais, l'italien et l'allemand. La langue choisie est mémorisée dans le navigateur du visiteur, et l'adresse `?lang=en` (ou `ar`, `ja`, `it`, `de`) ouvre directement une version traduite, par exemple https://arden-solutions.net/?lang=en.

## Fonctionnement

- `assets/i18n.js` traduit la page dans le navigateur et affiche le sélecteur.
- `assets/i18n/<langue>.json` contient les traductions, indexées par le texte français exact.
- Les textes à traduire sont tenus dans `outils/i18n_textes_1.py` (interface, accueil, contact, actualités), `_2.py` (domaines 01 à 05) et `_3.py` (domaines 06 à 10). Une ligne = le texte français suivi de l'anglais, l'arabe, le japonais, l'italien et l'allemand.
- Le français n'est jamais modifié : sans JavaScript, ou pour Google, la page reste en français comme avant. Les balises `hreflang` signalent les versions traduites.

## Modifier ou ajouter un texte

1. Dans `outils/i18n_textes_*.py`, modifier la ligne concernée, ou en ajouter une avec le texte français exactement comme il apparaît sur le site.
2. Lancer `python3 outils/traductions.py` : il régénère les dictionnaires et ajoute le sélecteur aux pages qui ne l'ont pas encore.
3. Publier (pousser sur `main`).

Si un texte du site change en français sans que sa ligne soit mise à jour, il s'affiche simplement en français dans les autres langues.

Les articles d'actualité restent en français : dans les autres langues, la page de l'article l'indique au lecteur, et seuls le menu, les boutons et la date sont traduits.
