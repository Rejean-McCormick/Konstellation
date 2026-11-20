# K6-a — Deux passes privées sur les collections Kristal (sans fausse qualification)

**Statut : moteur de lots K6-a prêt, batch du snapshot 2026-11-19 effectué hors publication.** Les sorties sont des observations sur des **états natifs non filtrés**, pas des projections du lecteur. Elles ne modifient pas le canon ni C1–C4.

## 1. Périmètre réellement trouvé

Le ZIP source `kristal-public_Code_snapshot.zip` contient **126 dossiers** `kristals/`. Un examen par contenu (pas par nom de fichier) a identifié **84 états `kristal_state` / `schema_version=6.0` contenant `assertions[]`** et **42 dossiers qui ont besoin d'un adaptateur** pour l'analyse de ce lot. Les 84 états ont **40 333 assertions** au total dans la version épinglée du snapshot. Le seed `examples/visual-semantics/k6-pins.snapshot-20261119.json` conserve les 84 chemins, SHA-256, et les 42 statuts d'adaptateur ; il n'est ni une autorisation ni un inventaire de toutes les autres surfaces dérivées.

Les 42 restants contiennent des composants `native_json_component`, des matériaux v9/domain-state, ou des profils différents/non exposés dans `canon/domain`. **Aucun ne peut être traité comme un état v6 natif par le simple fait d'être dans `kristal-public`.** La seconde phase de généralisation exigera des adaptateurs vérifiés de ces profils.

## 2. Les deux passes implémentées

**Passe 1 :** pour chaque entrée native, contrôler le chemin canon/domain, les octets du fichier et le SHA-256 prévu (12 Mio/fichier maximum, refus de symlink/junction), puis appeler **l'auditeur K5 existant** `auditNativeV6` sans réécrire son analyse. Il produit un rapport JSON privé, avec assertionCount, objectKinds, valuations, exemples de témoins, etc. Les fichiers sont immuables et rejouables.

**Passe 2 :** regrouper par **forme de donnée observée** (référence vers entité, candidat scalaire connu, ordinale, intervalle, autre), prioriser les relations pour une revue et produire un diagramme SVG privé **de comptages d'assertions par relation**. Les SVG **ne sont pas des diagrammes de relations sémantiquement qualifiées** : une barre indique uniquement un nombre de lignes du fichier brut, pas la vérité, l'importance, l'intensité ou une hiérarchie. Aucun mot tel que `child_of`, `conflict` ou `cause` ne peut activer une grammaire K5.

Pour **chaque source** : `pass1/slug.json`, `pass2/slug.json`, `private-diagrams/slug.svg`. Également `SUMMARY.json` et l'historique des synthèses. Statuts : `REVIEW_REQUIRED`, `NEEDS_ADAPTER`, ou `REFUSED` ; ils sont **distincts** des approvals éditoriales et de C1–C4.

## 3. Exécuter une collection locale (après installation)

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $repo = 'C:\mycode\Konstellation\Konstellation'
  $collection = 'C:\mycode\Kristal\kristal-public'  # à remplacer si autre emplacement
  $out = Join-Path $env:LOCALAPPDATA 'Konstellation\k6-private-reviews'
  $node = 'C:\Program Files\nodejs\node.exe'
  & $node "$repo\tools\visual-semantics\k6-batch.mjs" `
    --collection-root $collection `
    --pins "$repo\examples\visual-semantics\k6-pins.snapshot-20261119.json" `
    --out $out
  if ($LASTEXITCODE -ne 0) { throw 'Batch partiel/refusé — vérifier SUMMARY.json, ne pas publier' }
}
```

Si le dossier local `kristal-public` a changé depuis le ZIP, **ce batch refusera ses octets modifiés**. C'est voulu : exiger un nouveau manifeste de pins révisé pour les nouveaux états.

## 4. Exécuter directement un ZIP exact (sans décompresser tout le dépôt)

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $repo = 'C:\mycode\Konstellation\Konstellation'
  $zip = Join-Path $env:USERPROFILE 'Downloads\kristal-public_Code_snapshot.zip' # si disponible ici
  $out = Join-Path $env:LOCALAPPDATA 'Konstellation\k6-private-reviews'
  py -3 "$repo\tools\visual-semantics\k6-snapshot-batch.py" `
    --zip $zip `
    --out $out `
    --node 'C:\Program Files\nodejs\node.exe'
  if ($LASTEXITCODE -ne 0) { throw 'Batch ZIP partiel/refusé' }
}
```

Le SHA-256 **du ZIP entier** est vérifié, puis seuls les fichiers native-v6 autorisés **par le manifeste** sont ouverts et recopiés temporairement ; le contenu est effacé en fin de traitement. La sortie reste privée et hors du dépôt source/code.

## 5. Reprise, cache et deuxième passe

- Même jeu de pins, mêmes octets et même version K6 → le dossier d'édition reste identique (`runs/<runId>`), les résultats identiques sont réutilisés. 
- Dossier `summary-history/` pour enregistrer les versions de synthèse, `SUMMARY.json` pointe vers la synthèse la plus récente. Les rapports individuels sont immuables ; une collision de contenu est refusée.
- Un `--max N` volontaire crée un run distinct (le nombre d'entrées non traitées est déclaré), permettant des lots de 10–20 pour calibrage. **Pas de permutation silencieuse** des entrées.
- Les sorties portent `notPolicyFiltered: true`, `notApproved: true`, `notPublishable: true`.
- Les dossiers `NEEDS_ADAPTER` entrent dans la file de deuxième passe, mais **aucune conversion v9/v11 ou réconciliation d'identité** n'est ici implémentée.

## 6. Conditions pour produire plus tard les VRAIS diagrammes de lecture

L'audit K6 ne remplace pas le `engine.scope(query.context)` de Konstellation : les textes, identifiants et liens du fichier natif ne sont **pas** filtrés par Reader Policy. Les vrais diagrammes ne doivent donc pas être générés directement des rapports K6. Il faut :

1. Importer une source autorisée dans Konstellation et vérifier les identifiants `datasetRef` et `readerPolicyRef` réels.
2. Faire examiner la sémantique d'une relation/valeur, son orientation, ses unités, sa portée, ses witnesses visibles.
3. Enregistrer la règle **au niveau central** K4/K5 avec les pins exacts ; refuser les configurations partiellement inconnues.
4. Utiliser le `NavigationPlan`/renderer existant sur des DTO déjà filtrés, puis vérifier accessibilité, légende et témoins.
5. Garder les rendus privés jusqu'aux receipts C1–C4 pertinents. La présence sur GitHub ou un SVG ne donne aucun droit de publication.

## 7. Attentes de test et limites

Les tests K6 couvrent : SHA/traversal/symlink, invalides de manifeste, refus sans création de faux schéma, déterminisme et reprise, ordre/limites, différence ordinale/scalaires, absence d'inférence lexicale, XML échappé et sortie privée. Les suites préexistantes K0–K5, les vérifications Svelte/Sécurité et Astro doivent rester vertes sur Windows (Node>=24.15).

**Ce que K6-a ne fait pas :** charger automatiquement une Reader Policy pour une source non épinglée, inférer qu'une relation `child_of` est taxonomique, qualifier 42 profils inconnus, déployer des fichiers, approuver des règles ou promettre que les 13 renderers ont tous été générés sur les 126 Kristals. Une deuxième livraison pourra traiter les adaptateurs v9/v11, ainsi que les preview sémantiques de chaque profil autorisé, en se basant sur les files K6.
