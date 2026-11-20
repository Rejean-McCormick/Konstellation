# K7 — Inventaire des profils hétérogènes et raffinement diagnostique (privé)

## Portée explicite

Le traitement K6 du snapshot identifié par son SHA-256 couvrait 84 états natifs v6 et signalait 42 dossiers requérant un adaptateur. Le traitement K7 prend **exactement ces 42 dossiers** et lit leurs index `canon/state.index.json` (`kristal.authoring-state-index/2.0.0`). Pour chaque index, les `canonical_artifacts` déclarés sont comparés au contenu **du même ZIP octet par octet épinglé**, sans dérivation d'une ontologie commune fictive.

**Ce que K7 sait faire :** lire les métadonnées des index canoniques, attester la présence et l'empreinte SHA-256 des octets présents, classer sommairement les formes JSON (sans recopier les contenus), établir une file de revue structurée, produire des graphiques de comptages techniques privés. Sur fourniture des résultats privés K6 intègres, K7 reclasse les candidats des 84 états natifs en recommandations concrètes (vérifier la direction d'un graphe, ne pas utiliser un ordinal comme mesure de distance, contrôler les unités et l'incertitude temporelle).

**Ce que K7 NE fait PAS :** approuver une règle, interpréter `logical_contract.id` comme une règle d'affichage, prétendre valider les engagements logiques JSON-JCS, déduire une causalité, un arbre, une chronologie, une permission, une identité ou une autorisation de publication. Les entrées `sourceSha256` sont des empreintes **physiques** et ne remplacent pas les `logical_commitment` fournis par la chaîne d'autorité. Aucun changement aux 13 renderers, à Publisher, Light, SPEK ou à la base Kristal.

## Résultats exacts du snapshot initial

- **126** dossiers inventoriés au total = **84 v6** traités par K6 + **42** index non-v6 traités techniquement par K7.
- **394** artefacts canoniques déclarés par ces 42 index ; **387** présents dans le ZIP et empreintés ; **7** référencés mais absents, affectant **4** Kristals (`koa-ecosystem`, `policeops`, `power-dynamics`, `vaticanops`).
- **7** artefacts JSON dépassant la limite d'échantillonnage structurel de 4 Mio sont conservés comme `LARGE_JSON_NOT_PROFILED`, sans conversion arbitraire ; leur présence et empreinte sont attestées.
- **84** nouvelles files de recommandations issues des 84 files K6 précédentes, à condition de vérifier intégralement leurs empreintes `SHA256_CONTENU.txt`.
- **0** diagramme sémantique qualifié ; les **126 SVG** sont exclusivement des *diagnostics techniques de comptage*.

## Sécurité, identité, limites

Le ZIP d'entrée doit correspondre à l'empreinte de la référence fixée dans `k7-index-pins.snapshot-20261119.json`. Les 42 index sont aussi épinglés séparément. K7 refuse les divergences d'index, types de manifestes inconnus, chemins `..`, doublons canoniques, symlinks et sorties réorientées, ou tout résultat K6 dont un fichier diffère de `SHA256_CONTENU.txt`.

Les résultats bruts ne passent pas par la **Reader Policy**. Ils sont confinés à un dossier privé **hors du dépôt**, et leur statut reste `PASS_2_REVIEW_REQUIRED_NOT_APPROVED`. Les graphiques `private-diagrams/*.svg` ne portent aucune géométrie prétendant représenter les connaissances du monde.

Les manques ne sont pas automatiquement comblés à l'aide de copies Internet ou d'anciennes matérialisations. Pour produire des diagrammes sémantiques de vrais Kristals, il faut encore obtenir des projections visibles du lecteur autorisé, valider les règles exactes K4/K5 et passer les contrôles C1–C4 prévus. K7 n'autorise ni publication ni modification des sources.

## Exécution et reprise

L'outil est `tools/visual-semantics/k7-snapshot-batch.py` (Python standard >=3.10), qui accepte `--zip`, `--out` et éventuellement `--k6-results` (dossier **extrait** avec `SHA256_CONTENU.txt`). Le dossier cible reçoit `runs/<runId>` : le même jeu de sources, la même version et le même jeu K6 réutilisent les sorties identiques ; une divergence de sorties existantes est refusée plutôt qu'écrasée.

La reprise utilise des sorties immuables (`xb`) et conserve les rapports séparés : `pass1-profiles/`, `pass2-profiles/`, `pass2-native/`, `private-diagrams/`, `SUMMARY.json` et `REVIEW_WORKBENCH.html`. Les sous-dossiers sont pour cet usage privé uniquement.

Le prochain travail technique consiste à implémenter des **adaptateurs de contenu propres aux schémas confirmés**, et à résoudre les 7 fichiers manquants (ou leur statut d'absence irréductible) ; cela exige de nouvelles preuves, pas un simple libellé de relation.
