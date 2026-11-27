# 18 — Validation visuelle et autocorrection déterministe

## Pipeline

`resolve → compile → decorate/layout → camera → inspect → bounded repair → freeze → preview/export`. Le validator reçoit uniquement les scènes minimisées et les règles code-owned. Une correction ne relit pas le Kristal, ne change pas l'autorité ni le parcours. Une diminution de densité ne peut retirer un focus, une relation de passage, une preuve ou mention obligatoire ; la suppression d'un voisin facultatif est une troncature de présentation signalée. Un changement de route ou de durée explicite requiert une nouvelle préparation acceptée.

### Contrôles mesurables

| Code | Mesure | Niveau initial |
|---|---|---|
| Q-SEM | référence absente, preuve/statut perdu, lien inventé | fatal, aucune réparation par invention |
| Q-BOUNDS | objet/label nécessaire hors safe area | bloquant export si persiste |
| Q-LABEL | intersection rectangles de texte non nulle (hors annotations intentionnelles), occlusion par formes opaques | bloquant si illisible |
| Q-CONTRAST | ratio texte et contours selon [thèmes](15-direction-artistique-themes.md) | bloquant si essentiel |
| Q-MOTION | vitesse caméra/nœuds, discontinuité aux bornes | avertissement ou blocage si illisible |
| Q-READ | durée < minimum de lecture | bloquant si texte essentiel |
| Q-DENSITY | nombre objets > budget, légende non lisible | bloquant ou réduction signalée |
| Q-EXPORT | primitives ou polices non supportées, tailles/durée divergentes | refus du format concerné |
| Q-POLICY | contexte invalidé / données non autorisées | fatal, purge |

Échantillonner toutes bornes et à intervalles ≤50 ms sur la timeline (max 2401 échantillons pour 120 s), y compris milieu des transitions ; les tests analytiques et le contrôle des trajectoires couvrent les événements plus courts. Ne pas prétendre à une preuve de lisibilité continue sur simple échantillonnage. Revue visuelle humaine des cas denses et des sorties supportées. Les ratios sont calculés sur rendu composité ; tester formes et texte en gris, déficiences de vision des couleurs, reduced-motion. Mesurer avec le moteur de texte/font exact utilisé pour export.

### Ordre des réparations

1. Vérifier intégrité, policy et preuves avant toute réparation ; fatal => arrêt.
2. Corriger contraste par tokens alternatifs code-owned ou contours/labels ; conserver marque officielle et légende. Ne pas changer le sens des catégories.
3. Repositionner labels dans slots stables (haut/bas/gauche/droite), deux lignes puis ellipsis avec transcription ; garder focus et clés. Limiter déplacement des survivants.
4. Ajuster layout/marges et caméra, réduire ornement (grille, halos) avant densité. Repli caméra fixe si compatible.
5. Si nécessaire, réduire voisins facultatifs avec mention de troncature ; recalculer trajectoires, légende, captions et cadre. Si le parcours n'est plus montrable, refuser ou proposer un nouveau Score.
6. Si rythme insuffisant, proposer durée plus longue ; ne pas modifier hold explicite sans consentement. L'ordre des choix est fixe, tie-break canonique.

Budget initial : 3 passes globales de réparation, 8 candidats de placement par label, 2 MiB par Bundle ; arrêter en cas d'absence d'amélioration ou deadline de préparation atteinte. Comparer les candidats lexicographiquement par nombre de fatals, blocages, collisions essentielles, avertissements, coût de déplacement, puis clé stable. N'accepter qu'une amélioration stricte. Aucun score esthétique ne compense une erreur sémantique. Conserver la meilleure version autorisée, joindre diagnostics avant/après. En cas de blocage, aperçu éventuellement annoté si policy valide ; pas d'export déclaré conforme. Les budgets ne sont pas des mesures de performance.

## Rapport et gates

Le rapport QA contient versions, viewport, nombre de samples, codes, sévérité, segments concernés, nombre de corrections et résultat `pass|review|fail`. Pas de labels privés dans télémétrie ; rapport détaillé local soumis à autorisation. `review` exige confirmation explicite pour un export local avec avertissement non essentiel ; `fail` interdit l'export. Aucun bouton de contournement pour les contrôles policy/sémantique/contraste indispensable. Une réparation qui change la présentation produit un nouveau hash du Plan et invalide anciennes validations. Test de non-régression : même entrée => mêmes corrections ; injection de collision impossible => refus ; variante de thème ne change pas les IDs ou liens. Voir [validation historique](10-validation-performance.md).
