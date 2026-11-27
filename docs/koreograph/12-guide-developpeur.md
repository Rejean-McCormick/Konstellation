# 12 — Guide développeur et interfaces proposées

## Organisation minimale du code futur

```text
src/lib/koreograph/
  score.mjs          # validation et normalisation
  reader-adapter.mjs # accès aux API existantes
  capture.mjs        # intents confirmés
  route-planner.mjs  # Auto
  resolver.mjs       # context guard + snapshots
  scene.mjs          # adaptation et layout
  compiler.mjs       # segments et Bundle
  frame-at.mjs       # évaluateur pur
  export.mjs         # sérialisation locale
src/components/
  KoreographPanel.svelte
  KoreographPlayer.svelte
contracts/           # drafts promus après revue
  koreograph-score.schema.json
  koreograph-bundle.schema.json
tests/
  koreograph-contracts.test.mjs
  koreograph-core.test.mjs
  koreograph-policy.test.mjs
  ui/                # tests composants
  browser/           # scénarios Playwright
```

Arborescence proposée uniquement ; éviter un dossier pour chaque classe. Le noyau n'importe pas Svelte, DOM, fetch ou serveur ; les effets sont injectés aux frontières. L'adaptateur graphique réutilise les helpers existants et accepte des métriques de texte stables. Les fonctions pures sont testables via `node --test`.

## Contrats de fonctions (pseudo-code, non implémenté)

```ts
type Target = { focus: Focus; groupId: string | null };
type PrepareOptions = { signal: AbortSignal; generation: number; budgets: Budgets };
interface ReaderAdapter {
  currentContext(): ReadContext;
  constellation(target: Target, limit: number, signal: AbortSignal): Promise<ConstellationResponse>;
}
function validateScore(raw: unknown): Score;
function planAuto(score: AutoScore, reader: ReaderAdapter, opts: PrepareOptions): Promise<ExplicitScore>;
function resolve(score: ExplicitScore, reader: ReaderAdapter, opts: PrepareOptions): Promise<ResolvedScore>;
function adaptScene(snapshot: AuthorizedSnapshot, layout: LayoutOptions): Scene;
function compile(resolved: ResolvedScore, profile: PresentationProfile): Bundle;
function frameAt(bundle: Bundle, timeMs: number): Frame;
function renderSvg(frame: Frame, opts: RenderOptions): string;
```

Type `Focus` = union existante de ConstellationResponse ; `ReadContext` comprend contexte de lecture, Lens, Kristal et génération active (pas de token sérialisable). `resolve` peut réutiliser les snapshots obtenus par `planAuto` uniquement dans le même contexte actif et la même génération ; éviter une deuxième lecture systématique. `compile` est sans effet, `renderSvg` est une sérialisation sûre, pas un template de code importé. La signature réelle doit être alignée sur les types JavaScript du dépôt.

## Première tranche verticale

- Adapter la réponse Constellation actuelle en objets stables ; tester deux scènes dont un satellite devient centre.
- Construire un Bundle de deux `hold` et un `focus` et vérifier `frameAt` à 0, milieu, fin ; fixture de ce dossier comme exemple de format.
- Créer le Player SVG et ses contrôles (pas d'API réseau dans le Player).
- Raccorder une partition Script courte à l'adaptateur API authentifié, avec abort et contrôle de contexte.
- Ajouter Kapture puis Auto sur les mêmes structures, pas de deuxième pipeline.
- Ajouter HTML/Score/poster uniquement après les tests de rendu et de sécurité.

## Codes de diagnostic proposés

`KOR_INVALID_SCORE`, `KOR_UNSUPPORTED_VERSION`, `KOR_CONTEXT_CHANGED`, `KOR_TARGET_UNAVAILABLE`, `KOR_BUDGET_EXCEEDED`, `KOR_PREPARE_TIMEOUT`, `KOR_CANCELLED`, `KOR_INVALID_BUNDLE`, `KOR_EXPORT_UNSUPPORTED`, `KOR_EXPORT_FAILED`. Ils appartiennent au module client, ne sont pas des codes HTTP existants. Un diagnostic n'expose pas la différence entre cible interdite et inconnue. Auto peut rendre `EARLY_STOP` non fatal si le sous-parcours est valide ; une erreur de contexte ou d'autorisation reste fatale.

## Revue de changement

Pour toute PR : contexte source et compatibilité, séparation des modules, validation du contrat, conservation d'identité, fallback explicite, tests négatifs policy, test d'accessibilité, absence de dépendance injustifiée, mesure de performance, changelog et documentation. Ne pas promouvoir le flag sans gate propriétaire. Toute modification de grammaire spécialisée inclut la preuve visible exacte et un exemple refusé. Voir [extension guide](../23-extension-guide.md).

## Modules additionnels (après noyau)

Ajouter au même `src/lib/koreograph/` des modules `theme.mjs`, `story.mjs`, `camera.mjs`, `director.mjs`, `quality.mjs`, `production.mjs` selon besoin ; ne pas les transformer en services. Le répertoire `themes/` contient les ressources validées lors de la promotion. Le compilateur peut conserver ces responsabilités dans moins de fichiers tant que les frontières sont testables. Voir [interfaces de production](19-production-contracts.md). Diagnostics additionnels proposés : `KOR_INVALID_THEME`, `KOR_UNSUPPORTED_ENCODING`, `KOR_PLAN_MISMATCH`, `KOR_QUALITY_BLOCKED`, `KOR_DURATION_INSUFFICIENT`, `KOR_OUTPUT_UNSUPPORTED`. Tests dédiés pour tokens, sélection, gabarits, poses, réparation et digests. Aucun de ces modules n'existe dans le snapshot.
