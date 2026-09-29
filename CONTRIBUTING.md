# Contribuer

Node.js 24.15+, npm. Installer avec `npm ci`, lancer le développement avec `npm run dev`, et exécuter `npm run check` avant une modification. La suite Playwright (`npm run test:browser`) requiert un navigateur installé.

Toute modification de signification doit mettre à jour contrats, vecteurs, profil d’exécution dans `server/engine.mjs` et note de migration. Garder les assertions, statuts, sources, accès et politiques cohérents dans toutes les surfaces (résultats, facettes, inspection, preuves). Ne pas modifier `legacy/v0.1/`.

Les données de démonstration ne sont pas des faits historiques validés. Une adaptation à un corpus réel nécessite un mapping explicite et des tests d’intégration. Aucun code ne doit choisir un comportement spécial sur le nom d’une personne ou l’identifiant d’une Lens.
