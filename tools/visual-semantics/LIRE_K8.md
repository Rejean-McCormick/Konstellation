# Konstellation K8 — Atelier privé de revue des témoins

K8 **ne donne jamais d'autorisation sémantique ou de publication à partir d'un ZIP**. Les rapports de source non filtrée sont réservés à la revue humaine. L'interprétation géométrique réelle continue d'être commandée par `config/visual-hierarchy-reviews.json` (K5), les règles K4 et `engine.scope(context)`.

## Résultats du snapshot épinglé

- 84 dossiers natifs v6 : 40 333 assertions; les échantillons de témoins reproduisent les triples exacts sujet–relation–objet et les références de provenance disponibles.
- 84 comparaisons SVG **privées** : AVANT = texte d'assertion; APRÈS = graphe de la même assertion **dans son sens littéral sujet → objet**, sans inverser les flèches en parenté et sans géométrie ontologique.
- 42 dossiers hétérogènes : statut « adaptateur et politique de lecture requis ».
- 0 règle approuvée; 0 diagramme sémantique réel qualifié. Un SVG de cette archive n'est pas une projection du lecteur et ne peut être publié.

## Rejouer le même lot sur Windows

Trois ZIPs **exacts** doivent se trouver dans `Downloads`, avec les noms affichés ci-dessous. Les SHA-256 attendus figurent dans `examples/visual-semantics/k8-input-pins.snapshot-20261119.json`. Une autre révision doit faire l'objet d'un nouveau manifeste, pas d'une désactivation des gardes.

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $repo = 'C:\mycode\Konstellation\Konstellation'
  $d = Join-Path $env:USERPROFILE 'Downloads'
  $out = Join-Path $env:LOCALAPPDATA 'Konstellation\k8-private-reviews'
  py -3 "$repo\tools\visual-semantics\k8-snapshot-batch.py" `
    --zip (Join-Path $d 'kristal-public_Code_snapshot.zip') `
    --k6-results (Join-Path $d 'KONSTELLATION_K6_RESULTATS_PRIVES_84_KRISTALS_20261119.zip') `
    --k7-results (Join-Path $d 'KONSTELLATION_K7_RESULTATS_PRIVES_126_KRISTALS_20261119.zip') `
    --out $out
  if ($LASTEXITCODE -ne 0) { throw 'K8 refuse le snapshot ou les résultats' }
  Write-Host "Résultats privés sous $out\runs" -ForegroundColor Green
}
```

Réexécuter avec les mêmes bytes ne modifie pas les résultats. Modifier un résultat existant provoque `OUTPUT_COLLISION_OR_TAMPERING`. Le traitement ne va pas sur Internet, ne lit pas les secrets de la session et n'écrit dans aucun dépôt Kristal.

## Pour transformer un candidat en règle de visualisation

1. Examiner le dossier, les témoins et les limites — et ne pas inférer la signification d'une relation à partir de son nom.
2. Ouvrir le Kristal **dans le lecteur authentique avec la Reader Policy appropriée**. Établir les véritables `datasetRef` et `readerPolicyRef` de ce lecteur; conserver des exemples **visibles** de références d'assertion.
3. Obtenir la décision de l'autorité éditoriale compétente sur la direction, le scope, les exceptions et la valeur sémantique. Documenter cette décision dans le **registre de revue K5** (non dans le ZIP K8).
4. Le compilateur K5 n'activera la hiérarchie que si toutes les conditions et les témoins visibles concordent; la vue `TreeView.svelte` affichera alors le comparateur **Avant / Après K8** avec témoins. En cas d'écart, la vue reste neutre.
5. Vérifier l'interface dans le navigateur, avec politiques positives et négatives, avant toute autre décision de diffusion.

Zoologie : les assertions `zoology.lineage_child_of` ont leur direction brute sujet → objet dans le dossier, mais leur conversion en **parent au-dessus de l'enfant** n'est **pas** auto-autorisée.

Météorologie : les valorisations `ordinal` ne se transforment pas en tailles ou distances scalaires. Le diagramme K8 représente uniquement la syntaxe d'assertion.
