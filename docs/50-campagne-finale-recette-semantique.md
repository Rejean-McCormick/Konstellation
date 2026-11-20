# Konstellation — Campagne finale de qualification et de recette

## Portée

Cette campagne **complète la préparation de K0–K12**, mais ne remplace ni une revue humaine, ni une projection réelle sous Reader Policy, ni des essais navigateur. Aucun « diagramme qualifié » n'est affirmé sans ces trois preuves. Les diagnostics privés n'entrent pas dans Publisher, Konstellation-Light ou SPEK.

## Passe 1 — Contre-audit direct et reproductible

L'outil `tools/visual-semantics/recette-finale.py` relit :

1. `kristal-public_Code_snapshot.zip`, dont l'empreinte correspond au fichier de pins K6 ;
2. les 84 fichiers natifs épinglés, en vérifiant l'empreinte de leurs octets, les 40 333 assertions, le comptage des 4 166 relations et les 7 984 témoins K9;
3. les index canoniques des 42 profils non natifs, et tous les artefacts présents répertoriés dans les résultats K7 (387 empreintes);
4. la file K9–K12 strictement non approuvée.

Les données brutes ne sont PAS filtrées par Reader Policy. Les fichiers de sortie doivent rester dans un dossier privé hors dépôt. L'outil n'exécute aucun appel réseau, ne touche aucun registre d'approbation et ne publie rien.

### Exemple PowerShell (sources déjà disponibles localement)

```powershell
py -3 tools/visual-semantics/recette-finale.py `
  --source "C:\chemin\kristal-public_Code_snapshot.zip" `
  --k7 "C:\chemin\KONSTELLATION_K7_RESULTATS_PRIVES_126_KRISTALS_20261119.zip" `
  --k9 "C:\chemin\KONSTELLATION_K9_K12_REVUES_PRIVEES_126_KRISTALS_20261120.zip" `
  --pins examples/visual-semantics/k6-pins.snapshot-20261119.json `
  --out "$env:LOCALAPPDATA\Konstellation\recette-finale-privee"
```

Optionnel : `--expected-k7 sha256:<64 hex>` et `--expected-k9 sha256:<64 hex>` épinglent également les ZIP de résultats.

L'exécution est **immutable et reprise-sans-écriture** : les résultats identiques sont réutilisés et toute collision avec des données modifiées est refusée.

## Passe 2 — Qualifications et recette réelles

1. **Pré-sélection** : consulter `REVIEW_SHORTLIST.json` et `PILOTS.json` dans le ZIP privé ; aucune sélection ne vaut approbation.
2. **Direction et sémantique** : en particulier `zoology.lineage_child_of`, dont la structure brute est un arbre cohérent dans ce snapshot ; confirmer domaine, sens, exceptions et identités réelles du lecteur.
3. **Lecteur autorisé** : obtenir un `datasetRef` et un `readerPolicyRef` exacts, plus les mêmes assertions visibles dans le reader scoped ; une simple déclaration dans un fichier local ne suffit pas.
4. **Décision du mainteneur** : documenter la règle revue dans un registre code-owned selon les contraintes existantes de K5 ; le dossier de cette campagne ne crée jamais la règle.
5. **Recette visuelle** : vérifier les dix vues adaptatives, les autres renderers compatibles, l'accessibilité, les labels, les sources, les signaux et les cas négatifs. Conserver captures privées et anomalies.
6. **Exhaustivité** : compléter les sept artefacts manquants et les sept JSON volumineux si la couverture de tous les profils est requise.
7. **Autorisation de publier** : décision indépendante ; jamais implicite.

## Deux pilotes

- **Zoologie** : 65 arcs enfants→parents, 66 nœuds, une racine, sans cycle, sans parent multiple, constatés dans les assertions v6 non filtrées. `PILOTE_ZOOLOGIE_NON_QUALIFIE.svg` est un schéma privé de validation structurelle, pas une figure autorisée.
- **Météorologie** : 234 assertions, 468 valuations ordinales, 0 valuation scalaire connue. Les tailles et distances numériques sont donc explicitement **non qualifiées** à partir de cette source.

## Critères de clôture

Le terme « final » ne doit être utilisé **sans réserve** que si les gates `approbation humaine`, `Reader Policy réelle`, `essais navigateur` et `couverture ou exception documentée` sont tous fermés avec preuves. À la livraison de ce pack, ils restent ouverts ; aucun compteur de qualification n'est artificiellement incrémenté.
