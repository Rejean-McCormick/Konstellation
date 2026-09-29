# Architecture

## Deux composants applicatifs

**Frontend** : shell Astro, explorateur Svelte, rendu des facettes, liste/tableau, aperçu de requête, inspecteur d’assertions, historique. Les composants utilisent un petit catalogue de widgets typés. Un JSON choisit des widgets connus; il ne fournit ni JavaScript ni HTML arbitraire.

**Query Service** : chargement des configurations versionnées, validation sémantique, vérification de capacités, contexte d’accès, lecteur de politiques, planification, adaptateur de données, normalisation des résultats et témoins. Un module ACL SA séparé dans ce service peut être ajouté ensuite. ACL signifie ici couche anticorruption; les droits d’accès constituent un mécanisme distinct.

Le plan interne du moteur est éphémère, pas un nouveau format public canonique.

## Données déclaratives

- Registre sémantique : identités, labels, domaine, portée, opérateurs, relations inverses.
- Profil d’adaptateur de confiance : mappings vers les prédicats amont, recettes dérivées, capacités et limites.
- Lens : facettes et pivots proposés; aucune permission ni règle épistémique.
- Reader Policy : objet amont immuable résolu côté service.

Une Lens partagée ne peut charger un backend, changer une politique de lecture ou introduire un mapping. Les mappings ne sont pas des équivalences universelles : chaque correspondance vers une source doit documenter ses restrictions et qualifications.

## Interfaces logiques proposées

`capabilities(context)` expose les types, relations, opérateurs et profondeurs réellement exécutables.

`query(QuerySpec, cursor?)` retourne un ResultSet ou une erreur structurée.

`facets(QuerySpec, relationIds)` calcule les choix et compteurs sous le même contexte.

`entity(entityId, context)` fournit une fiche dans le contexte actif; ouvrir une fiche ne change pas la requête.

`evidence(assertionRefs, context)` développe des assertions visibles et leurs sources.

Ces noms sont un contrat Konstellation proposé, pas des endpoints prétendument présents dans les snapshots.

## Isolation

Les mêmes contrôles d’accès et Reader Policy s’appliquent aux résultats, compteurs, autocomplétion, voisinages, provenance et explications. Un refus d’accès ne doit pas révéler l’existence d’une assertion. Une indisponibilité de politique ne peut être affichée que si les permissions autorisent cette information.

L’Interaction Kernel reste réservé aux échanges intercomposants qui exigent un profil d’écosystème. Il ne transporte pas chaque clic. L’orchestrateur SA prépare et active les RuntimeSets; il ne participe pas aux requêtes interactives de Konstellation.

## Projection Constellation

La v0.5 ajoute trois modules internes au Query Service :

- `NavigationIndex` : index éphémère des assertions **déjà visibles** sous la Reader Policy courante (entités, relations, sources, qualificatifs);
- `ConstellationProjector` : transforme un focus et une Lens en candidats de navigation sans modifier le graphe de connaissance;
- `SalienceRanker` : classe et diversifie les candidats de façon déterministe sous un budget de 3 à 25.

`POST /api/constellation` reçoit `focus`, `context`, `lensRef`, `limit` et éventuellement `groupId`. Il retourne un DTO borné. Le frontend Astro/Svelte ne calcule aucune importance sémantique; `ConstellationView.svelte` reçoit ce DTO et applique seulement un layout SVG déterministe à un ou deux anneaux.

Cette séparation laisse un seam pour un futur index SQLite/DuckDB ou un autre renderer de réseau sans changer la sémantique publique. Cytoscape/Svelte Flow ne sont pas nécessaires au profil borné v0.5.
