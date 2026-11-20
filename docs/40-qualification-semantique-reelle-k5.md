# Konstellation K5 — Qualification locale de vrais Kristals

**19 novembre 2026 · Première tranche de qualification · `K5-a` · À approuver au cas par cas.**

Le but de K5 est de passer de K0–K4, qui savent *afficher* des signes autorisés, à un processus de **lecture, inventaire, examen et qualification** sur des sources réelles, **sans canonisation ou divulgation automatiques**. Cette livraison réalise un premier cas concret **hiérarchique** et une preuve négative pour les mesures ; elle ne qualifie pas tous les types et renderers.

## 1. Sources exactement examinées (snapshot fourni)

Les contenus natifs de `kristal-public_Code_snapshot.zip`, acquis dans le contexte de travail, ont été inspectés en **lecture locale**, sans prise de décision de publication :

| Kristal | Fichier natif | SHA-256 des octets natifs | Évidence |
|---|---|---|---|
| `weather` | `kristals/weather/canon/domain/kristal-weather.canonical-payload.json` | `0778378dd8c2240267ed8184bad4b353d27f6aca74e727f41fa43eba20260ba7` | 234 assertions, `weather.states` ×234, deux dimensions ordinales, zéro scalar connu |
| `zoology` | `kristals/zoology/canon/domain/legacy-v6-state.payload.json` | `60bf441aa7e51e281626b6cb0e0050597abc284aed1090b8b4bbf0865e3ef7f8` | 619 assertions, 10 prédicats, `zoology.lineage_child_of` ×65, toutes les valuations boolean, zéro scalar connu |

Le `state-ref` du snapshot `zoology` est `urn:kristal:state:kristal-zoology`; celui de `weather`, `urn:kristal:state:kristal-weather`. Les **SHA-256 des fichiers natifs** ne sont pas les `datasetRef` du pack normalisé Konstellation. **Ne jamais les substituer**.

**Conséquences :**

- Une hiérarchie de taxons est **candidate** pour Zoologie : certaines assertions déclarent `child_of` entre deux référents. Les exemples réels `rel:zoology:00001` (`lineage:Porifera` → `lineage:Metazoa`) et `rel:zoology:00002` (`lineage:Ctenophora` → `lineage:Metazoa`) existent dans ce fichier. Ces exemples ne prouvent **pas** à eux seuls que la représentation est librement publiable, exhaustive ou contemporaine.
- `weather` ne permet **pas**, dans cet état source, de justifier le rayon, les axes numériques ou les distances K4 ; les évaluations `ordinal` ne sont pas des mesures physiques. Une future autre source de mesures exige une lecture distincte, avec unités, date et preuves.
- La classification Arketype, la présence du dépôt public ou le nom `lineage_child_of` **ne valent ni revue éditoriale ni droit de diffusion**.

## 2. Le nouvel audit local privé

`tools/visual-semantics/k5-audit.mjs` inspecte une source **v6 native spécifiée explicitement**, refuse les octets différents de l'empreinte annoncée et produit un rapport `CANDIDATE_ONLY` avec relation IDs, profils `valuations`, comptes, quelques références de preuve et types d'objets. Cet outil **ne prend aucune Reader Policy** en entrée : son résultat est donc **privé, non filtré et interdit de publication**, même si son fichier source est déjà accessible ailleurs.

**Mode d'emploi PowerShell 7, adapter le chemin de source à son installation :**

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $repo = 'C:\mycode\Konstellation\Konstellation'
  $node = 'C:\Program Files\nodejs\node.exe'
  $source = 'C:\mycode\Kristal\kristal-public\kristals\zoology\canon\domain\legacy-v6-state.payload.json'
  $outDir = Join-Path $env:LOCALAPPDATA 'Konstellation\k5-private-reviews'
  New-Item -ItemType Directory -Force $outDir | Out-Null
  & $node "$repo\tools\visual-semantics\k5-audit.mjs" `
    --source $source `
    --sha256 '60bf441aa7e51e281626b6cb0e0050597abc284aed1090b8b4bbf0865e3ef7f8' `
    --state-ref 'urn:kristal:state:kristal-zoology' `
    --out (Join-Path $outDir 'zoology-source-observation-k5.json')
  if ($LASTEXITCODE -ne 0) { throw 'Source differente ou audit refuse. Verifier le chemin et le SHA, sans utiliser un autre fichier par defaut.' }
}
```

Si le fichier `--out` existe déjà, l'outil refuse de le remplacer : supprimer ou renommer ce fichier **seulement après inspection**. Si le SHA ne correspond pas, c'est une **autre révision** ; refaire l'inventaire et requalifier les preuves, **ne jamais désactiver le garde-fou**.

## 3. Contrat de revue de hiérarchie

Le fichier `config/visual-hierarchy-reviews.json` démarre avec `rules: []`. Le lecteur ne permet aucune activation depuis `navigationHints`, des libellés, des sources distantes ni l'API HTTP. Les règles doivent être maintenues **dans le code local** après examen, avec le format `konstellation.visual-hierarchy-reviews/0.1`.

Chaque règle lie obligatoirement :

1. `datasetRef` exact, **dérivé de la normalisation utilisée par `Engine`**, accessible dans le `context` du vrai lecteur ;
2. `readerPolicyRef` exact du même `context`, donc une sélection de lecture bien définie ;
3. `stateRef` documentaire **confronté manuellement à l'état d'origine** ;
4. `relationId` exact, orientation `child-to-parent` ou `parent-to-child`, portée, référence de témoins qui **doivent être visibles** dans `state.assertions` ;
5. identité de la personne qui a révisé, date, argumentaire précis et limites.

Le **modèle volontairement non opérationnel** `examples/visual-semantics/zoology-hierarchy.CANDIDATE_ONLY.json` a des placeholders invalides : il **ne peut pas être copié tel quel** dans `config/visual-hierarchy-reviews.json`. L'existence d'un exemple n'est pas une approbation.

Pour une réelle activation, l'opérateur doit vérifier le profil d'entrée du Kristal, importer/ouvrir la surface autorisée dans Konstellation, récupérer le `context` exact du lecteur (`datasetRef` et `readerPolicyRef`), revoir des assertions visibles correspondant au sens, faire approuver la direction et la portée dans l'atelier, puis inscrire une règle dans la config. **À ce moment, le moteur applique sa vérification supplémentaire** des témoins dans l'état filtré ; aucun droit de publication ne découle de cette configuration.

## 4. Ce qui est effectivement implémenté dans K5-a

```text
Source native v6 réelle -- empreinte SHA -- AUDIT PRIVÉ (aucune policy appliquée)
                                                  ↓
                                      revue manuelle explicite
                                                  ↓
                        règle locale code-owned + datasetRef + policyRef
                                                  ↓
              engine.scope(context) applique policy AVANT navigation
                                                  ↓
           treeProjection + graphData (assertions et sources visibles)
                                                  ↓
               compileReviewedHierarchy (témoins + orientation)
                                                  ↓
                        DTO hierarchySemantics dérivé
                                                  ↓
                  TreeView.svelte (relation parent → enfant)
```

Les positions ne représentent **que** les arcs de filiation visibles et effectivement associés à la règle. Le lecteur refuse un **cycle**, un **auto-parent** ou **plus d'un parent distinct** dans cette vue de type arbre. Il conserve les relations brutes et affiche `constraints-unfulfilled`, plutôt que de cacher une arête pour faire croire à un arbre valide.

Les sous-ensembles partiels sont marqués `truncated` ; les nœuds non reliés à une filiation qualifiée ne sont pas des racines établies. Les témoins `assertionRefs` apparaissent en texte, sans leur inventer des sources.

L'ancienne vue `TreeView` reste utilisable **comme navigation structurelle non qualifiée** lorsque le registre est vide. Aucun changement de sémantique n'est appliqué aux 12 autres renderers ni à SPEK/Publisher/Light. Cette livraison ne crée **aucune interface de publication**.

## 5. Tests et statut

Exiger : `node --test tests/visual-hierarchy-k5.test.mjs`, puis `npm test`, puis `npm run build` avec Node >=24.15 et les dépendances installées. Les tests K5 comprennent : exactitude parent/enfant et témoins, anti-inférence depuis labels, refus par mauvaise révision/policy, témoin masqué, cycle, double-parent, permutation d'ordre, source v6 réelle et test négatif. L'installateur K5 exécute tous ces contrôles après copie, et **restaure K4 automatiquement en cas d'échec**.

Les tests hors navigateur ne remplacent ni une validation visuelle Playwright, ni une revue de source sur la machine, ni la qualification publique C3/C4. **K5-a est un atelier opérationnel privé, pas un ensemble de règles publiées**.

## 6. Suite de K5 après le présent pack

- Ouvrir deux exemples réels **avec Reader Policy prouvée** ; obtenir les `datasetRef` de l'instance effectivement chargée.
- Réviser et activer la **première** règle Zoologie, tester le vrai sous-graphe sur un navigateur et la lecture clavier ; garder les captures et les audits privés.
- Confirmer que l'import v6 dans Konstellation conserve réellement `zoology.lineage_child_of`, les identifiants d'assertion, les entités, les sources et leurs droits ; en cas de migration, **ne pas assimiler les identifiants sans table vérifiée**.
- Ensuite adapter le rendu DAG des preuves (distinct de causalité), matrices, chronologies et multi-échelles, sans présumer qu'une source v6 quelconque a des quantités.
- Ne pas toucher Konstellation-Light : son passage par C4 reste un jalon indépendant.
