# Exécution et performances

## Pipeline

Validation structurelle → résolution immuable → accès → validation sémantique/capacités → vue sous Reader Policy → plan borné → exécution → déduplication → ordre total → pagination → témoins.

Un backend ne couvrant pas un opérateur le refuse. Il ne l’ignore pas et ne passe pas silencieusement sur une requête moins restrictive. La qualification doit vérifier l’ordre effectif, même si le moteur optimise physiquement le plan.

## Identités et cache

Le profil de canonicalisation local du prototype trie les clés d’objets, conserve l’ordre des tableaux, emploie UTF-8 et JSON compact, sans nombres flottants dans QuerySpec. Les producteurs doivent maintenir les IDs exacts. Le protocole de production devra verrouiller la canonicalisation interlangage; le validateur Python ne démontre pas cette propriété.

L’identité sémantique dépend de la sélection et des quatre références de contexte. L’identité de page ajoute ordre, taille et position. Le cache d’exécution ajoute la partition d’autorisation et sa révision; les credentials eux-mêmes ne sont jamais sérialisés dans QuerySpec. Les ACL actuelles prévalent sur la possibilité historique de rejouer une requête.

Les hash sont calculés par le service; le client ne fait pas autorité. Les traductions de labels, coordonnées du graphe et panneaux ouverts ne changent pas l’identité sémantique. La v0.2 n’essaie pas de prouver l’équivalence de deux arbres différents.

## Pagination et erreurs

Le curseur opaque est lié à la requête, au contexte, à l’ordre, à la taille de page et à la partition d’accès. Toute incompatibilité le rend invalide. Ne pas retenir un offset dans une collection changeante. Le tri stable par ID simplifie le premier profil; un futur tri par label devra épingler langue, collation, version et tie-breaker par ID.

Erreurs proposées : `INVALID_QUERY`, `UNKNOWN_RELATION`, `TYPE_MISMATCH`, `UNSUPPORTED_CAPABILITY`, `CONTEXT_UNAVAILABLE`, `POLICY_UNEVALUABLE`, `CURSOR_MISMATCH`, `BUDGET_EXCEEDED`, `TIMEOUT`, `ACCESS_DENIED`.

Le profil v0.2 exige des résultats complets pour l'évaluation sémantique; une page complète n'est pas la totalité des résultats. Un budget de jointure dépassé fait échouer la requête, sans résultat partiel présenté comme complet. Un timeout dépend de conditions opérationnelles : il ne justifie pas une promesse d’erreurs identiques dans toutes les conditions matérielles.

## Budgets proposés, à mesurer

Sur un environnement de référence consigné et un corpus pilote figé : viser p95 < 500 ms pour les filtres simples et < 1 s pour un pivot, hors rendu SA. Ce sont des objectifs, pas des mesures. Consigner nombre d’entités/assertions, distribution des degrés, profondeur, politique, CPU/RAM, cache froid/chaud et concurrence. Inclure un cas de relation très connectée et de nombreuses assertions rejetées par politique.

Démarrer par annulation des requêtes obsolètes, regroupement des changements rapides de facettes, index existants et compteurs à la demande. Ajouter cache, index dérivés ou moteur RDF seulement après diagnostic. Vérifier résultats et témoins identiques sur un jeu de conformité avant tout changement d’adaptateur.
