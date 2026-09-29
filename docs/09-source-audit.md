# Audit des sources de cette révision

Lecture effectuée directement dans les ZIP joints. Les empreintes des archives disponibles sont dans `input-snapshots.json`; leur présence dans ce manifeste n’implique pas un audit exhaustif de chaque dépôt.

| Source inspectée | Constat utilisé |
|---|---|
| Konstellation v0.1 : README, architecture, vision, modèle de requête, Lens, registre, frontières et QuerySpec schema | Point de départ déclaratif, mais requête plate et opérateurs peu contraints |
| kristal-framework : README | Spécification et contrats v5, candidat rc.2; pas base opérationnelle mutable |
| Kristal `04-query/query-contract.md` : sections modèle, métadonnées, politiques, ordre, limites et pagination | Surface locale déjà définie; jointures optionnelles et pas de SPARQL général requis |
| Kristal `04-query/reader-policy-profiles.md` : modes et modèle de politique | Visibilité distincte de validation/certitude et accès; labels préservés |
| Kristal `02-schemas/structured-epistemic-state.schema.json` : extraits d’identités, objets et provenance | Ne pas réinventer les types amont ni les réduire à des labels |
| SA `03_DOMAIN_MODEL_LOCK.md`, `15_ECOSYSTEM_BOUNDARIES.md`, README | CommunicationRequest, obligations intégrales, frontières d’autorité |
| SA `22_IMPLEMENTATION_STATUS.md` | Pipeline déclaré implémenté, ACL produit et RuntimeSets qualifiés nécessaires |
| SemantiK Runtime Orchestrator README | Orchestration release/activation, hors parcours de requête |

Les archives EncyKlopedia et kOA ont été inventoriées, sans audit détaillé de leurs implémentations. Cette révision ne prétend donc ni qualifier leur pipeline de bout en bout, ni fournir un mapping RDF conforme. Aucun test des runtimes amont ni benchmark de performance n’a été exécuté.

Les schémas, APIs Konstellation, limites et décisions v0.2 sont **proposés par cette révision**, pas attribués aux dépôts amont.
