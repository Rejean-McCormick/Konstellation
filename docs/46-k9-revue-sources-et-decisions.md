# K9 — Revue des sources et des décisions (lot final Konstellation)

L'étape K9 transforme les 126 dossiers de diagnostics privés K8 en file de **4 208 entrées de revue**. Le registre K5 de hiérarchie, celui des attributs K4 et celui des relations K0–K3 **restent vides** dans le code distribué. Les fichiers de la file K9 ne sont **jamais** chargés comme registres d'approbation.

## Identité et provenance

Entrée : archive de résultats privés K8 `KONSTELLATION_K8_RESULTATS_PRIVES_126_KRISTALS_20261119.zip` épinglée par SHA-256 dans `examples/visual-semantics/k9-final-input-pins.snapshot-20261120.json`. Chaque dossier conservé contient les identifiants de relation, les témoins d'assertion échantillonnés, la famille candidate et les contrôles requis. Il n'existe pas de conversion de ces échantillons non filtrés en faits autorisés.

## Deux passes

1. Inventaire : 84 états v6 et 42 adaptateurs à construire; extraction reproductible; aucun signe +/−, parenté, métrique, couleur ni opposition inféré d'un simple nom.
2. Revue : décisions requises par relation et par source; priorité aux arcs référentiels, aux erreurs de mesure ordinale et aux profils non natifs. Une décision doit être reportée **manuellement**, avec le `datasetRef` et le `readerPolicyRef` calculés par le véritable lecteur et des témoins visibles dans cette politique. L'inventaire K9 n'est jamais une autorisation.

## Exécution privée

`py -3 tools/visual-semantics/k9-to-final-batch.py --k8-results <archive-K8> --sha256 sha256:<empreinte-épinglée> --out <répertoire-privé-hors-dépôt>`

L'outil refuse une empreinte différente, les ZIP douteux, les doublons, les noms de dossier non contrôlés et une sortie déjà divergente. Une seconde exécution identique ne réécrit rien. Les résultats peuvent être sensibles : ne pas les placer dans Git, Publisher, Light, SPEK ou une archive publique.
