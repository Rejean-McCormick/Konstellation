# Konstellation K4 — Grammaire visuelle des attributs (première tranche)

**Date : 2026-11-19 · Statut : correctif local incrémental de conception/implémentation.**

## 1. Ce que K4 ajoute réellement

La couche K0–K3 contrôle les *oppositions explicitement attestées* et les *relations causales signées* sans promouvoir le layout décoratif en preuve. K4 ajoute un **second plan dérivé, indépendant**, `attributeSemantics/0.1`, pour la sémantique de cinq canaux d'attributs :

| Canal | Donnée admissible | Sens affiché | Refus explicite |
|---|---|---|---|
| Forme (`shape`) | `type` exact d'une entité visible, dans une table révisée | Rôle/type structurel *déjà connu* | type absent/non répertorié |
| Couleur (`color`) | `valuation` de type `categorical` connue et liée à un `relationId`, une `dimension` et une catégorie exacts | Classe catégorielle, lisible en texte et symbole | catégorie inconnue, statut non connu, source ambiguë |
| Taille (`size`) | `valuation` de type `scalar`, valeur numérique finie, unité identique, intervalle non négatif et borné | rayon monotone avec la valeur (ne pas interpréter l'aire comme quantité proportionnelle) | négatif, unit mismatch, hors intervalle, valeur multiple incohérente |
| Axe X/Y (`x`, `y`) | 2 dimensions scalaires, unités, bornes et domaine définis | Position sur chaque dimension (sans interpolation de faits) | unités/dimension/révision incompatibles, paire non liée à une même assertion |
| Distance (`distance`) | **deux axes** possédant *le même* `distanceGroup`, la même portée et unité, rapport pixel/unité égal | Distance euclidienne dans le domaine explicitement revu | par défaut **non métrique** ; distance non déductible si condition non remplie |

Les marqueurs de forme et de couleur sont des **tokens de palette contrôlés**, jamais des styles injectables par le Kristal. L'origine de chaque valuation est conservée dans `assertionRefs`; la forme porte `origin:visible-entity-type` et aucun faux témoin d'assertion.

## 2. Architecture et frontières

```text
engine.scope(query.context)  -- Reader Policy et visibilité APPLIQUÉES
       ↓
Projection déjà validée : nodes / rows / items / records / points
       ↓
collectVisibleAttributeInput(result, state) : sujets et assertions encore visibles
       ↓
loadVisualAttributeBindings() : config contrôlée côté CODE, VIDE par défaut
       ↓
compileVisualAttributes(...)
       ↓
DTO `attributeSemantics` validé contre `navigation-projection.schema.json`
       ↓
SemanticAttributeView.svelte : scatter documenté + table accessible
       ↓
Renderer spécialisé existant (inchangé)
```

**Le `NavigationPlan` et le Renderer Registry sont conservés.** La sortie K4 n'est pas un champ du canon. Les recettes génériques qui ne passent pas par `/api/navigation/project` conservent le rendu K0–K3 sans ces canaux ; aucune identité ni autorité ne se transmet de SPEK, Publisher ou Light.

Le rattachement s'effectue dans `projectAdaptiveNavigation(...)` **après** le calcul de la projection spécialisée, avec le `state` déjà filtré. Ce point de jonction couvre les dix familles `timeline-lineage`, `tree`, `dag-proof` (DTO `dag`), `flow-path` (`flow`), `causal-feedback`, `matrix-profile` (`matrix`), `state-flow`, `traceability`, `multiscale-layer` (`multiscale`) et `spatial`. En absence de règles, il n'ajoute aucune propriété à la sortie : **compatibilité stricte avec la baseline K3**.

Le nouveau composant est un **panneau de représentation sémantique distinct**, inséré avant la vue d'origine. K4 ne recolore ni ne redimensionne arbitrairement les marqueurs historiques des dix renderers ; ce travail demanderait une adaptation explicite par renderer et des tests UI dédiés. Ceci est la **première tranche de généralisation**, pas la qualification de tous les graphiques.

## 3. Autorité des règles et source des valeurs

`config/visual-attributes.json` comporte initialement :

```json
{"format":"konstellation.visual-attribute-bindings/0.1","rules":[]}
```

Un exemple **synthétique, non activé** figure à `examples/visual-semantics/qualified-attributes.example.json` avec cinq règles. Les cinq dimensions de démonstration ne correspondent à aucun véritable Kristal.

Pour qualifier une règle réelle, obtenir d'abord l'identifiant du `relationId`, les `dimension` et `unit` **exactement observés** dans une assertion autorisée, définir bornes comparables et portée de lecture, documenter la revue (minimum 20 caractères), puis exécuter les tests avant tout déploiement. Les textes `review` servent à établir la responsabilité éditoriale du code local ; **ils ne remplacent jamais un reçu C1/C2/C3/C4**.

La sélection d'un Kristal ou de `navigationHints` ne permet **jamais** d'ajouter une règle. L'acceptation des valeurs requiert simultanément : sujet présent et visible, assertion encore inscrite dans `state.assertions`, identifiant exact de relation, dimension et value_semantics exacte, value_state connu, valeur non ambiguë, et, pour les scalaires, unité et intervalle conformes.

Un nœud porteur de deux valeurs incompatibles pour un canal est affiché **sans ce canal**, pas avec la dernière valeur rencontrée. Une ambiguïté interne à une assertion provoque le même refus. Une provenance non visible n'est jamais exposée dans les détails du panneau.

## 4. Règles de distance, échelle et traduction

- Les deux axes doivent être activés dans le même domaine, avec unités compatibles et `distanceGroup` exact.
- Le dessin utilise **un unique rapport pixels/unité** sur les deux axes seulement si ce groupe est révisé.
- Pour éviter de relier deux mesures de moments ou contextes incompatibles, un point XY exige que ses deux valeurs partagent une **assertion témoin visible**. Sinon, le tableau conserve les valeurs séparées sans fabriquer un point.
- Sans qualification de distance, les coordonnées X/Y restent interprétables **séparément**, mais la distance dans le dessin est explicitement non métrique.
- La vue SVG (`viewBox`) préserve les proportions ; les labels peuvent changer de langue, pas les nombres, IDs, unités ni la règle.
- La couleur est toujours doublée d'une catégorie écrite, la taille d'une valeur, la forme d'un type, et les coordonnées du tableau. La vue reste lisible au clavier/lecteur d'écran grâce au tableau.

## 5. Limites connues et étapes suivantes

1. **Configuration vide** : aucune donnée réelle ne sera automatiquement colorée, dimensionnée ou déplacée. C'est une mesure de sûreté, pas un échec.
2. **Un jeu de règles par canal** pour la première tranche : une couleur, une taille, une forme et un couple d'axes par projection. Des domaines combinés simultanément demandent un registre multi-recettes.
3. Limite **160 entités**, **4 096 assertions**, **24 valuations par assertion**. Si la sélection dépasse un budget, `status:incomplete`, aucun encodage partiel.
4. Les métriques spatiales absolues et les vraies coordonnées géographiques ne sont pas encore normalisées par un profil de géodésie ; ne pas assimiler ce scatter à un fond de carte.
5. Les classes de structure sont celles effectivement visibles et déjà contrôlées, pas des catégories inférées de la position.
6. Le passage dans les **renderers d'origine** pour appliquer les mêmes attributs au dessin principal reste à faire, au cas par cas (arbre / DAG / matrice / carte / spatial). Pas de changement des coordonnées historiques sur les formes non qualifiées.
7. Les visualisations Light et le Publisher ne sont pas modifiés. C4 et autres contrôles de diffusion restent requis.
8. Il reste à qualifier les scénarios dans le navigateur (Svelte, Playwright, responsive, focus, contrastes) sur Windows. Les tests Node purs ne remplacent pas le build Astro.

## 6. Tests requis

```powershell
node --test tests/visual-semantics.test.mjs tests/visual-attributes.test.mjs
npm test
npm run build
```

La première commande couvre les tests purs K0–K4. Les deux dernières doivent être exécutées avec Node >=24.15 et les dépendances installées. Le correctif fournit un installateur qui fait ces vérifications et restaure le snapshot K3 en cas d'échec.

## 7. Rétrocompatibilité

- `visualSemantics/0.1` K3 demeure inchangé : les oppositions et signes causaux conservent leurs témoins.
- `attributeSemantics/0.1` est **optionnel** dans le même DTO public version 1.0, sans changement de l'identité des nœuds.
- La configuration est vide et valide : pas de migration de données, pas de promotion de valeur ou de statut.
- Les 13 renderers du Renderer Registry ne sont pas recréés, et aucune extension executable n'est fournie par un Kristal.
