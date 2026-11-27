# 15 — Direction artistique, identité et Theme Engine

**Décision propriétaire :** couleur de marque Koreograph `#1E6864` ; choix de thèmes monochromatiques et polychromatiques permettant de distinguer les éléments visuels. Les palettes secondaires, noms de thèmes et seuils ci-dessous sont proposés. Aucun asset externe ou logo non fourni n'est imposé. La marque ne constitue pas une catégorie de connaissance.

## Architecture et résolution

Le thème est une ressource déclarative versionnée, distincte de la partition, de la policy et du profil temporel. `minimal/cinematic/didactic` restent les profils de rythme du Score 0.1 ; ne pas les confondre avec un thème visuel. Le [contrat Theme 0.1](schemas/theme.schema.json) et les fichiers [themes](themes/README.md) sont des drafts prêts à valider. Un thème n'est ni du CSS ni un renderer programmable. Il ne contient pas d'IDs de concepts, de références distantes, de credentials, d'instructions de navigation ou d'évaluation de vérité.

Résolution, dans l'ordre : (1) règles sémantiques et accessibilité non contournables ; (2) thème sélectionné et ses valeurs de défaut ; (3) choix explicite du mode chromatique et de la géométrie dans la demande ; (4) ajustements bornés de contraste et de layout par le validator. Les valeurs effectives et les corrections sont figées dans le Presentation Plan. Aucun choix ne modifie le Score. En cas d'incompatibilité, expliquer et proposer une alternative ; ne pas remplacer silencieusement un thème.

### Identité

| Token de marque | Valeur | Usage indicatif |
|---|---|---|
| brand.900 | `#0B2927` | fond profond |
| brand.700 | `#164B48` | surface sombre |
| brand.primary | `#1E6864` | marque officielle, accent selon contraste |
| brand.400 | `#559D97` | accent secondaire |
| brand.100 | `#D0E7E4` | texte ou surface claire |

La valeur primaire demeure fixe, mais n'est pas nécessairement la couleur de chaque objet ni celle des textes sur tous les fonds. Utiliser un token de premier plan contrasté pour un petit texte de marque. Le mot-symbole est `Koreograph`, K éventuellement en gras, sans logo inventé ; affichage désactivable dans l'animation, pas dans l'identité de l'application.

### Collection initiale (8 configurations)

| Thème | Fond | Défaut | Intention |
|---|---|---|---|
| Signature | `#0C1918` | mono | identité de marque, présentation sombre |
| Paper | `#F8F9F6` | mono | présentation claire et éditoriale |
| Graphite | `#18191C` | mono | niveaux de gris sombres |
| Ink | `#F4F3EF` | mono | encre sur papier |
| Spectrum | `#101C24` | by-kind | lecture catégorielle sombre |
| Atlas | `#F6F8FA` | by-kind | lecture catégorielle claire |
| Blueprint | `#10263E` | mono | présentation technique bleue |
| Editorial | `#F3EDE2` | by-kind | présentation chaude |

Les huit thèmes supportent les mêmes modes ; le défaut n'est pas une restriction. Le thème Signature est proposé comme défaut produit ; l'ancien profil minimal reste le défaut de rythme si choisi. Pas de multiplication des shaders ou surfaces de rendu. Les contrastes sont calculés sur les couleurs effectives, y compris opacité, pas sur le nom du thème.

## Encodages indépendants

`mono` utilise une seule famille chromatique (hors fonds/textes neutres et marque optionnelle). `by-kind` colore les **kinds graphiques effectivement présents** dans le Bundle 0.1. `by-focus` utilise des tokens focus/contexte, sans confondre focus et importance intrinsèque. `by-relation` est réservé aux adaptateurs spécialisés (KOR-6) : pour les liens `navigation` 0.1, refuser ce mode avec diagnostic, ou proposer explicitement mono. La forme `uniform` conserve les cercles ; `by-kind` utilise la table de formes du thème. Le focus est indiqué par anneau/contour et texte, indépendamment de sa couleur. Un objet gardant sa clé et son kind conserve sa couleur et sa forme lors du changement de rôle (sauf mode by-focus, qui encode explicitement le rôle transitoire).

| Kind du Bundle 0.1 | Forme proposée | Sens maximal |
|---|---|---|
| entity | cercle ou rectangle arrondi selon thème | représentation d'entité, pas forcément personne |
| concept | cercle | kind concept de la projection, pas classification ontologique ajoutée |
| source | rectangle documentaire | source visible |
| value | capsule | valeur affichée, pas type d'attribut inféré |
| group | hexagone | regroupement de présentation, pas entité canonique |

Les exemples de design antérieurs (processus, événement, attribut, etc.) restent une vision illustrative ; **ne pas mapper ces catégories à des libellés**. Toute extension de taxonomie exige DTO, registre exact, preuve et fallback. Si un kind inconnu arrive, la validation du Bundle 0.1 le refuse ; dans un futur contrat permissif, le fallback est neutre et signalé. Les styles de traits directionnels/incertains n'apparaissent que si l'adaptateur justifie ce sens. Les liens de navigation restent sans flèche causale.

### Tokens et géométrie

Le contrat fixe background, foreground, mutedText, node, nodeStroke, edge, accent, focus, context, brand ; une palette par kind et une forme par kind complètes ; fontFamily (allowlist sans URL), tailles, épaisseurs, anneau, halo borné, grille légère optionnelle, branding visible. Les grandeurs sont exprimées en px logiques du viewport de référence 1600 × 900, adaptées au format via layout et métriques ; taille finale contrôlée sur support. Les contours constituent le canal discriminant si la couleur de remplissage ne contraste pas. Les profils de mouvement sont séparés du thème ; pas de mouvement décoratif permanent, ni de changement de durée via couleur. Légende générée seulement pour les modes et kinds visibles, avec libellés explicites.

## Qualité et accessibilité

Cibles WCAG 2.2 AA proposées : contraste texte normal ≥4,5:1 (grand texte ≥3:1 si réellement admissible), contours et indicateurs essentiels ≥3:1 sur leur fond adjacent. Calcul WCAG de luminance sRGB linéarisée ; composer alpha sur le fond avant calcul. Ne pas appliquer un seuil de couleur entre tous les remplissages comme unique test : la forme, le label et le contour doivent conserver la distinction en niveaux de gris et simulations de déficiences chromatiques. Tester les états de focus et de transition ; ne jamais atténuer le texte indispensable pour gagner de la place. Les modes mono et reduced-motion conservent le contenu, la légende, les preuves et la transcription. Vérifier la visibilité de la marque sans dénaturer sa valeur officielle.

## Import et personnalisation

Importer/exporter un JSON Theme validé, ≤32 KiB avant parse ; identifiants ASCII bornés, hex RGB strict, champs inconnus refusés, aucune expression/CSS/HTML/URL/font externe. Valeurs numériques bornées. Les presets sont code-owned et immuables pour une révision ; éditer crée une copie locale avec ID/version propres. Le mode local n'écrit rien sans confirmation ; aucune galerie distante. La clé cache est hash du contenu canonique + versions du moteur + métriques de font + aspect, isolée par contexte pour tout résultat dépendant de données. Recalculer l'habillage seul si compatible ; si tailles/formes/contraste changent les limites, recalculer layout, cadrage et plan, pas la route. Un aperçu de thème peut être généré sur un corpus synthétique, sans API.

Tests : huit thèmes × trois modes × deux géométries, trois aspects sur corpus borné ; tests structurels exhaustifs, visuels échantillonnés puis gates critiques. Import négatif de CSS, URLs, couleurs invalides, champs inconnus, valeurs hors bornes ; captures des textes, contours et légendes. Voir [qualité](18-qualite-autocorrection.md) et [contrats de production](19-production-contracts.md).
