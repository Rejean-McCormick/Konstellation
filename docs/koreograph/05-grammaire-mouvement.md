# 05 — Grammaire du mouvement et fidélité sémantique

## Règle fondamentale

Un mouvement peut être purement graphique ou porter une information sémantique attestée. La géométrie d'une constellation générique ne mesure pas l'importance, la similarité, la vérité ni la distance conceptuelle. Une ligne centre-satellite signifie « cible de navigation visible », non « assertion causale ». Les états `visualAudit` existants ne doivent pas être réinterprétés comme une qualification générale du Kristal. Voir [grammaire visuelle](../38-grammaire-visuelle-semantique.md) et [preuves filtrées](../47-k10-preuves-filtrees.md).

| Primitive graphique | Effet | Précondition / sens | Disponibilité cible |
|---|---|---|---|
| `focus` | Le satellite choisi devient le centre | Target exact visible ; aucune nouvelle assertion | 0.1 |
| `reveal` | Apparition progressive de voisins | Items résolus, limites visibles | 0.1 |
| `hold` | Immobilité | Temps de lecture | 0.1 |
| `fade` | Fondu entre deux états | Identité ou correspondance non fiable, saut indiqué | 0.1, interne |
| `connect` | Mise en évidence d'une connexion | Lien présent ; direction seulement si qualifiée | Futur |
| `isolate` | Atténuation du contexte | Élément reste visible ou accessible en texte | Futur |
| `expand` | Déploiement spatial | Changement d'échelle graphique ; sens hiérarchique seulement attesté | Futur |
| `compare` | Mise en parallèle | Éléments compatibles ; opposition non implicite | Futur |

Une intention `follow` se compile en transition `focus` (ou `fade` explicite si non appariable). Les primitives ne sont pas des types de relation, et les étapes d'un Score ne sont pas des preuves.

## Chorégraphie générique recommandée

1. Installer le cadre et le concept central ; laisser lire.
2. Mettre en évidence le satellite choisi par une variation visuelle neutre.
3. Déplacer le satellite vers le centre ; déplacer les survivants vers leur position finale.
4. Retirer les éléments absents et dévoiler le nouveau voisinage progressivement.
5. Stabiliser, présenter le titre du focus et indiquer si la vue est tronquée.

Un objet sortant peut disparaître mais ne se transforme pas en une entité différente. Les transitions ne doivent pas faire traverser un texte par une autre forme opaque si un réordonnancement simple évite le problème. Ne pas accumuler zoom, rotation, mouvement de caméra et rebond. Le mouvement est au service de la lecture, pas un effet décoratif permanent.

## Grammaire spécialisée (future)

| Structure de projection | Chorégraphie envisagée | Sémantique autorisée |
|---|---|---|
| `tree` | Ouvrir une branche | Hiérarchie locale, limitée et qualifiée ; pas de relation taxonomique absolue sans preuve |
| `dag` | Parcourir les dépendances dans l'ordre | Directions présentes et respect des cycles/refus |
| `timeline-lineage` | Avancer dans les dates | Dates/périodes de la vue ; aucune causalité par simple antériorité |
| `flow` / `state-flow` | Souligner une transition | Conditions visibles ; aucune exécution de l'action |
| `causal-feedback` | Circulation d'une influence | Signes et sens seulement avec règle qualifiée et témoins visibles |
| `matrix` | Révéler lignes/colonnes | Unité, valeurs absentes et échelle explicites ; aucun classement par défaut |
| `traceability` | Suivre un chemin vers la preuve | Provenance et références exactes visibles |
| `multiscale` | Traverser des couches | Appartenance et échelle attestées ; pas de hiérarchie créée par zoom |
| `spatial` | Cadrer des points | Coordonnées et référentiel connus ; pas de position inventée |

Avant l'intégration spécialisée, chaque adaptateur doit déclarer les champs de DTO consommés, le statut d'audit accepté, les références transportées, la représentation neutre et son test négatif. `qualified`/`partial` : seules les preuves admissibles de la projection concernée peuvent être animées. `partial` garde la mention partielle. `unqualified`/`refused` : pas d'encodage sémantique ; rendre le statut et le fallback neutre. Une règle mainteneur ne confère aucun droit. Ne jamais qualifier par le nom de la recette, le label de relation ou le corpus.

## Styles de présentation

`minimal` : peu d'ornement, transitions courtes, fond sobre. `cinematic` : déplacement fluide, temps de lecture équilibré, cadrage léger. `didactic` : titre et étapes plus explicites, pauses plus longues. Ces profils changent l'esthétique et le rythme, pas le sens ni la sélection des données. Les tokens de couleur doivent préserver les encodages approuvés de Konstellation et offrir contraste et alternatives textuelles.

## Extension v0.2 : thème et mouvement indépendants

Les trois styles historiques sont des profils temporels. La [bibliothèque de thèmes](15-direction-artistique-themes.md) ajoute `mono`, `by-kind`, `by-focus` indépendamment du rythme et des primitives. Le mode by-relation n'est pas disponible dans le contrat générique. Les géométries, couleurs et traits doivent être redondants avec un label ou une légende ; aucun canal ne constitue une preuve. Les mouvements permanents décoratifs ne sont pas requis.
