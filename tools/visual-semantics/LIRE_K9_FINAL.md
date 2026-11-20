# K9–K12 — Commandes et frontières

- Installation : `py -3 <installateur> --target "C:\mycode\Konstellation\Konstellation" --check`, puis `--apply`.
- Vérification sans modification : `--verify` après installation.
- Retour arrière : `--rollback <chemin-du-reçu>` (uniquement si empreintes intactes).
- Batch privé : `py -3 tools/visual-semantics/k9-to-final-batch.py --k8-results <ZIP-K8> --sha256 <empreinte-épinglee> --out <DOSSIER-HORS-DÉPÔT>`.
- Contrôles du projet : `node --test tests/visual-proof-final.test.mjs`, `py -3 -m unittest discover -s tests -p test_visual_k9_final.py -v`, puis `npm test`, `npm run build` et `npm run test:ui` pour extension locale.
- Test navigateur Playwright : séparé, nécessite le navigateur et un environnement de test opérationnels.

**N'ajoutez jamais les dossiers de revue privés à Git ou à Publisher.** Les règles de qualification restent vides par défaut et ne peuvent être activées par ces sorties.
