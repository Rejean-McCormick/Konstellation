# Rapport de validation — 2026-09-26

Résultat : **32 vérifications réussies**, Python 3.12 et jsonschema 4.26.0.

- 5 schémas Draft 2020-12 valides.
- Registre et relations inverses cohérents.
- 3 Lens et leurs références contrôlées.
- 2 QuerySpec, état d’exploration et ResultSet validés.
- 11 requêtes invalides rejetées (types, opérateurs, champs, bornes, budgets).
- 8 vérifications synthétiques : pagination séparée de la population, pivot complet, déduplication, exclusion multivaluée, absence dans la vue, présence positive, date incomplète et corrélation sur le même auteur.
- Liens Markdown actifs vérifiés localement.

Les exemples `fixture:*` illustrent des contrats; ils ne sont ni des assertions historiques ni un pack Kristal. Le ResultSet est un exemple de forme indépendant des 120 entités générées par les tests.

Non qualifiés : politiques Kristal réelles, contrôles d’accès et caches, pagination backend, projection, frontend, adaptation SA, performances et déterminisme interlangage. Les scénarios correspondants figurent au plan de livraison. Le passage des tests synthétiques ne constitue pas une certification d’intégration.
