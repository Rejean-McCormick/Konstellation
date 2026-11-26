# Contrôle de la livraison documentaire — 26 novembre 2026

## Vérifications réellement effectuées

- Inspection du snapshot ZIP fourni, notamment `AGENTS.md`, index et manifeste docs, code Svelte, layout, routes de lecture, contrats existants et documents K0/K10/K11. Aucun accès au dépôt distant ni aux données externes.
- Contrôle initial des liens avec le script existant `node scripts/check-docs.mjs` : 98 fichiers Markdown, 113 liens locaux, 0 problème.
- Contrôle final du dossier docs intégré au snapshot : 115 fichiers Markdown, 173 liens locaux vérifiés, 0 problème.
- Deux drafts JSON Schema contrôlés avec `jsonschema.Draft202012Validator.check_schema` ; trois exemples positifs validés (Score explicite, Score Auto, Bundle synthétique).
- Douze mutations négatives rejetées : token, version inconnue, premier pas invalide, second focus, coordonnées arbitraires, trop d'étapes, mélange des modes, trop de sauts, publication prétendue, lien causal non autorisé, script, opacité invalide.
- Contrôles transversaux sur le Bundle synthétique : IDs uniques, focus présent et unique, références de liens, bornes du viewport, proportion, segments contigus et positifs, continuité de scène, hold/focus compatibles et fin égale à la durée.

Les contrôles JSON et transversaux sont des vérifications de conception ponctuelles, pas une suite runtime livrée. Les JSON Schemas restent dans `docs/koreograph/schemas/`, distincts des contrats de production.

## Non vérifié / limites

Pas d'installation de dépendances, de build Astro, de tests Vitest/Playwright, de mesure de performance, de rendu SVG/HTML/vidéo, de test FFmpeg, de test réel Reader Policy ni de qualification de release Koreograph. L'environnement disponible pour le contrôle documentaire utilise Node 22.16.0, inférieur au minimum applicatif indiqué dans `package.json` (24.15.0). Le contrôle de liens est un script autonome sans dépendance npm ; il ne valide pas l'application. Les exemples ne sont pas des données du Kristal réel et le Bundle n'est pas produit par un compilateur existant.

Les arbitrages, budgets, formats et points d'insertion restent à valider avant développement. Aucun commit/push, publication, modification de source applicative ou autorisation de lecture supplémentaire n'a été réalisé.
