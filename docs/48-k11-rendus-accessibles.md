# K11 — Intégration transversale aux vues adaptatives

`SemanticAuditView.svelte` est monté **une seule fois** dans `AdaptiveProjectionView.svelte`, qui distribue les projections vers les dix familles spécialisées : chronologie, arbre, DAG, parcours, rétroaction causale, matrice, flux d'état, traçabilité, multiscale et spatial. Aucun renderer ne fabrique son propre statut de qualification.

L'affichage présente un intitulé textuel accessible, un statut lisible, le caractère partiel ou refusé, la portée de la règle et les références exactes des assertions déjà visibles. Une version accessible en texte reste disponible indépendamment des couleurs et coordonnées. Les trois autres modes génériques d'exploration ne reçoivent pas artificiellement de nouveau renderer sémantique; ils conservent leur comportement neutre.

**La vérification manuelle navigateur** doit contrôler la navigation clavier, les lecteurs d'écran, le zoom, les contextes restreints, les langues, la troncature, le contraste et le fallback tabulaire. `npm run build` ne remplace pas cette validation visuelle et accessible.
