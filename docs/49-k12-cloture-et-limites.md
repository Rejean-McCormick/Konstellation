# K12 — Clôture technique contrôlée, sans fausse qualification

## Livré dans le pack final K9–K12

- File de revue complète des 126 dossiers de snapshot (84 états v6 + 42 profils hétérogènes), classée en dossiers privés immuables et réexécutables;
- provenance et témoins exacts de K8 et refus des divergences d'empreintes;
- contrat de preuve `visualAudit` attaché aux projections serveur via Reader Policy;
- panneau d'explication accessible commun aux dix renderers spécialisés;
- vérifications unitaires positives et négatives, y compris sources invisibles et fausses directions;
- installateur incrémental K8 → K9–K12 : vérification SHA, sauvegarde, rollback, tests et build sous Node >=24.15.0;
- pas de déploiement distant, de Git commit, de Git push ni de modification à Publisher, Light ou SPEK.

## Conditions de clôture non automatisables

1. Approuver effectivement la signification d'une famille de relations à partir d'une revue humaine, puis renseigner un registre **code-owned** sous les références exactes de dataset et de politique de lecture.
2. Vérifier que le vrai lecteur renvoie les mêmes témoins sous cette politique, ainsi que le comportement négatif pour des politiques restrictives et les sources changées.
3. Tester l'interface visuellement en navigateur sur les données réellement autorisées et corriger les problèmes de lisibilité et d'accessibilité.
4. Traiter les sept artefacts absents et les sept JSON surdimensionnés si l'objectif opérationnel inclut une prise en charge complète des profils hétérogènes, sans faire passer un index pour un contenu compris.
5. Faire accepter une publication par l'autorité habilitée; **cette opération est hors de ce pack**.

La clôture de l'implémentation technique n'est pas la clôture de la qualification des 126 Kristals. Le nombre de diagrammes réellement qualifiés demeure **zéro à la livraison**. La file K9 comporte 4 208 éléments à examiner, pas 4 208 règles actives. Aucun statut de « prêt à publier » n'est inventé.
