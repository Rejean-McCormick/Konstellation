# 10 — Validation, qualité et performance

## Stratégie

Séparer validité documentaire, contrats, comportement, rendu et qualification. Ce document fixe des critères à vérifier après implémentation ; aucun résultat runtime n'est déclaré. Les tests existants de Konstellation restent obligatoires selon leurs préconditions ([tests et corpus](../21-testing-golden-corpus.md), [performance](../18-performance-scalability.md)).

| Niveau | Tests à ajouter | Critère |
|---|---|---|
| Contrats | JSON Schema Score/Bundle, inconnus, types, bornes, version, mode exclusif | Exemples positifs acceptés ; négatifs refusés ; aucun champ exécutable |
| Résolution | focus/groupId, target exact, context mismatch, timeout, annulation, troncature | Aucun saut non autorisé ; arrêt explicite ; pas de requête pendant lecture |
| Capture | confirmation serveur, doublon, retour, réponse tardive, erreur, changement de Lens | Aucun événement non confirmé ; pas de token ; invalidation correcte |
| Auto | parcours identique pour seed et snapshots identiques, cycles, cul-de-sac, budget | Pas de cycle par défaut, chaque saut visible, diagnostic d'arrêt, ordre stable |
| Layout | anneaux, survivants, labels longs, collisions, viewport vertical | Clés stables, coordonnées finies, aucune collision majeure non signalée |
| Timeline | 0, fin, limites, pause/seek, temps aléatoires, segments | Évaluation pure, déterministe, frames extrêmes exactes |
| Sécurité | policy restrictive, session changée, injection SVG/HTML/JSON, chemins | Aucune donnée masquée ou code injecté dans UI, export, logs et frames |
| Rendu | snapshots SVG, captures à temps fixe, zoom, fr/en, reduced motion | Lisibilité et stabilité validées ; pas d'effet métier |
| Exports | HTML hors ligne, SVG statique, SVG animé/vidéo selon version | Même contenu visible, dimensions et durée, artefacts temporaires supprimés |
| Régression | exploration actuelle, auth, CSP, smoke | Aucun changement observable avec flag désactivé |

## Golden corpus synthétique à construire

- G1 : A→B→C, A et C communs aux scènes B/C, labels courts ; vérifie pivot et continuité.
- G2 : groupId sur même focus ; qualifier et relation-value ; mêmes labels pour IDs différents ; pas de fusion erronée.
- G3 : cycle A→B→A, satellite redondant et cul-de-sac ; arrêt Auto sans boucle.
- G4 : policy stricte retire C, ses liens et compteurs ; comparer absence de C à une source ne contenant pas C (pas de canal latéral). Vérifier export, DOM, trace, frame intermédiaire.
- G5 : labels très longs, accents, bidi, chaînes contenant caractères XML et script ; aucun code, texte complet accessible.
- G6 : 0, 3, 8, 10 voisins, troncature serveur ou présentation ; tailles 16:9, 9:16, 1:1.
- G7 (futur) : projection spécialisée `qualified`, `partial`, `unqualified`, `refused`, preuve masquée et contradiction ; pas d'encodage abusif.

Les exemples JSON présents dans ce dossier sont des fixtures documentaires, pas des packs Kristal complets. Le golden runtime devra utiliser un pack fictif chargé via la vraie API, puis des corpus autorisés ; aucune qualification d'un vrai corpus à partir d'un test synthétique.

## Budget de départ proposé

| Mesure | Cible / limite initiale |
|---|---|
| Score importé | 64 KiB avant parse, 12 étapes, 6 sauts Auto |
| Préparation | 24 requêtes max, concurrence 2, deadline globale 15 s (local), timeout par requête 5 s ; un retry transitoire au plus dans budget |
| Scène | 1 centre + 3–10 satellites, limite 24 scènes (révélations incluses), 48 segments max |
| Bundle | 2 MiB UTF-8, durée max 120 s, largeur/hauteur logique 320–3840 |
| Lecture | 60 fps visés, p95 frame JS + rendu ≤ 16.7 ms sur machine de référence documentée ; fallback 30 fps si nécessaire, même durée |
| Préparation typique | objectif p95 ≤ 3 s sur fixture locale et machine de référence ; mesurer indépendamment API et compilation |
| Export vidéo | 30 fps, ≤ 3600 images à 120 s ; estimer espace avant export, seuil initial 2 GiB disque temporaire et arrêt propre si atteint |
| Qualité | aucun recouvrement illisible de labels dans les vues golden ; aucune preuve ou mention de troncature perdue |

Ces valeurs ne sont pas des performances observées. Mesurer 30 runs chauds et 10 froids d'un scénario fixe ; enregistrer machine, OS, Node, navigateur, font, versions, p50/p95, tailles et diagnostics. Ne pas utiliser une seule machine pour une garantie universelle. Ne jamais accélérer une timeline en cas de frames perdues : calculer le frame courant à partir du temps.

## Gates avant promotion

G0 : validation docs et contrats. G1 : tests ciblés du moteur. G2 : intégration avec API réelle, auth et policy. G3 : UI, build, CSP et Playwright. G4 : recette visuelle/accessibilité humaine et comparaison de sorties. G5 : revue propriétaire et publication éventuelle séparée. Les tests positifs et négatifs sont conservés avec les versions et les limites. Échec d'une gate ne devient pas « accepté » parce que la démo paraît fluide.

Commandes existantes, à lancer seulement dans une installation conforme avec accord du propriétaire :

```bash
npm run docs:check
npm run test:contracts
npm run test:navigation
npm run check:svelte-structure
npm run check:frontend-security
npm test
npm run test:ui
npm run build
npm run test:e2e:smoke
```

Les tests Koreograph spécifiques sont à écrire, et aucune commande `test:koreograph` n'existe dans le snapshot. La présente livraison ne lance pas la suite applicative. Voir [VALIDATION](VALIDATION.md).

## Extension du golden corpus et des gates v0.2

| Golden | Vérification supplémentaire |
|---|---|
| G8 | huit thèmes, modes mono/by-kind/by-focus, géométrie uniforme/par kind ; labels/contours contrastés, légende, aucune mutation de route |
| G9 | caméra fixe/auto, 3 aspects, continuité de poses et cadrage, reduced-motion |
| G10 | captions factuelles, références et temps ; durée insuffisante, label malveillant, preuve refusée |
| G11 | collisions réparables puis impossibles, trois passes max, même résultat, aucun objet indispensable supprimé |
| G12 | import thème hostile, Plan avec mauvais hash, QA falsifié, batch annulé et contexte changé |

G0 ajoute les trois schémas de présentation et fixtures. G1 ajoute Story, Theme Engine, caméra et validator purs. G3–G4 couvrent les combinaisons visuelles critiques et les exports. Le contrôle documentaire de contrastes n'est pas une qualification WCAG du produit. Voir [autocorrection](18-qualite-autocorrection.md) et [definition of done](20-production-serie-et-release.md).
