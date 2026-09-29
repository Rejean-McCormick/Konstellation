
## Astrolabe

- Ajout d’une couche d’orientation sémantique avant le catalogue.
- Recherche tolérante aux accents, traits d’union et petites fautes.
- Caps sémantiques pour des termes non indexés directement (eudiste, Saint-Esprit, parousie, iconoclaste).
- Bouton « Cap au hasard » et navigation depuis un cap vers un QuerySpec Konstellation normal.
- Distinction visible entre correspondance du corpus et piste voisine.

# v0.5.0 — 2026-09-28

Nouvelle vue **Constellation** : navigation sémantique centrée sur une entité, groupes déclaratifs optionnels dans les Lens, projection de qualificatifs et sources sans créer de nouvelles assertions, classement de saillance déterministe et diversifié, budget utilisateur de 3 à 25 satellites, fil d’Ariane restaurable, et rendu lisible des qualificatifs dans l’inspecteur. Le Query Service expose `/api/constellation`; le frontend reste Astro + Svelte + SVG natif, sans bibliothèque de graphe supplémentaire.

# v0.4.1 — 2026-09-28

Intégration SA alignée sur `konstellation-explorer-2`. Konstellation reste strictement semantics-only : aucun hint de planification/lexicalisation n’est injecté dans les `CommunicationRequest`; toute réalisation linguistique reste propriété de SemantiK Architect.

# v0.4.0 — 2026-09-27

Lecture Kristal Parquet/JSON et HTTP complète, contrôles d’intégrité/signatures, ReaderPolicy v5, capacités par relation, adaptateur SA avec couverture vérifiée, panneau de communication et exemple Parquet reproductible. 29 tests serveur et 6 tests DOM.

# Changelog

## 0.2.0 — 2026-09-26

Refonte de conception : arbre de sélection et pivots bornés, politique de lecture épinglée, séparation état visuel/requête, sémantique explicite des absences et exclusions, qualification du lecteur Kristal avant choix RDF, témoins de correspondance, schémas stricts et vecteurs synthétiques. Documentation et plan réécrits. Origine v0.1 préservée dans legacy.

Aucune application ou intégration de production n’est livrée dans cette révision.

## 0.3.0 — 2026-09-26

Application Astro/Svelte et service Node implémentés. Moteur QuerySpec, politiques normalisées, pivots corrélés, compteurs, curseurs signés, cache, témoins, trois vues, inspecteur, historique, sauvegardes/import/export et partage. Pack de démonstration autonome et importeur SES strict. Tests moteur/API/import et composants Svelte, suite Playwright fournie. Runtime Pack natif et SA/GF non qualifiés; limites détaillées dans docs/IMPLEMENTATION.md.
