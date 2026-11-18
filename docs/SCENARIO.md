# Scénario utilisateur — Borderless

## Question centrale

**Les droits associés à un passeport se retrouvent-ils dans la connectivité aérienne du pays ?**

Ce scénario s'adresse à un étudiant souhaitant comparer la liberté de circulation de plusieurs passeports et repérer d'éventuels écarts avec le réseau aérien répertorié. Il s'agit d'une analyse exploratoire, pas d'une recherche de causalité.

## Une enquête en quatre étapes

| Étape | Vue | Question pratique | Information obtenue | Pourquoi aller plus loin ? |
|---|---|---|---|---|
| 1 | Matrice des visas | Sur quelles destinations les formalités diffèrent-elles entre deux passeports ? | Exigence de visa par couple origine-destination (2026) | Une formalité favorable ne signifie pas qu'une liaison directe est enregistrée. |
| 2 | Carte et routes | Ces destinations sont-elles reliées par avion depuis le pays étudié ? | Répartition géographique, statut de visa, routes aériennes sortantes enregistrées | Une carte d'un seul pays ne dit pas si cette association vaut à plus grande échelle. |
| 3 | Corrélations | Les pays dont les passeports ouvrent plus de destinations disposent-ils de plus de connexions ? | Nuage de points et coefficient descriptif de Pearson | Deux pays peuvent être proches sur les axes mais avoir des profils de visas très différents. |
| 4 | Profils multivariés | Sur quels indicateurs les deux pays diffèrent-ils vraiment ? | Comparaison de cinq mesures, filtres par intervalle, détails par pays | Synthèse des différences observées et de leurs limites. |

## Un exemple d'utilisation

1. La personne choisit **France** comme passeport de référence et **Algérie** comme comparaison. Elle repère dans la matrice une destination où les deux formalités diffèrent et clique sur la cellule correspondante.
2. Elle suit le bouton **Passer à la carte**. Le passeport de la ligne sélectionnée devient le pays de départ ; la destination inspectée est conservée et peut être relue dans la fiche. Elle regarde si des liaisons directes sont *enregistrées* entre ces deux pays.
3. Elle passe à la **corrélation**. Le pays étudié et le passeport comparé restent identifiables. Elle observe leur position par rapport aux autres pays et peut sélectionner un autre point à étudier.
4. Elle ouvre les **profils multivariés**. Le pays examiné dans le nuage peut être comparé au passeport de référence sur cinq indicateurs : destinations sans visa, visa à l'arrivée, visa préalable, pays reliés par des routes sortantes et nombre de routes sortantes distinctes.

## Navigation et continuité

- Le menu et la barre de progression sont ordonnés dans le même sens : **Matrice → Carte → Corrélation → Profils**.
- Les boutons en bas de page expliquent **ce qu'on a appris**, **ce qui manque** et **pourquoi l'étape suivante est utile**.
- Le passeport principal, le passeport comparé, le couple inspecté dans la matrice et le pays examiné dans le nuage peuvent suivre l'utilisateur d'une page à l'autre.
- Le contexte est conservé dans l'onglet du navigateur (`sessionStorage`) et transmis également par les liens de navigation via les paramètres d'URL. Aucune donnée personnelle ni fichier n'est téléversé.
- L'utilisateur reste libre de changer d'étape ou de revenir en arrière : l'ordre est proposé, pas imposé.

## Interprétation et limites

- Les exigences de visa proviennent des **données 2026** ; les routes n'ont **pas de date par liaison**. Le scénario ne porte pas sur leur évolution dans le temps.
- Les routes sont **orientées**. Une absence de route sortante peut venir d'une couverture incomplète du dataset ; elle ne prouve pas l'absence de vols réels.
- Une route enregistrée n'est ni une fréquence de vols, ni un volume de passagers.
- La corrélation est **descriptive** : elle ne montre pas que la liberté de voyager provoque la création de liaisons aériennes.

## Justification méthodologique (What / Why / How)

- **What :** matrice origine/destination de catégories de visa, compteurs par nationalité, routes orientées entre aéroports et coordonnées géographiques.
- **Why :** comparer des exigences, localiser des connexions, rechercher une association globale, puis détailler les profils atypiques.
- **How :** matrice colorée ; carte choroplèthe et arcs géographiques ; scatter plot et droite de régression ; coordonnées parallèles avec brushing et comparaison ciblée.

Chaque technique répond à une question nouvelle et utilise les mêmes données préparées par le pipeline `scripts/prepare_data.py`.
