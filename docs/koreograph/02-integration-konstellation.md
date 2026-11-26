# 02 — Audit et intégration au code existant

## Périmètre réellement inspecté

Snapshot `znapshot_Konstellation_11260852.zip`. Le `package.json` indique `1.0.0-rc.2`, Node `>=24.15.0`, Svelte, Astro, AJV, Vitest et Playwright. Les éléments ci-dessous sont présents dans le snapshot ; leur bon fonctionnement dans une installation cible n'a pas été testé ici. Il n'existe pas de moteur Koreograph livré par ce travail.

| Source existante | Observation | Intégration proposée |
|---|---|---|
| [Explorer.svelte](../../src/components/Explorer.svelte) | `state()`, `commit`, `restore`, `undo`, `redo`, `inspect`, `loadNavigationPlan`, changement de Lens/policy/Kristal | Lire l'état courant ; hook après réussite ; invalider si frontière de lecture change. Ne pas confondre l'historique de QuerySpec et le chemin de Constellation. |
| [ConstellationView.svelte](../../src/components/ConstellationView.svelte) | `navigate(node)` ajoute `{focus,groupId,label}` à `path`; `load()` récupère `/api/constellation` avec AbortController et `requestedKey`; `go()` tronque le chemin | Émettre un événement après réponse confirmée, pas au clic ; extraire un adaptateur de scènes. `inspect` parallèle ne garantit pas le succès de la constellation. |
| [layout.js](../../src/lib/constellation/layout.js) | `layoutConstellation` répartit en un ou deux anneaux selon ordre des items ; `splitLabel` réduit les libellés | Réutiliser le placement initial et stabiliser l'ordre des survivants. Ajouter un placement de transition, pas une nouvelle topologie. |
| [AdaptiveProjectionView.svelte](../../src/components/AdaptiveProjectionView.svelte) | requête avec `query,lensRef,recipeId,selectedEntityId`, budgets, curseur ; panneau audit et dix renderers | Adaptateurs supplémentaires après V0.2 ; aucun chargement automatique de renderer inconnu. |
| [planner.mjs](../../server/navigation/planner.mjs), [projection.mjs](../../server/navigation/projection.mjs) | séparation plan/projection, profils et recettes | Laisser les recommandations au planner, utiliser seulement les recettes disponibles et compatibles. |
| [Visual evidence](../../server/navigation/visual-semantics/evidence.mjs) | preuves visibles du plan sémantique | Transporter leurs références ; ne jamais requalifier par une heuristique cliente. |
| [server/index.mjs](../../server/index.mjs), [auth.mjs](../../server/auth.mjs) | routes de lecture et contrôle du principal | Garder les appels authentifiés existants ; ne pas créer de contournement. |
| [package.json](../../package.json) | scripts de contrats, navigation, UI, navigateur, sécurité, docs | Ajouter des tests ciblés dans les conventions existantes lorsque le code sera livré. |

## Contrats et appels existants

Se référer à [API et contrats](../24-api-contracts.md) et aux JSON Schemas [ConstellationResponse 0.1](../../contracts/constellation-response.schema.json), [ExplorationState](../../contracts/exploration-state.schema.json), [NavigationPlan](../../contracts/navigation-plan.schema.json) et [NavigationProjection](../../contracts/navigation-projection.schema.json).

| Opération | Méthode / route | Corps utilisé par le client actuel |
|---|---|---|
| Bootstrap | GET `/api/bootstrap` | `readerPolicyRef` facultatif en query string |
| Inspecter une entité | POST `/api/entity` | `{id,context}` |
| Résoudre une constellation | POST `/api/constellation` | `{context,lensRef,focus,groupId,limit}` |
| Calculer le plan | POST `/api/navigation/plan` | `{query,lensRef,selectedEntityId,resultSize}` |
| Projeter une recette | POST `/api/navigation/project` | `{query,lensRef,recipeId,selectedEntityId,pageSize,nodeBudget,edgeBudget,cursor?}` |
| Valider un état sauvegardé | POST `/api/validate-state` | ExplorationState selon contrat existant |

Les requêtes existantes portent, lorsque nécessaires, `Authorization: Bearer …` et `X-Konstellation-Kristal`. Les secrets restent dans le mécanisme de session ; ni les clés réactives actuelles qui incluent un token, ni les headers ne doivent être copiés dans un Score ou une trace Koreograph. Les contrats ne sont pas modifiés par cette proposition.

La ConstellationResponse contient un `focus` structuré (entity, source, qualifier, relation-value), `groupId`, `center`, `satellites` avec `target`, `salience` et compteurs d'evidence, `limit` de 3 à 25 et `truncated`. Un satellite `group` peut avoir un focus identique et un autre groupId. Le chemin ne doit donc pas être réduit à une liste d'entityId. Un label n'est pas une identité ; les compteurs d'evidence ne sont pas des témoins d'une assertion déterminée.

## Insertion v0.1 proposée

1. Centraliser la fonction de résolution de Constellation sans changer le comportement du composant. Tester les appels réels, annulations et erreurs.
2. Publier depuis le succès de `load()` un événement interne `view-resolved` contenant seulement le focus, groupId et une référence à un snapshot filtré. Pour le root local issu des rows, employer un état explicite de sélection ; ne pas lui attribuer une fausse entité.
3. Intégrer un contrôleur Kapture à `Explorer`, activé explicitement. Les back/forward sémantiques peuvent être capturés comme nouvelles visites ; le replay ne rejoue pas les effets UI.
4. Créer un lecteur `KoreographPlayer.svelte` séparé, qui partage les helpers et tokens visuels existants. Conserver l'inspecteur, le portrait, le survol et la pagination de l'Explorer inchangés.
5. Plus tard : exploiter les DTOs de vues spécialisées déjà chargés ; déclarer pour chaque renderer supporté un adaptateur et sa version dans un registre code-owned. Les 10 renderers spécialisés ne sont pas automatiquement compatibles avec l'animation.

## Compatibilité

Le lecteur traditionnel v6/v10 et les packs compatibles restent la cible initiale. `/v11` est un preview isolé avec sa propre autorisation dataset ; aucune adaptation automatique de `/v11` vers les contrats traditionnels. Voir [guide v11](../34-v11-local-reader.md). Aucun changement à Kristal, Publisher, Light, SPEK, Manager ou autres intégrations externes n'est nécessaire. Le mode local est la première cible ; partagé/public nécessite une revue distincte.
