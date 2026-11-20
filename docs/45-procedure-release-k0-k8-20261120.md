# Intégration Git contrôlée — Consolidation K0–K8

**Ce document ne donne pas d'autorisation de publication.** La préparation d'un commit local est distincte d'un `git push`, d'une release et d'une activation de règles de connaissance.

## Avant intégration

1. Exécuter le vérificateur du pack avec `--check` : seuls l'état final exact K8 et le snapshot de base exact sont acceptés. Les états K1 à K7 partiels et les fichiers modifiés autrement sont refusés.
2. Exécuter `--apply` : sur une machine déjà à K8, **seuls les deux documents de consolidation sont ajoutés**. Sur un clone du snapshot de référence encore intact, le même pack applique les 46 fichiers finaux et les deux documents.
3. L'installateur vérifie les tests Python K7/K8, les tests visuels Node, la structure Svelte, la sécurité frontend, `npm test` et `npm run build` ; un échec déclenche une restauration de ce que le pack vient d'écrire.
4. Vérifier le résultat avec `--check` puis examiner le statut Git, la branche et les différences.

## Préparer le commit sans publier

Le mode explicite `--stage` vérifie à nouveau **les 48 fichiers connus** et exécute seulement `git add --` sur ces chemins. Il n'inclut pas les archives d'observations privées et n'exécute ni `git commit` ni `git push`. Revoir les modifications mises en index avec `git diff --cached --stat` et `git diff --cached` avant toute décision de commit.

Proposition de titre de commit (à valider par l'opérateur) : `feat(konstellation): consolidate reviewed visual semantics K0-K8`. Ne pas incorporer les dossiers d'observations privées K6–K8 ni les fichiers de sauvegarde locale dans le dépôt.

## Limites

- Le pack ne synchronise pas GitHub et n'interagit avec aucun service distant.
- Il ne corrige pas automatiquement les sept artefacts absents ni les profils nécessitant une adaptation spécialisée.
- Il ne rend pas des assertions « approuvées » par simple passage des tests.
- L'audit/revue K9 pourra être développé sur cette base, sans modifier les droits de lecture.
