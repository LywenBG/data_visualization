# Borderless — 4 pages D3.js, 4 techniques distinctes

Projet universitaire d'Information Visualization, conçu pour une équipe de 4. Il explore les exigences de visa (2026) et les liaisons aériennes internationales répertoriées à partir des archives CSV fournies. **Toutes les données sont intégrées au projet**, aucun téléversement utilisateur n'est nécessaire.

## Démarrage

Pré-requis : Python 3 et une connexion Internet pour charger la bibliothèque D3 v7 depuis le CDN.

```bash
cd DataViz
make serve
```

Puis ouvrir http://localhost:8000 ou directement `http://localhost:8000/matrice.html`.

Ne pas ouvrir les pages par double-clic `file://` : les requêtes `fetch()` vers `data/` sont bloquées par le navigateur dans ce mode.

## Les 4 pages

1. **`matrice.html` — heatmap** : comparaison multi-passeports / destinations, recherche et détail d'une cellule ; choix d'un couple étudié pour la suite du parcours.
2. **`carte.html` — géographique + réseau** : clic sur un pays **équivalent au changement du champ « Passeport analysé »** (menu, couleurs, arcs, métriques, fiche synchronisés) ; Maj + clic = inspecter une destination sans changer de passeport.
3. **`correlation.html` — scatter plot** : mobilité vs connectivité, axes modifiables, rayon par volume de routes, coefficient de Pearson.
4. **`paralleles.html` — coordonnées parallèles** : cinq indicateurs, deux tracés très visibles (orange = pays étudié, bleu pointillé = référence), cinq badges de valeur sur les axes, cinq cartes chiffrées avec deux barres de comparaison, filtres multi-axes et changement libre du profil. Après avoir choisi un pays, on peut en sélectionner un autre librement par le menu « Pays à examiner », sur les lignes ou dans les suggestions ; les filtres restent actifs.

Chaque page suit les principes **overview + detail**, présente le **but concret de la technique**, un guide en trois étapes, des explications d’interprétation, une section sur les transformations et des infobulles/détails au clic.

## Structure

```text
DataViz/
├── matrice.html               # étape 1, membre 2
├── carte.html                 # étape 2, membre 1
├── correlation.html           # membre 3
├── paralleles.html           # membre 4
├── index.html                 # redirection vers la matrice
├── src/
│   ├── app.js                # état, chargement, agrégations et vues D3
│   └── styles.css            # design responsive commun
├── data/
│   ├── borderless-fixed.json # données normalisées, locales
│   └── world.geojson         # fond cartographique
├── docs/PIPELINE.md          # sources, transformations, mapping, limites
├── tests/check_data.py      # contrôle de cohérence minimal
└── Makefile
```

## Sources et limites

- Passeports et visas : [Global Passport Power Rankings & Visa Requirements — Kaggle](https://www.kaggle.com/datasets/ngshiheng/henley-passport-index-visa-requirements) (`visa_requirements.csv`, `passport_rankings.csv`, `countries.csv`).
- Aéroports (référentiel complémentaire) : [Airports, Train Stations, and Ferry Terminals — Kaggle](https://www.kaggle.com/datasets/open-flights/airports-train-stations-and-ferry-terminals) (`airports-extended.csv`).
- Routes et aéroports : [Airline Routes and Airports — Kaggle ducling](https://www.kaggle.com/datasets/ducling/airline-routes-and-airports) (`routes.csv`, `airports.csv` et fichiers associés).
- Les droits de visa sont documentés pour **2026 uniquement**. Les routes sont **non datées** et ne renseignent ni fréquence ni passagers.
- Aucune courbe d'évolution annuelle n'est simulée. Voir [docs/PIPELINE.md](docs/PIPELINE.md) pour les choix de construction et la portée des inférences.

## Tester

```bash
make check
```

La commande `make check` vérifie la syntaxe JS, les agrégations, les sélecteurs et les invariants des données et pages. Avec `pip install playwright` puis une installation locale de Chromium, `make check-visual` exécute en plus 16 contrôles de mise en page sur 4 largeurs. **Les gestes D3 complets (zoom, brushing, clic) doivent encore être validés dans un navigateur avec le serveur local.**

## Répartition suggérée

- Membre 1 : carte / réseau, projection, zoom et détails géographiques.
- Membre 2 : matrice et interactions de comparaison / recherche.
- Membre 3 : scatter plot, régression, modalités de comparaison.
- Membre 4 : coordonnées parallèles, brushing et profils filtrés.

Tous documentent ensemble le nettoyage, les limites et le public cible. Une mise en commun du code partagé dans `app.js` est nécessaire avant de fusionner les branches Git.

## Utilisation des profils multivariés

1. Ouvrir `paralleles.html`, puis sélectionner le passeport de référence (ligne bleu foncé).
2. Utiliser **Pays à examiner** pour choisir n’importe quel profil (ligne orange). Le choix peut être modifié autant de fois que nécessaire.
3. Tracer des intervalles sur les axes verticaux : les profils non compatibles s’atténuent sans disparaître du dataset.
4. Cliquer sur une autre ligne / une suggestion ou changer le menu de pays pour une nouvelle sélection ; les intervalles restent en place.
5. Double-cliquer sur un axe pour enlever ce filtre, ou utiliser **Effacer les filtres d’axes** pour tout réinitialiser.

Les quatre encadrés « But de la technique » décrivent les fonctionnalités réellement possibles avec les données disponibles ; ils ne prétendent pas montrer une évolution annuelle.

## Correctifs ergonomiques et bugs (audit de novembre 2026)

- **Carte sans encadré :** contour, fond de carte-cadre et ombre supprimés de la zone de visualisation ; le panneau de détails reste indépendant.
- **Téléphone :** barre de navigation horizontale scrollable sans étirer tout le document ; bloc « But de la technique » visible aussi sur mobile.
- **Diagrammes denses :** défilement horizontal **interne** à la heatmap, au nuage et aux coordonnées parallèles pour conserver des axes lisibles.
- **Carte :** zoom et visibilité des arcs conservés lors des changements de filtres ; bouton « Recentrer » et territoire sélectionné mis en évidence ; arcs cohérents avec la catégorie filtrée ; légende du pays d'origine ajoutée.
- **Matrice :** le filtre de visa agit sur les destinations des deux passeports étudiés ; recherche tolérante aux accents ; message explicite si aucune destination ; un clic sur une cellule ne change plus le passeport principal ; entêtes améliorés.
- **Corrélation :** taille minimale des points, sélection au clavier et au clic, droite de régression rognée à la zone du graphique ; choix de l’échelle Y pour mieux répartir les points.
- **Coordonnées parallèles :** sélection modifiable à tout moment, ligne étudiée mise au premier plan, filtres conservés.
- **Données :** certains territoires ne disposent pas d'un profil passeport, mais leurs catégories de visa et routes restent consultables dans la fiche au lieu de disparaître.
- **Navigation :** le passeport choisi est conservé pendant la session lors du passage entre les quatre pages (stockage de session local du navigateur).

### Vérifications

`make check` vérifie les calculs de base et la présence des composants. `make check-visual` (facultatif) reproduit 16 conditions d'affichage avec Chromium et vérifie l'absence de débordement de page, la visibilité du but de chaque technique et l'absence de cadre de la carte. Le test de mise en page utilise un graphique simulé : il ne prétend pas exécuter tous les gestes interactifs D3. La bibliothèque D3 nécessite encore une connexion Internet au chargement initial depuis son CDN.

## Ajustements d'ergonomie — sélection sur la carte et comparaison des profils (novembre 2026)

- **Carte :** la sélection par clic et par menu appelle une fonction commune `choosePassport()`. Les deux gestes actualisent `#passport`, les statistiques, les catégories de visa, les routes et la fiche. Les filtres et le zoom sont conservés. **Maj + clic** inspecte uniquement une destination. Lorsqu'un territoire n'a pas de fiche passeport, le site l'explique au lieu de l'ajouter artificiellement au menu.
- **Profils :** visualisation conçue pour comparer *un pays examiné* (orange) à *un passeport de référence* (bleu pointillé). Les 5 points orange avec leurs valeurs se déplacent quand on change de pays. Un comparateur supérieur donne pour chaque indicateur les deux valeurs exactes, leur écart et deux barres. Les profils des autres pays restent en arrière-plan pour la distribution. Les sélections de plage (brushing) ne détruisent pas le graphique.
- **Lecture :** chaque axe a sa propre échelle ; une ligne plus haute ne signifie pas une valeur absolue comparable d'un axe à l'autre. « Pays reliés » est le nombre de pays étrangers connectés selon le dataset ; « routes sortantes » est le nombre de paires d'aéroports internationales distinctes. Aucun de ces indicateurs n'est une fréquence de vols.

Tests automatiques : `make check`, `make check-visual`. Le navigateur réel peut exiger le chargement externe de D3 v7 depuis un CDN.

## Page pédagogique « Pipeline des données »

Une page supplémentaire, [`pipeline.html`](pipeline.html), décrit les sources, les neuf étapes de transformation, les indicateurs dérivés, les mappings visuels des quatre techniques et les limites d’interprétation. Elle est accessible depuis la navigation des quatre visualisations. Les sources et les calculs du pipeline sont conservés. La navigation, le suivi du contexte et les styles associés au scénario ont été ajoutés.


## CSV d’origine et pipeline reproductible (DataViz)

Les fichiers des **trois archives Kaggle** sont maintenant conservés dans `data/raw/`, sous trois dossiers distincts afin d’éviter les confusions entre les deux fichiers portant le nom `airports.csv` ou leur référentiel étendu. Ils sont laissés **strictement identiques** aux fichiers fournis.

- `data/raw/01_airports_openflights/` : `airports-extended.csv` (référentiel complémentaire utilisé comme contrôle croisé des codes IATA).
- `data/raw/02_passeports_visas/` : `countries.csv`, `passport_rankings.csv`, `visa_requirements.csv`.
- `data/raw/03_routes_ducling/` : `routes.csv`, `airports.csv`, et les fichiers d’origine supplémentaires `airlines.csv`, `alliances.csv`, `equipment.csv` (non exploités dans les quatre indicateurs actuels).

Pour **reconstruire les données à partir des CSV**, sans changer ce qui s’affiche dans Borderless :

```bash
python3 scripts/prepare_data.py --check
```

Cette commande génère `data/processed/borderless-rebuilt.json` et compare son contenu au JSON utilisé par les quatre pages (`data/borderless-fixed.json`). Le résultat est **identique**, avec **45 173 règles de visa, 199 passeports et 11 731 routes orientées internationales distinctes**. Aucun fichier utilisé par l’application n’est écrasé.

Les deux supports complémentaires sont :

- La page HTML [`pipeline.html`](pipeline.html), consultable via la navigation du site, avec les deux jointures d’aéroports montrées étape par étape.
- Le rapport Markdown [`docs/PIPELINE.md`](docs/PIPELINE.md), notamment la section **7** avec les CSV, transformations, exemples réels, calculs, jointures, contrôles de qualité et formulation pour l’oral.

**Démarrage :** `make serve` depuis `DataViz`, puis `http://localhost:8000`. Le pipeline et les fichiers de données restent inchangés. La navigation et le code d'état de `src/app.js` ont été complétés pour suivre le scénario en quatre étapes.

## Parcours d'analyse en 4 étapes

L'application suit une question : **les droits associés à un passeport correspondent-ils à la connectivité aérienne du pays ?**

1. **Matrice des visas :** comparer les formalités de deux passeports et choisir une destination à examiner.
2. **Carte et routes :** vérifier la présence de liaisons enregistrées et situer les destinations.
3. **Corrélation :** tester la relation descriptive sur l'ensemble des pays.
4. **Profils multivariés :** approfondir les écarts entre pays sur cinq indicateurs.

Le passeport, la comparaison, la destination inspectée et le profil examiné sont conservés entre les pages. L'analyse démarre sur `matrice.html`. Le scénario et les limites sont détaillés dans [`docs/SCENARIO.md`](docs/SCENARIO.md).

