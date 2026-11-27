# Koreograph — chorégraphie procédurale des connaissances

**Statut :** spécification de conception v0.2 et implémentation Koreograph 0.3.0 (tranche spécialisée et production locale).  
**Base inspectée :** `znapshot_Konstellation_11260852.zip`, Konstellation `1.0.0-rc.2`.  
**Périmètre :** une première tranche de code et un laboratoire autonome sont disponibles ; aucune qualification de release ou autorisation de publication n'est revendiquée. Les contrats existants, la Reader Policy et les décisions acceptées de Konstellation prévalent.

> Kristal structure la connaissance ; Konstellation permet de la parcourir ; Koreograph met en scène ce parcours.

Koreograph transforme une navigation sémantique autorisée en une animation reproductible. Le système utilise des règles et algorithmes déterministes, sans IA générative, sans service de génération vidéo et sans montage manuel obligatoire. La connaissance reste la source du contenu ; le mouvement reste une représentation dérivée, jamais une assertion nouvelle.

## Démarrage de la tranche implémentée

Consulter en premier le [guide de spécialisations 0.3.0](24-specialisations-v0.3.md), puis le [guide de durcissement 0.2.0](23-durcissement-v0.2.md), puis le [guide de livraison du code 0.1.0](22-implementation-v0.1.md). Les chapitres 00–21 restent les spécifications de cible, pas une preuve que toutes leurs fonctionnalités sont livrées.

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
| [15 — Direction artistique et thèmes](15-direction-artistique-themes.md) | Marque #1E6864, tokens, huit presets, modes de coloration et formes |
| [16 — Narration et composition](16-narration-composition.md) | Story, gabarits factuels, rythme et actes |
| [17 — Caméra et réalisation](17-camera-direction.md) | Cadrage, trajectoires, directeur procédural |
| [18 — Qualité et autocorrection](18-qualite-autocorrection.md) | Validation visuelle, réparations bornées, gates |
| [19 — Contrats de production](19-production-contracts.md) | Theme, Production Request, Presentation Plan |
| [20 — Production et définition de terminé](20-production-serie-et-release.md) | UX finale, batch, critères de release |
| [21 — Référence visuelle](21-prototype-et-reference-visuelle.md) | Prototype SVG synthétique et scénarios golden |

## Artefacts de conception

- [Schéma Score 0.1](schemas/score.schema.json), [schéma Bundle 0.1](schemas/bundle.schema.json) : drafts documentaires stricts ; non enregistrés dans le validateur du serveur.
- [Partition de démonstration synthétique](examples/exploration.score.json), [partition automatique](examples/auto.score.json), [bundle synthétique](examples/exploration.bundle.json).
- [Schéma Theme](schemas/theme.schema.json), [Production Request](schemas/production-request.schema.json), [Presentation Plan](schemas/presentation-plan.schema.json) : extension compatible des contrats 0.1, ajoutée dans la documentation v0.2.
- [Bibliothèque des huit thèmes](themes/README.md), [demande Signature](examples/signature.production.json), [plan Signature](examples/signature.presentation.json), [prototype SVG historique](examples/koreograph-focus-demo.svg).
- [Rapport de contrôle documentaire](VALIDATION.md) et [script de validation des drafts](validate-design.py) : vérifications réellement effectuées sur cette livraison.

## Lecture rapide pour l'implémentation

Commencer par un seul parcours de Constellation en lecture seule, avec deux ou trois focus résolus, une partition courte, un compilateur et un lecteur SVG qui accepte un temps explicite. Ne pas introduire un autre moteur graphique, une base de données, une file de jobs ni une IA. Ajouter les exports et les recettes spécialisées après validation du mouvement et de la fidélité des informations.

Le nom `Koreograph` désigne le système ; `Kapture`, `Auto`, `Script` sont des modes de création proposés. Les noms de modules, structures, limites et interfaces de cette documentation sont des choix de conception à valider, pas des APIs livrées.

## État de la conception v0.2

Cette révision consolide les décisions de la discussion : marque officielle, thèmes indépendants du rythme, encodage monochrome ou par kind, formes, narration, caméra, validation visuelle, production locale et cible finale. Les choix de marque et de sélection de thèmes sont demandés par le propriétaire ; les seuils, noms de presets, taxonomies graphiques et ordre de livraison restent proposés. Le moteur générique est partiellement implémenté ; les extensions et qualifications restent à réaliser. Les nouveaux contrats ne remplacent pas Score/Bundle 0.1 ; la [définition de terminé](20-production-serie-et-release.md) porte sur la cible complète, et non sur le seul MVP.
