# Liste des bugs corrigés — Borderless (audit)

| Problème constaté | Modification | Vérification |
|---|---|---|
| Page élargie à plus de 600 px sur mobile | Menu horizontal limité au viewport et scrollable en interne | 4 pages à 390 px sans dépassement global |
| Cadre graphique de la carte | Suppression du `border`, de l'ombre et du fond du panneau de la carte (pas du panneau de détail) | Contrôle CSS à 390/768/1024/1440 px |
| But de la technique masqué sur mobile | Bloc à nouveau visible et adaptatif | Contrôles à 4 largeurs |
| Option de routes perdue après changement de pays | État `routesVisible` conservé dans l'application | Test des contrôles JS |
| Zoom perdu après filtrage | Transformation géographique enregistrée, bouton pour recentrer | Inspection du code (gestes à confirmer en navigateur) |
| Arcs incohérents avec le filtre « visa » | Seuls les arcs correspondant aux pays de la catégorie sélectionnée restent visibles | Inspection du code |
| Catégorie heatmap n'isolait pas les destinations | Filtre réellement appliqué au couple de passeports comparés | Inspection des règles de filtrage |
| Clic matrice changeait implicitement le passeport principal | Origine du couple passée au panneau de détails sans changement du filtre principal | Test des détails en JS |
| Trop peu d'espace pour certains graphiques sur téléphone | Défilement interne + taille minimale du SVG / table | 16 configurations CSS |
| Nom de territoire sans profil passeport faisait échouer le détail | Fiche tolérante aux données absentes | Test de la logique JS |
| Scatter plot difficile à cliquer et droite hors graphique | Points agrandis, commandes clavier, droite clipsée | Inspection de code + tests de structure |
| Profil multivarié sélectionné caché par d'autres traits | Ligne examinée remontée dans sa couche | Inspection du code |

**Limites de validation :** accès au serveur HTTP local bloqué dans l'environnement de test du navigateur. Tests de mise en page réalisés à partir du HTML/CSS avec contenu graphique simulé ; JavaScript contrôlé par Node (syntaxe et logique sans D3). Un test de bout en bout dans le navigateur de l'étudiant reste nécessaire avant la livraison universitaire.

## Correction 2026-11-16 — carte et profils multivariés

**Carte** : un seul chemin de sélection (`choosePassport`) pour les clics sur la carte et le menu. Après clic, les cartes statistiques, la sélection visible, les couleurs et les routes suivent le nouveau passeport. Maj + clic examine seulement la destination. Un territoire absent du jeu de passeports ne peut pas être déclaré sélectionnable.

**Coordonnées parallèles** : couche de premier plan avec halo blanc, trait orange, cinq points et étiquettes numériques ; tracé bleu pointillé pour la référence, profils gris en arrière-plan ; cinq mini-comparaisons chiffrées (valeurs, barres, écarts). Guides de lecture et textes explicatifs mis à jour. Les filtres multi-axes et les choix répétés restent actifs.
