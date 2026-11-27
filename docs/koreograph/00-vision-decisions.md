# 00 — Vision, périmètre et décisions

## Produit

Le produit répond à un besoin simple : à partir du concept ou de la vue déjà ouverte dans Konstellation, produire une courte démonstration fluide du déplacement à travers les idées. L'utilisateur choisit l'intention ; Koreograph gère la préparation, le cadrage, la continuité et le rythme. Une même partition peut être rejouée, révisée et exportée selon plusieurs supports.

### Objectifs

- Réduire la création d'une démo courante à un bouton et, si nécessaire, quelques choix.
- Montrer le fonctionnement réel de la navigation, pas une vidéo hallucinée ni une simulation prétendant être l'application.
- Conserver les identités sémantiques à travers les plans et rendre explicites les relations visibles.
- Rejouer un parcours à temps fixe, indépendamment de la vitesse réseau et du nombre d'images affichées par le navigateur.
- Appliquer les mêmes règles aux domaines différents, aux langues et aux formats d'écran.
- Rester utilisable localement, sans IA et sans dépendance cloud obligatoire.

### Non-objectifs

Koreograph ne produit pas de nouvelles connaissances, n'édite pas le Kristal, ne modifie pas ses droits, n'exécute pas les actions métiers du `NavigationPlan`, n'évalue pas la vérité d'une proposition, ne convertit pas automatiquement les formats Framework. Il ne cherche pas à devenir un éditeur vidéo généraliste, un système de physique, un lecteur v11, un moteur de recommandation opaque ou un éditeur de nœuds à images-clés. Il ne publie pas de démos automatiquement. Le v0.1 ne promet pas une animation de toutes les vues ni tous les formats de sortie.

## Principes normatifs proposés

Dans ces documents, DOIT/NE DOIT PAS = exigence pour la cible Koreograph ; DEVRAIT = défaut recommandé ; PEUT = option. Le statut reste proposé jusqu'à adoption par le propriétaire. Les invariants de Konstellation déjà adoptés ne sont pas renégociés ici.

| ID | Décision | Alternative écartée / justification |
|---|---|---|
| KD-01 | Séparer intention, résolution, timeline et rendu | Le scénario ne contient ni coordonnées de clic ni CSS arbitraire ; un changement de layout ne détruit pas le récit. |
| KD-02 | Réutiliser les API filtrées et le planner | Pas de graphe brut parallèle ; respecte l'autorité et la politique existantes. |
| KD-03 | Moteur procédural déterministe sans IA | Pas de LLM, de modèle génératif ou d'appel à `/api/sa` requis ; les choix peuvent être expliqués. |
| KD-04 | Un seul compilateur, un seul évaluateur temporel | Ne pas construire un exporteur vidéo et un lecteur Web indépendants. |
| KD-05 | Un adaptateur Constellation d'abord | Éviter une abstraction générale des dix renderers avant d'avoir une transition réussie. |
| KD-06 | Capturer après résolution réussie | Les clics, erreurs réseau et hovers ne font pas partie de la partition. |
| KD-07 | Précharger une séquence bornée avant lecture | L'attente réseau ne fait pas partie de l'animation. |
| KD-08 | SVG et Svelte existants ; capture navigateur optionnelle | Pas de GSAP, Remotion, Canvas ou WebGL au premier lot. Réévaluer sur preuve de besoin. |
| KD-09 | Dégrader vers une géométrie neutre | Aucun sens causal, opposition ou hiérarchie déduit d'une couleur, d'un libellé ou du planner seul. |
| KD-10 | Export local, privé par défaut | Droit de lecture ≠ droit de publication ; aucun upload par défaut. |
| KD-11 | Pas de moteur serveur Koreograph initial | Le client et ses API existantes suffisent pour le parcours borné ; ajouter une infrastructure seulement pour un besoin démontré. |
| KD-12 | Feature flag et mode présentation isolé | L'exploration normale doit conserver son comportement si Koreograph est désactivé. |

## Définition d'une démo réussie

Un observateur doit pouvoir dire d'où l'on part, quel concept devient le focus, quel lien a permis le déplacement et où l'on arrive. Le focus reste lisible ; les éléments communs ne clignotent pas ; les relations ambiguës sont neutres ; la troncature est signalée. Le scénario peut être joué en pause, à l'envers via recherche temporelle et image par image sans réinterroger le graphe.

Indicateurs à mesurer : nombre d'interactions pour créer une démo, temps de préparation, taux de parcours valides, continuité des identités, lisibilité, taux d'images respectant le budget, conformité aux politiques et part des exports réellement reproductibles. Les seuils initiaux sont dans [10](10-validation-performance.md), non des résultats mesurés.

## Décisions complémentaires v0.2

| ID | Décision | Justification |
|---|---|---|
| KD-13 | Marque `#1E6864` (décision propriétaire), thèmes sélectionnables mono/polychromes | Identité stable, lisibilité par type sans obligation de couleur |
| KD-14 | Thème, encodage, géométrie et rythme indépendants | Même parcours, plusieurs interprétations visuelles |
| KD-15 | Story/Director/Validator sont des fonctions du même compilateur | Pas de service, pas de seconde timeline ni IA |
| KD-16 | Réparation bornée avant gel ; échec explicite plutôt que faux résultat | Fidélité et accessibilité avant esthétique |
| KD-17 | Extensions de production séparées de Score/Bundle 0.1 | Compatibilité avec la tranche initiale |
| KD-18 | Production locale en série après stabilisation du cœur | Pas d'infrastructure distribuée ni publication implicite |

Voir [thèmes](15-direction-artistique-themes.md) et [cible finale](20-production-serie-et-release.md).
