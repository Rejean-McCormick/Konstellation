# K6 batch

- `k6-core.mjs` : preuve d'empreinte, compilation des inventaires, passe 2, rapports et diagnostics privés.
- `k6-batch.mjs` : CLI sur une collection extraite. Fonctionne sans `npm install`, ne requiert que Node>=24.15 selon le dépôt.
- `k6-snapshot-batch.py` : pont Python 3.10+ pour un ZIP exact, SHA-256 du ZIP avant toute extraction.
- `examples/visual-semantics/k6-pins.snapshot-20261119.json` : inventaire de pins émis pour un **seul** snapshot, pas un format de canonisation.

**Ne pas committer ni publier les dossiers de sortie** : les rapports K5/K6 issus des sources brutes ne sont pas filtrés par Reader Policy.

Voir `docs/41-batch-visuel-k6.md`.
