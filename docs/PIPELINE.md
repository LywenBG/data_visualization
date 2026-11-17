# Borderless — Documentation du pipeline et des choix de visualisation

## 1. Objectif, public cible et périmètre vérifiable

**Public cible prioritaire :** étudiants en mobilité internationale, en géographie ou relations internationales, qui souhaitent comparer les droits de voyage et la connectivité aérienne entre pays. Ce site est un **outil d'analyse**, pas un moteur de réservation ou une source réglementaire de visas.

**Question générale :** comment les droits d'entrée associés aux passeports et les liaisons aériennes répertoriées varient-ils entre pays ?

Le dataset fourni par le groupe contient **une seule période de visas (2026)** et **aucune année par liaison aérienne**. Aucune évolution temporelle ou corrélation *dans le temps* ne peut être construite à partir de ces fichiers. Les quatre tâches ci-dessous sont toutes réalisables avec les données réellement disponibles.

## 2. Sources utilisées

| Source | Format brut | Attributs principaux exploités | Statut temporel |
|---|---|---|---|
| `passport_rankings.csv` et `visa_requirements.csv` (archive Kaggle fournie) | CSV | passeport, destination, type de visa, score et rang | 2026 |
| `countries.csv` (même archive) | CSV | correspondances pays/codes | 2026 |
| `routes.csv` — [ducling/airline-routes-and-airports](https://www.kaggle.com/datasets/ducling/airline-routes-and-airports) | CSV | aéroport d'origine, aéroport d'arrivée | Pas d'année exploitable |
| `airports.csv` (même archive) et `airports-extended.csv` | CSV | code aéroport, pays, latitude/longitude | Référentiel géographique |
| `world.geojson` | GeoJSON | géométries, code ISO2 | Fond de carte, pas une statistique |

**Important :** la date de mise à disposition d'un fichier Kaggle ne vaut pas date de chaque route. Les routes sont des **liaisons répertoriées**, pas des départs annuels ni des nombres de passagers. Les données du site ne permettent pas de déduire une évolution historique.

## 3. Pipeline de préparation : étape par étape

**Étape 1 — Lecture et reconnaissance des colonnes.** Les CSV d'origine sont lus comme des tableaux de lignes. On repère les identifiants de passeport, destination et aéroport ainsi que les catégories textuelles de visa.

**Étape 2 — Normalisation des pays.** Les codes pays sont homogénéisés sur **ISO 3166-1 alpha-2** (`FR`, `JP`, `DZ`). Les noms et alias des référentiels aéroportuaires sont rapprochés de ces codes. Les pays impossibles à identifier ne participent pas aux jointures.

**Étape 3 — Classification des exigences de visa.** Chaque couple `(pays du passeport, pays de destination)` est associé à l'une des catégories : `free`, `arrival`, `eta`, `evisa`, `required`, `blocked`, `unknown` ou `own` (nationalité identique à destination). Les catégories sont maintenues séparées ; un e-visa n'est pas assimilé à une exemption de visa.

**Étape 4 — Jointure des routes aériennes.** Chaque ligne de `routes.csv` est reliée deux fois au référentiel des aéroports, par les identifiants ou les codes disponibles, afin de récupérer `sourceCountry`, `targetCountry` et éventuellement les coordonnées. Les liaisons intranationales sont écartées de l'analyse des connexions internationales.

**Étape 5 — Déduplication.** Les routes sont regroupées par paire `(aéroport de départ, aéroport d'arrivée)`. Cela évite de compter plusieurs compagnies opérant la même paire comme plusieurs itinéraires distincts. Les trajets sont **orientés** : Paris → Tokyo n'implique pas automatiquement Tokyo → Paris.

**Étape 6 — Agrégations.** Pour chaque passeport `p`, calcul du nombre de destinations par catégorie (`free(p)`, `arrival(p)`, etc.). Pour chaque pays de départ `p`, calcul du nombre de routes internationales distinctes et du nombre de pays d'arrivée uniques. On ne confond pas ces deux mesures.

**Étape 7 — Indicateurs dérivés.** `accessible(p) = free(p) + arrival(p) + eta(p)` selon une convention analytique explicitée dans le site. `required(p)` et `evisa(p)` restent distincts. Le **score officiel Henley** est conservé séparément : il ne se calcule pas nécessairement avec exactement les mêmes critères.

**Étape 8 — Dataset commun.** Les matrices de visas et les routes normalisées sont exportées dans `data/borderless-fixed.json`. Le navigateur charge ce fichier en lecture seule (aucun téléversement). Il recalcule localement les agrégations nécessaires selon le passeport et les filtres.

**Étape 9 — Mapping visuel et interaction.** Les attributs transformés sont associés à des positions, couleurs, tailles ou liens D3 : voir tableau ci-dessous. Les utilisateurs commencent par une vue globale, puis obtiennent les détails survol/clic.

### Contrôles qualité sur la version fournie

- 45 173 enregistrements de visa dans les données d'entrée ; 199 lignes de classement 2026.
- 33 322 enregistrements de routes brutes ; **11 731 paires internationales orientées distinctes** retenues.
- La préparation signale 2 439 routes non rattachées ; 16 417 lignes domestiques écartées. Ces décomptes décrivent les transformations du jeu fourni, pas une mesure universelle des transports.
- Données historiques des visas : **seulement 2026**. Année par route : **non disponible**.

## 4. Techniques / tâches / variables visuelles

| Page | Technique | Tâche utilisateur réalisable | Mapping visuel | Overview + detail |
|---|---|---|---|---|
| 1 Carte | Carte choroplèthe + arcs de réseau | Identifier les destinations par exigence de visa et les pays directement reliés | Géométrie = pays ; teinte = type de visa ; arc = liaison répertoriée, regroupée par pays | Carte mondiale, zoom, filtre, infobulle et clic sur un pays |
| 2 Matrice | Heatmap origine × destination | Comparer les catégories de visa de plusieurs passeports vers les mêmes destinations | Lignes = passeports ; colonnes = destinations ; teinte = visa ; symbole ↗ = liaison directe | Matrice globale défilante, recherche et détail au clic |
| 3 Nuage | Scatter plot multivarié + régression | Comparer, parmi les pays, mobilité et connectivité ; repérer des points atypiques | X = destinations accessibles (ou autre compte) ; Y = pays reliés / routes ; taille = nombre de routes ; couleur = pays sélectionné | Vue globale des pays, changement des axes, tooltip et fiche |
| 4 Profils | Coordonnées parallèles + brossage multi-axes | Filtrer les profils de pays par plusieurs indicateurs et comparer des combinaisons atypiques | Axe = variable quantitative ; position verticale = valeur ; ligne = pays ; couleur = indicateur ; atténuation = non retenu | Vue de tous les profils, filtres à la souris et détails |

## 5. Définition précise des indicateurs

- **Sans visa (`free`) :** dispense de visa préalable dans la catégorie du dataset.
- **Visa à l'arrivée (`arrival`) :** formalité à l'entrée.
- **ETA (`eta`) :** autorisation électronique de voyage (non équivalente à un e-visa).
- **E-visa (`evisa`) :** visa obtenu par procédure électronique.
- **Visa préalable (`required`) :** visa à obtenir avant le voyage.
- **Pays connectés :** nombre de codes pays de destination distincts parmi les routes sortantes répertoriées.
- **Routes sortantes :** nombre de paires aéroport d'origine → aéroport de destination distinctes et internationales.
- **Corrélation (`r`) :** corrélation de Pearson sur les valeurs cross-sectionnelles des pays, sans interprétation causale.

Les valeurs absentes sont préservées comme `unknown` ou ignorées pour les statistiques concernées. Une route non recensée n'est pas forcément inexistante en réalité.

## 6. Biais et précautions scientifiques

Les observations viennent de sources hétérogènes, non synchronisées dans le temps ; la comparaison est **descriptive**, non une mesure causalement identifiée. Les cartes dépendent de la disponibilité d'un code pays valide. Les connectivités sont sensibles au nombre d'aéroports, à la taille du pays, aux limites de couverture et à la déduplication. Les données présentées ne remplacent jamais les réglementations officielles de voyage.

**Évolution au fil des années :** il faudrait au minimum une matrice de visas par année ET un historique annuel des liaisons (ou un indicateur aérien annuel avec une définition explicitement différente). Cette étude n'est pas incluse, pour respecter l'exigence de tâches réalisables.

---

## 7. Reproduire le pipeline depuis les trois archives Kaggle

Le dossier final s'appelle **`DataViz/`**. Les CSV ont été extraits **sans modifier leur contenu** dans trois sous-dossiers de `data/raw/` :

```text
DataViz/
├── data/
│   ├── raw/
│   │   ├── 01_airports_openflights/
│   │   │   └── airports-extended.csv
│   │   ├── 02_passeports_visas/
│   │   │   ├── countries.csv
│   │   │   ├── passport_rankings.csv
│   │   │   └── visa_requirements.csv
│   │   └── 03_routes_ducling/
│   │       ├── airports.csv
│   │       ├── routes.csv
│   │       ├── airlines.csv
│   │       ├── alliances.csv
│   │       └── equipment.csv
│   ├── borderless-fixed.json            # JSON actif : celui lu par les 4 pages
│   ├── world.geojson                    # fond de carte
│   └── processed/
│       └── borderless-rebuilt.json       # résultat reconstruit depuis les CSV
├── scripts/
│   └── prepare_data.py                  # traitement reproductible, Python 3 standard
├── docs/
│   └── PIPELINE.md                      # ce document
└── pipeline.html                        # explication accessible dans le navigateur
```

On peut rejouer le traitement depuis le dossier `DataViz` :

```bash
python3 scripts/prepare_data.py --check
```

Le script lit les CSV, refait les transformations et écrit uniquement `data/processed/borderless-rebuilt.json`. **Il ne modifie pas** `data/borderless-fixed.json` ni les pages D3. Il compare ensuite les deux JSON. Sur les fichiers fournis, **leur contenu est strictement identique, jusqu'à leur empreinte SHA-256**. Ce contrôle vérifie que les explications ci-dessous décrivent bien les données utilisées par le site, et pas un pipeline théorique.

**Précision sur les trois archives :**

- L'archive passeports/visas fournit les catégories de visa, les codes de pays et les classements.
- L'archive `ducling/airline-routes-and-airports` fournit les routes et les aéroports effectivement utilisés pour calculer la connectivité. Les fichiers supplémentaires `airlines.csv`, `alliances.csv` et `equipment.csv` sont conservés comme sources d'origine, mais **ne sont pas utilisés dans les indicateurs actuels**.
- L'archive des aéroports OpenFlights étendus est utilisée **comme contrôle de correspondance IATA**, sans remplacer le référentiel `airports.csv` de ducling. En effet, les latitudes, longitudes et pays nécessaires à la carte sont déjà présents dans ce dernier. L'étape de contrôle trouve **3 911 codes IATA communs** entre les deux référentiels. Le rôle d'OpenFlights est ici une **validation croisée**, pas une jointure qui ajoute les 3 911 lignes au JSON final.

### 7.1. Identifier les clés des tables

| Fichier | Colonne(s) importantes | Ce qu'elles signifient |
|---|---|---|
| `visa_requirements.csv` | `from_country_code`, `to_country_code`, `requirement_type` | Nationalité du passeport, pays de destination, obligation de visa |
| `countries.csv` | `country_code`, `country_name`, `region` | Référentiel des 227 codes et noms de destinations |
| `passport_rankings.csv` | `country_code`, `year`, `rank`, `visa_free_count` | Rang et score publiés pour chaque passeport |
| `routes.csv` | `dep`, `arr`, `airline`, `equipment` | Aéroport de départ, aéroport d'arrivée, compagnie et équipement mentionnés |
| `airports.csv` (ducling) | `iata`, `country`, `latitude`, `longitude` | Correspondance entre code d'aéroport, pays et coordonnées |
| `airports-extended.csv` | colonnes positionnelles, dont 4 = pays et 5 = IATA (en comptant à partir de 1) | Contrôle croisé avec le référentiel OpenFlights ; fichier **sans en-tête** |

Les codes de pays des données de visas sont déjà au format **ISO alpha-2** (par exemple `FR`, `JP`, `DZ`). On les nettoie (`strip()` et `upper()`) puis on contrôle leur présence dans `countries.csv`. On ne fait **pas** une conversion approximative à partir de noms de pays pour cette jointure.

**Pourquoi normaliser les codes d'aéroport ?** Parce qu'une simple différence de casse peut empêcher la jointure. Exemple réellement présent dans `routes.csv` :

```csv
,airline,dep,arr,equipment
32459,XY,JED,tas,320
```

Le script applique `normalize_code("tas")` → `TAS`. On peut alors retrouver `TAS` dans `airports.csv` et conserver la liaison **JED → TAS**. Sans cette normalisation, elle aurait été perdue. C'est une démonstration concrète de la nécessité du nettoyage.

### 7.2. Jointure n° 1 — relier une route à son aéroport de départ

Dans `routes.csv`, une ligne `ABJ,ACC` renseigne des **aéroports**, pas directement des pays. On construit donc un dictionnaire à partir de `airports.csv` :

```python
airports = {
    "ABJ": {"country": "CI", "coord": [-3.92629, 5.26139]},
    "ACC": {"country": "GH", "coord": [-0.1667860001325607, 5.605189800262451]},
    # ... autres aéroports
}
```

Puis, pour la route `ABJ → ACC`, on recherche `airports["ABJ"]`. Cette **première jointure** fournit le pays de départ `CI` (Côte d'Ivoire) et les coordonnées d'Abidjan.

### 7.3. Jointure n° 2 — relier la même route à son aéroport d'arrivée

On recherche aussi `airports["ACC"]` : cela donne `GH` (Ghana) et les coordonnées d'Accra. Une fois les **deux** jointures effectuées, la route devient :

```json
{
  "year": null,
  "from": "CI",
  "to": "GH",
  "src": "ABJ",
  "dst": "ACC",
  "sourceCoord": [-3.92629, 5.26139],
  "targetCoord": [-0.1667860001325607, 5.605189800262451],
  "rows": 5
}
```

Ce résultat correspond à un enregistrement présent dans `borderless-fixed.json` : les **cinq** lignes d'origine de la route ABJ → ACC sont celles des compagnies `2J`, `EK`, `HF`, `ME` et `SA`.

**Équivalent conceptuel en SQL :**

```sql
SELECT r.dep, r.arr,
       ad.country AS pays_depart,
       aa.country AS pays_arrivee
FROM routes r
JOIN airports ad ON UPPER(TRIM(r.dep)) = ad.iata
JOIN airports aa ON UPPER(TRIM(r.arr)) = aa.iata
WHERE ad.country <> aa.country;
```

Il s'agit d'un **exemple pédagogique**. Le code du projet n'utilise pas de base SQL : les deux jointures sont effectuées par les recherches dans le dictionnaire Python.

**Attention :** nous ne déduisons pas automatiquement qu'une route existe dans les deux sens. `ABJ → ACC` est distinct de `ACC → ABJ`.

### 7.4. Filtrage et déduplication des routes

Tous les enregistrements initiaux ne sont pas conservés :

| Opération | Nombre de lignes | Pourquoi ? |
|---|---:|---|
| Routes brutes | **33 322** | Ensemble des lignes de `routes.csv` |
| Exclues : un aéroport n'est pas identifiable dans le référentiel principal | **2 439** | Impossible de récupérer les deux pays |
| Exclues : pays de départ = pays d'arrivée | **16 417** | Le projet analyse uniquement les liaisons internationales |
| Routes internationales restantes avant regroupement | **14 466** | `33 322 − 2 439 − 16 417` |
| Répétitions de la même paire orientée `(dep, arr)` | **2 735** | Plusieurs enregistrements pour un même trajet entre aéroports |
| **Routes internationales orientées distinctes** | **11 731** | `14 466 − 2 735` |

La clé de déduplication est **`(code aéroport départ, code aéroport arrivée)`**. On ne regroupe **pas** toutes les routes du type « France → Japon » en une seule, car des villes ou aéroports différents restent des liaisons distinctes. À l'inverse, si cinq compagnies effectuent `ABJ → ACC`, le résultat est **une paire** avec `rows = 5`.

L'attribut `rows` compte des enregistrements dans le fichier source, **pas le nombre de vols réellement effectués**.

### 7.5. Normalisation et contrôle des visas

Pour les visas, la clé de la règle est le **couple `(from_country_code, to_country_code)`**. Le code du passeport désigne le pays émetteur ; le code de destination désigne le pays où l'on veut entrer.

Exemples vérifiés dans le CSV :

```text
FR → JP : visa_free_access                 → free
FR → US : electronic_travel_authorisation → eta
DZ → JP : visa_required                    → required
```

Les libellés sont harmonisés selon cette correspondance :

| Brut | Normalisé | Sens |
|---|---|---|
| `visa_free_access` | `free` | Sans visa |
| `visa_on_arrival` | `arrival` | Visa à l'arrivée |
| `electronic_travel_authorisation` | `eta` | Autorisation électronique |
| `visa_online` | `evisa` | Visa électronique |
| `visa_required` | `required` | Visa préalable |
| Origine = destination | `own` | Pays du passeport, à exclure des comptes de destinations étrangères |

Ainsi, on transforme une table de règles de visa en une **matrice dirigée** :

```json
"matrix": {
  "FR": {
    "JP": "free",
    "US": "eta"
  }
}
```

`unknown` est une catégorie d'**affichage** pour une destination absente de la matrice ; elle n'est pas inventée comme règle de visa. `blocked` est pris en charge dans l'interface, mais aucune ligne `blocked` n'est présente dans ces CSV. La matrice possède **199 passeports × 227 destinations = 45 173 couples**.

Les classements sont transformés séparément et restent identiques aux champs `rank` et `visa_free_count` du CSV source : **le score Henley n'est pas recalculé en comptant nos catégories**, car ses règles de calcul peuvent différer.

### 7.6. Dernière jointure logique : un profil par pays

Une fois le JSON chargé, `src/app.js` associe les données de visa et les données aériennes **par code de pays**. Exemple : pour la France (`FR`) :

1. Depuis `matrix["FR"]`, compter les destinations `free`, `arrival`, `eta`, `evisa`, `required` ; le cas `own` est exclu.
2. Depuis les routes où `from = "FR"`, compter les **paires aéroportuaires distinctes** (`routes`) et le nombre de valeurs distinctes de `to` (`connected`).
3. Depuis `history`, récupérer le rang et le score de `passport = "FR"`.
4. Construire un objet multivarié : `code, free, arrival, eta, required, accessible, routes, connected, score, rank...`.

La variable `accessible` de l'application est calculée avec **`free + arrival + eta`**. Il s'agit de sa **définition opérationnelle**, pas d'une mesure de passagers ni du score officiel publié.

### 7.7. Correspondance avec les quatre représentations D3

| Visualisation | Attributs issus du pipeline | Encodage visuel |
|---|---|---|
| Carte | `matrix[passeport][destination]`, routes groupées par pays, `world.geojson` | Polygone = pays, couleur = catégorie du visa, arc = au moins une liaison internationale répertoriée |
| Matrice | `matrix[passeport][destination]`, existence d'une route origine → destination | Ligne = passeport, colonne = destination, couleur = visa, symbole = connexion aérienne |
| Nuage de points | `accessible`, `free`, `required`, `connected`, `routes` | X = mobilité, Y = connectivité, rayon = routes, couleur = sélection, droite = régression |
| Coordonnées parallèles | `free`, `arrival`, `required`, `connected`, `routes` | 5 axes = 5 mesures, ligne = pays, couleur/épaisseur = pays examiné ou référence |

Cela correspond à la démarche **données brutes → nettoyage → jointure → agrégation → attributs calculés → encodage visuel** demandée pour le rapport de visualisation.

### 7.8. Vérification et limites à présenter au professeur

Après avoir lancé `python3 scripts/prepare_data.py --check`, le programme affiche :

- `Matrice visas identique : True`
- `Classements identiques : True`
- `Routes communes avec valeurs différentes : 0`
- `JSON identique après reconstruction : True`

Cela confirme que le pipeline **reproduit exactement** le JSON actuellement utilisé par l'application. Les CSV originaux et les quatre pages n'ont pas été modifiés.

Il faut toutefois préciser à l'oral :

1. Le dataset `routes.csv` fournit une **photographie de liaisons répertoriées, non datées**. Il ne permet ni série annuelle, ni nombre réel de vols, ni trafic de passagers.
2. Le fichier des passeports porte sur **2026**, donc les analyses restent transversales, pas longitudinales.
3. Certaines routes (2 439 lignes) sont exclues faute de correspondance aéroportuaire dans le référentiel ducling. On ne peut pas en déduire qu'elles n'existent pas.
4. Le référentiel OpenFlights étendu est **une source de contrôle**, pas un enrichissement qui aurait été ajouté silencieusement au dataset final.
5. Une corrélation entre les deux familles de variables n'établit **aucune causalité**.

### 7.9. Formulation courte pour la présentation

> « Nous avons trois archives de données : les droits de visa et classements, les routes aériennes, et un référentiel complémentaire d'aéroports. Nous avons normalisé les codes ISO des pays et les codes IATA des aéroports. Ensuite, chaque route a été jointe deux fois au référentiel aéroportuaire, pour identifier son pays de départ et son pays d'arrivée. Nous avons supprimé les routes non rattachables et les trajets domestiques, puis regroupé les doublons : 33 322 lignes brutes donnent 11 731 paires internationales distinctes. Nous avons aussi normalisé les catégories de visa et relié les indicateurs par code pays. Le résultat est un JSON multivarié commun aux quatre visualisations D3. Le script fourni permet de reconstruire exactement le fichier utilisé par le site. »
