# Konstellation — première couche de grammaire visuelle sémantique

**Lot K0–K3 ciblé · patch du 19 novembre 2026 · ne modifie ni SPEK, ni Publisher, ni le canon Kristal.**

## Ce que ce correctif réalise

La recette **Divergences** exploite les relations explicites `assertion.conflictsWith` **déjà visibles selon Reader Policy**, et les convertit en un plan visuel dérivé. Une composante bipartie peut se lire en deux côtés opposés ; si les contraintes ne sont pas compatibles avec un axe binaire (p. ex. triangle), le composant refuse le placement bipolarisé et présente un avertissement. Plusieurs composantes non reliées ne sont **jamais fusionnées** dans un espace sémantique global.

La recette **Boucles** n'accorde plus de signe causal `+` ou `−` par un simple mot du libellé. Un signe n'est porté que par des relations exactes, explicitement enregistrées dans une configuration **locale contrôlée**. Les boucles qualifiées ne sont calculées qu'à partir de ces relations.

Le nouveau panneau `SemanticEncodingView.svelte` affiche : paires réellement opposées, justification par identifiant d'assertion visible, deux colonnes sémantiques, sens des influences qualifiées, légende et liste accessible. Un placement radial ou un espacement de confort **n'est pas une relation de conflit**, ni une mesure de vérité.

**Hors du lot :** rendre les 13 renderers tous sémantiques, les axes quantitatifs, l'affectation d'opposition par lecture du vocabulaire, la migration de profils v6/v11/v10, les déploiements C3/C4, les compositions SPEK et les RuntimeSets GF. Ce lot est un **pilote contrôlé**, non la grammaire visuelle universelle achevée.

## Points modifiés

- `server/navigation/visual-semantics/registry.mjs` : vocabulaire de canaux et règles locales strictes.
- `server/navigation/visual-semantics/compiler.mjs` : compilation déterministe à partir du **DTO filtré**, sans accès au graphe privé global.
- `config/visual-semantics.json` : **vide par défaut**. Aucun ID de relation n'est qualifié par supposition.
- `server/navigation/projection.mjs` : ajoute le plan dérivé aux projections **divergences/traceability** et **feedback/causal-feedback**.
- `contracts/navigation-projection.schema.json` : champ optionnel `visualSemantics`, validé selon le contrat existant, sans modification du champ `schemaVersion:'1.0'`.
- `src/components/SemanticEncodingView.svelte` : rendu et alternatives lisibles.
- `src/components/AdaptiveProjectionView.svelte` : intégration non destructive dans les renderers contrôlés.
- `src/components/CausalFeedbackView.svelte` : affiche les relations non qualifiées comme **candidates**, pas comme des causalités confirmées.
- `tests/visual-semantics.test.mjs` : tests des preuves, contraintes impossibles, stabilité, visibilité, faux sens et registre.

## Une règle n'est pas une permission

La configuration du code peut contenir un binding **mainteneur** associé à un identifiant de relation exact :

```json
{
  "format": "konstellation.visual-encoding-bindings/0.1",
  "rules": [
    {
      "relationId": "EXEMPLE:relation_exacte",
      "kind": "opposition",
      "scope": "domaine_de_comparaison_verifie",
      "review": "Sens de la relation explicitement vérifié avant utilisation"
    }
  ]
}
```

Pour la causalité, `kind` vaut `causal` et `sign` prend `-1`, `0` ou `1`. **Aucun mapping fondé sur `label.fr`, `label.en`, le titre du Kristal ou une heuristique de Planner.** Les fichiers `examples/visual-semantics/*` sont synthétiques. Le texte de revue dans un JSON n'est **pas** une signature ni une qualification C1/C2. Les mainteneurs doivent confirmer l'identité/scope avant de modifier le fichier propriétaire, réviser les résultats et requalifier une publication éventuelle.

## Les positions opposées : ce qu'elles permettent de lire

- `conflictsWith` entre deux assertions visibles : ces assertions sont opposées **selon le lien explicite** ; elles ne sont pas automatiquement deux idées contraires dans une ontologie générale.
- Une **composante bipartie** admet un placement gauche/droite. Des nœuds du même côté ne sont pas des équivalents, ni nécessairement alliés.
- Un triangle de conflits ne peut pas être résumé sur un seul axe de deux camps : pas de placement trompeur.
- Un espacement arbitraire ne mesure rien. Aucune taille, forme ou couleur de ce lot ne signifie fiabilité, force de preuve, vérité ou importance.
- La présentation conserve `assertionRef` (identifiants déjà exposés dans le DTO) ; elle ne crée ni assertion, ni relation, ni preuve.

## Conservation de la confidentialité

Le compilateur travaille seulement à partir de `nodes`/`edges` de la projection **déjà passée par `engine.scope`**. Il ne lit pas directement `engine.entities`, `engine.sources` ni le registre entier. Une relation vers une assertion masquée n'est pas encodée. L'export du DTO existant contient le plan visible et ne doit pas être considéré autorisé à publication uniquement parce qu'il valide un schéma.

## Vérification et limites d'environnement

Depuis la racine Konstellation :

```powershell
node --test tests/visual-semantics.test.mjs
node --test tests/navigation-adaptive.test.mjs tests/navigation-variety.test.mjs
npm test
npm run test:ui
npm run build
```

Le dernier groupe exige les dépendances npm et **Node >= 24.15** (contraint par `package.json`). Lors de la fabrication du correctif, les tests nouveaux et les tests indépendants des dépendances ont été exécutés ; la suite totale/compilation Svelte doivent encore être exécutées sur une installation conforme et installée. Ne pas annoncer la conformité 1.0 finale avant la CI/régression.

**Intégration Light :** aucune modification ni activation C4. **Publisher :** aucune copie ni publication automatique. **Retour arrière :** utiliser le script fourni dans le ZIP de patch et la sauvegarde locale créée à l'application.
