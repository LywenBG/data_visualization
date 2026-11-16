# DataViz — Borderless

Projet de visualisation de données réalisé dans le cadre du cours d'Information Visualization.

L'objectif est de comparer les possibilités de voyage offertes par les passeports avec les connexions aériennes entre pays. On s'intéresse notamment à une question : **un pays dont le passeport donne accès à beaucoup de destinations est-il aussi bien connecté par avion ?**

Le site utilise D3.js et propose quatre visualisations interactives, chacune avec une façon différente d'explorer les mêmes données.

## Lancer le projet

Il faut Python 3 et une connexion Internet pour charger D3.js.

Depuis le dossier `DataViz` :

```bash
make serve
```

Ouvrir ensuite http://localhost:8000 dans un navigateur.

Pour lancer les vérifications :

```bash
make check
```

Les données sont déjà présentes dans le projet. Aucun fichier n'est à importer sur le site.

## Les visualisations

| Page | Technique | Objectif |
| --- | --- | --- |
| `carte.html` | Carte interactive et réseau de routes | Voir les exigences de visa et les connexions aériennes associées à un pays. |
| `matrice.html` | Heatmap | Comparer les droits de plusieurs passeports vers les mêmes destinations. |
| `correlation.html` | Nuage de points | Comparer les indicateurs de mobilité et le nombre de connexions aériennes, et repérer les pays atypiques. |
| `paralleles.html` | Coordonnées parallèles | Comparer plusieurs indicateurs à la fois et filtrer les profils de pays. |

Chaque page propose des filtres, des sélections et des informations détaillées sur les pays. La page `pipeline.html` explique comment les données ont été préparées.

## Données utilisées

Les fichiers CSV d'origine sont conservés dans `data/raw/` :

- **Passeports et visas** : `countries.csv`, `passport_rankings.csv` et `visa_requirements.csv`.
- **Routes aériennes** : `routes.csv` et `airports.csv`, issus du [dataset Airline Routes and Airports](https://www.kaggle.com/datasets/ducling/airline-routes-and-airports) sur Kaggle.
- **Référentiel complémentaire d'aéroports** : `airports-extended.csv` (OpenFlights).

Les autres fichiers CSV de l'archive des routes sont également conservés, même s'ils ne servent pas aux indicateurs actuels.

Les visas et classements utilisés concernent **2026**. Les routes aériennes n'ont pas d'année par liaison dans le fichier fourni. On ne peut donc pas étudier leur évolution dans le temps avec ces données. De plus, une route répertoriée ne correspond pas à un nombre de vols ou de passagers.

## Préparation des données

Le script `scripts/prepare_data.py` réalise les traitements nécessaires :

1. Lecture des CSV et nettoyage des valeurs manquantes.
2. Harmonisation des pays avec leurs codes ISO.
3. Regroupement des exigences de visa en catégories communes.
4. Jointure des routes avec les aéroports de départ et d'arrivée pour retrouver les pays correspondants.
5. Exclusion des routes domestiques et suppression des doublons, en conservant le sens des liaisons.
6. Calcul des indicateurs utilisés dans les graphiques : destinations par catégorie de visa, routes internationales sortantes et pays desservis.
7. Export des résultats au format JSON pour D3.js.

Pour reconstruire les données et vérifier qu'elles correspondent à celles utilisées par le site :

```bash
python3 scripts/prepare_data.py --check
```

Le résultat est enregistré dans `data/processed/borderless-rebuilt.json`. Le site continue de lire `data/borderless-fixed.json` : cette commande ne modifie donc pas les visualisations.

Sur les fichiers fournis, le traitement part de **33 322 enregistrements de routes** et retient **11 731 liaisons internationales orientées distinctes**. Les données de visas contiennent **45 173 enregistrements**, et les classements portent sur **199 passeports**.

Le détail des jointures, des calculs et du choix des variables visuelles se trouve dans [`docs/PIPELINE.md`](docs/PIPELINE.md) et sur la page `pipeline.html`.

## Organisation du projet

```text
DataViz/
├── index.html
├── carte.html
├── matrice.html
├── correlation.html
├── paralleles.html
├── pipeline.html
├── src/                 # JavaScript D3 et styles
├── data/
│   ├── raw/             # CSV d'origine
│   ├── processed/       # JSON reconstruit par le script
│   ├── borderless-fixed.json
│   └── world.geojson
├── scripts/             # Préparation des données
├── docs/                # Documentation du pipeline
├── tests/               # Vérifications
└── Makefile
```

## Limites

Le projet sert à explorer des **relations entre indicateurs**, pas à démontrer un lien de cause à effet. Le nombre de liaisons aériennes dépend aussi de la géographie, de la population, du tourisme et de l'économie. Les règles de visa peuvent évoluer : les informations affichées ne remplacent pas les sources officielles pour préparer un voyage.
