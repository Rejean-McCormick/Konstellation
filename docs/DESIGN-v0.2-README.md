> Archive de conception v0.2. Pour le code actuel, lire le README à la racine.

# Konstellation

**Explorer la connaissance en construisant visuellement des requêtes.**

Version de conception **0.2.0**, 26 septembre 2026. Ce package contient une spécification proposée, des contrats JSON, des exemples et une validation locale. Il ne contient pas encore une application, un moteur de production ou une intégration Kristal/SA opérationnelle.

Konstellation permet de choisir un angle d’exploration, de sélectionner une population, puis de suivre ses relations. Chaque geste produit une opération explicite, inspectable et sauvegardable. Les relations proposées viennent de configurations déclaratives; aucune règle propre à Augustin ou à un domaine ne se cache dans l’interface.

## Parcours de référence

Une entrée « Histoire intellectuelle » ouvre implicitement la population des personnes. L’utilisateur choisit une période, un domaine, puis éventuellement exige la présence d’un courant. Il inspecte une personne et ses sources, ou demande les œuvres de **toutes** les personnes sélectionnées. Ce pivot conserve la sélection initiale, même si plusieurs pages de résultats n’ont jamais été affichées.

L’interface présente les critères actifs, les résultats et le chemin de navigation. Le graphe détaillé est une vue optionnelle. La représentation visuelle du parcours, elle, fait partie du cœur.

## Les frontières

| Objet | Responsabilité |
|---|---|
| Kristal / artefacts sélectionnés | État épistémique, identités, provenance et métadonnées amont |
| Reader Policy | Visibilité des assertions sous une politique explicite; distincte des droits d’accès |
| Relation Registry | Sens des relations, types et opérateurs exposés |
| Lens | Relations et chemins proposés, présentation et ordre des facettes |
| QuerySpec | Sélection exacte, relations traversées et contexte d’exécution épinglé |
| ExplorationState | Lens active, panneaux, sélection visuelle, historique et disposition |
| ResultSet | Entités distinctes, témoins des correspondances et état de complétude |
| SA | Articulation optionnelle du contenu choisi par Konstellation |

## Architecture minimale

Un frontend Astro/Svelte et un service de requêtes modulaire. Le service valide les contrats, applique accès et politique de lecture, planifie, exécute via un adaptateur et renvoie les résultats explicables. Les descriptions de relations ne contiennent pas de code exécutable.

**Commencer par qualifier la surface de requête des Runtime Packs Kristal.** Le snapshot Kristal définit déjà une surface locale contrainte; il ne garantit pas une implémentation déployée. Si le lecteur disponible ne couvre pas les opérations nécessaires avec les budgets retenus, une projection de lecture peut être ajoutée. RDF/Oxigraph est un candidat, pas une dépendance imposée au modèle public.

Aucun éditeur de graphes avancé, service SA, moteur RDF ou orchestrateur linguistique n’est nécessaire pour valider le premier parcours.

## Lire et vérifier

- [Décisions et optimisation](00-decisions.md)
- [Architecture et frontières](01-architecture.md)
- [Requêtes et pivots](02-query-model.md)
- [Lens, relations et navigation](03-navigation.md)
- [Statuts, absence et temps](04-knowledge-semantics.md)
- [Exécution, cache et pagination](05-execution.md)
- [Intégration Kristal et SA](06-integrations.md)
- [Plan de livraison et critères](07-delivery-plan.md)
- [Migration depuis v0.1](08-migration.md)
- [Sources inspectées et limites](09-source-audit.md)
- [Décisions d’architecture](adr/ADR-0005-bounded-selection-tree.md)

```bash
python -m pip install -r requirements-dev.txt
python tools/validate.py
```

La commande vérifie les schémas, les exemples, les références du registre, des cas invalides et un petit parcours sur données synthétiques. Elle ne qualifie aucun backend réel. Les documents v0.1 sont conservés sous `legacy/v0.1/` pour comparaison; ils ne sont plus normatifs pour v0.2.
