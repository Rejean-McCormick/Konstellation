# Koreograph — chorégraphie procédurale des connaissances

**Statut :** spécification v0.1 du 26 novembre 2026. Pour activer et tester le code livré, voir [l’état de l’implémentation](ETAT-IMPLEMENTATION.md).

**Base inspectée :** `znapshot_Konstellation_11260852.zip`, Konstellation `1.0.0-rc.2`.

**Périmètre des chapitres de conception :** les contrats existants, la Reader Policy et les décisions acceptées de Konstellation prévalent.

> Kristal structure la connaissance ; Konstellation permet de la parcourir ; Koreograph met en scène ce parcours.

Koreograph transforme une navigation sémantique autorisée en une animation reproductible. Le système utilise des règles et algorithmes déterministes, sans IA générative, sans service de génération vidéo et sans montage manuel obligatoire. La connaissance reste la source du contenu ; le mouvement reste une représentation dérivée, jamais une assertion nouvelle.

## Parcours de lecture

| Document | Objet |
|---|---|
| [00 — Vision et décisions](00-vision-decisions.md) | Objectifs, périmètre, arbitrages et invariants |
| [01 — Architecture](01-architecture.md) | Composants, flux, responsabilités et frontières |
| [02 — Audit et intégration Konstellation](02-integration-konstellation.md) | Réutilisation, points d'insertion, contrats actuels |
| [03 — Partition et contrats](03-score-contracts.md) | Koreograph Score, plan compilé, versionnement |
| [04 — Génération des parcours](04-parcours.md) | Kapture, Auto, Script, sélection déterministe |
| [05 — Grammaire du mouvement](05-grammaire-mouvement.md) | Primitives, sens, preuves, fallbacks |
| [06 — Scènes et timeline](06-scenes-timeline.md) | Identités, layout, interpolation, caméra, horloge |
| [07 — Expérience utilisateur](07-experience-utilisateur.md) | UI minimale, édition, lecture, accessibilité |
| [08 — Rendu et exports](08-rendu-exports.md) | HTML/SVG, vidéo, reproductibilité et limites |
| [09 — Sécurité et provenance](09-securite-provenance.md) | Autorité, confidentialité, artefacts, refus |
| [10 — Validation et performance](10-validation-performance.md) | Tests, mesures, corpus synthétique, gates |
| [11 — Livraison et exploitation](11-livraison-exploitation.md) | Lots, dépendances, opérations, rollback |
| [12 — Guide développeur](12-guide-developpeur.md) | Interfaces proposées, backlog et méthode |
| [13 — Exemples et glossaire](13-exemples-glossaire.md) | Scénarios, terminologie et cas limites |
| [14 — Traçabilité des exigences](14-tracabilite.md) | Matrice, critères d'acceptation, questions ouvertes |

## Artefacts de conception

- [Schéma Score 0.1](schemas/score.schema.json), [schéma Bundle 0.1](schemas/bundle.schema.json) : drafts documentaires stricts ; non enregistrés dans le validateur du serveur.
- [Partition de démonstration synthétique](examples/exploration.score.json), [partition automatique](examples/auto.score.json), [bundle synthétique](examples/exploration.bundle.json).
- [Rapport de contrôle documentaire](VALIDATION.md) : vérifications réellement effectuées sur cette livraison.

## Lecture rapide pour l'implémentation

Commencer par un seul parcours de Constellation en lecture seule, avec deux ou trois focus résolus, une partition courte, un compilateur et un lecteur SVG qui accepte un temps explicite. Ne pas introduire un autre moteur graphique, une base de données, une file de jobs ni une IA. Ajouter les exports et les recettes spécialisées après validation du mouvement et de la fidélité des informations.

Le nom `Koreograph` désigne le système ; `Kapture`, `Auto`, `Script` sont des modes de création proposés. Les noms de modules, structures, limites et interfaces de cette documentation sont des choix de conception à valider, pas des APIs livrées.
