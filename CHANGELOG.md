## Correctifs Graphe biblique / recherche — 2026-09-30

- Le pack Théophile + graphe biblique devient le corpus local par défaut du serveur et du lanceur; aucun repli silencieux vers un ancien corpus externe.
- L’Astrolabe recherche explicitement les personnages bibliques et affiche jusqu’à 12 homonymes directs.
- Les homonymes bibliques reçoivent une désambiguïsation lisible; les 12 Joseph sont distingués (fils de Jacob, époux de Marie, d’Arimathie, Barsabbas/Justus, Barnabé, etc.).
- La barre de recherche de la liste cherche maintenant dans tout le catalogue chargé, et pas seulement dans la page courante.
- Les libellés désambiguïsés sont réutilisés dans les listes, l’inspecteur et les sélections.
- Les tests Playwright ciblent le pack enrichi et couvrent la recherche « Joseph ».

## Théophile semantic enrichment — 2026-09-30

- Embedded an enriched Théophile + Biblical Graph pack.
- Added explicit question → position, question → theme and question → author navigation.
- Added author-to-author dialogue projections derived only from existing position relations.
- Added Théophile lenses for authors, questions, positions and themes.
- Added readable constellation labels for the new semantic relations.
- Launcher now prefers the embedded enriched pack and local lenses.

## Biblical Graph v1 — 2026-09-29

- Added `person`, `tradition`, `event`, `group` and `term` graph types.
- Authorship is now modeled through historical, traditional, disputed, pseudepigraphic and attributed relations.
- Added contextual canon relations and biblical/apocryphal work seed.
- Added BibleData importer for all named biblical figures, aliases and person relationships.
- Added Biblical People and Biblical Works lenses.
- Astrolabe now searches aliases and French biblical forms.
- Launcher merges the update onto the local Theophile pack when available and caches the generated pack.
- Added `Update_Biblical_Corpus.cmd` for explicit corpus refresh.


## 0.5.1 — Playwright QA harness

- Ajoute `Test_Konstellation.cmd` avec modes rapide, Astrolabe, complet, UI et rapport.
- Tests E2E du démarrage, des API, du corpus biblique, de l’Astrolabe, de la navigation, de l’inspecteur, des sauvegardes et du responsive.
- Capture automatique des `Failed to fetch`, erreurs console, requêtes échouées et réponses 5xx.
- Rapports HTML avec screenshots, vidéos et traces conservés en cas d’échec.
- Instance de test isolée sur le port 4323, sans perturber le launcher normal sur 4321.

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
