# Changelog

## 1.0.0-rc.2 — 2026-10-02

- Durcissement final du contrat `navigation-projection` 1.0 : formes internes strictes par famille, liaison `projectionKind`/renderer/recipe, `nextCursor`/`totalCandidates` explicites et fixtures positives/négatives hors-ligne.
- Sanitization des DTOs publics : `actionability`, `lineage`, `valuations` et `coordinates` n’exposent plus les payloads upstream bruts ou champs internes inutiles.
- Correction des producteurs Traceability et StateFlow pour respecter les DTOs stricts.
- Réparation du validateur Python hors-ligne avec registry URN JSON Schema ; 62 contrôles passent sans accès réseau.
- Améliorations accessibilité : Tree avec navigation clavier type ARIA tree, noms accessibles sur SVG interactifs, structure Timeline/Matrix/Traceability corrigée.
- Compatibilité CSP publique renforcée : suppression des `style=`/`style:` Svelte, transformations SVG natives, classes d’indentation déterministes et `build.inlineStylesheets=never`.
- Nouveau gate statique `check:svelte-structure`, intégré au preflight, couvrant structure Svelte, interactions SVG et styles inline interdits.
- Nouveau gate `check:frontend-security` contre raw HTML/dynamic code, styles/scripts inline et imports CSS distants ; headers HTTP de défense en profondeur ajoutés.
- Découplage de `AppError`/`fail()` vers `server/errors.mjs` afin que auth/config soient testables sans charger Ajv ; 5 tests sécurité dependency-free passent.
- Benchmark complet requalifié jusqu’à 1M assertions, tous les scénarios sous baseline.
- Documentation d’implémentation/validation mise à jour avec les résultats réellement exécutés.

## 1.0.0-rc.1 — 2026-10-02

- Implémentation complète de la navigation adaptative 1.0 : profils global/type/result-set/focus, NavigationPlan 1.0 et registre fermé de renderers.
- Ajout des renderers/projections `timeline-lineage`, `tree`, `dag-proof`, `flow-path`, `causal-feedback`, `matrix-profile`, `state-flow`, `traceability`, `multiscale-layer` et `spatial`.
- Alignement Kristal v6 : coordinates, valuations, record_role, actionability, conflits, succession, lineage, evidence/provenance restent des signaux dérivés sans changer l’autorité canonique.
- Reader Policy appliquée à toutes les surfaces secondaires, y compris introspection, recommandations et projections ; indexes d’entités/assertions policy-scoped.
- Auth multi-principal rôles/scopes, profils de déploiement, rate limiting, CSP publique, health/readiness/version, logs JSON et métriques.
- ExplorationState 1.0 avec migration 0.2 ; `navigationHints` 1.0 avec compatibilité legacy.
- Golden corpus 1.0 étendu (24 tests dependency-free), tests sécurité/policy/Lens et benchmark 10k/100k/1M + dense/timeline/DAG profond/multi-échelle/forte cardinalité.
- Contrats de projection 1.0 stricts par famille avec 10 fixtures officielles ; fallback frontend piloté par `accessibilityFallback` du Renderer Registry.
- Renderers spécialisés enrichis avec visualisations natives déterministes (timeline, DAG, flow, feedback, multi-échelle, spatial) et fallback textuel accessible, sans dépendance graphique externe.
- Bootstrap, validation QuerySpec, Lens/facettes et navigation sont désormais policy-scoped jusque dans le schéma exposé, supprimant les oracles type/ID/relation.
- Cache des scopes Reader Policy, préchauffage readiness, détection de cycles itérative et suppression fail-closed des labels/préférences de navigation sous policy.
- Manifest source SHA-256, SBOM CycloneDX, checks de synchronisation et checksums exposables par `/api/version`.
- Runbooks threat model et backup/restore ajoutés aux opérations de production.
- Release gates automatisés (`release:preflight`, `release:check`) et vérification des liens docs.
- Le package reste RC tant que Node 24 + lockfile + build/Vitest/Playwright n’ont pas été qualifiés dans l’environnement de release.

## Documentation 1.0 — 2026-10-02

- Ajout d'une documentation complète native au repo dans `docs/`.
- Réécriture des docs cœur comme spécification normative Konstellation 1.0.
- Ajout Renderer Registry, performance/LOD, sécurité, observabilité, golden corpus, déploiement, API, extension guide et gates de release.
- Ajout ADR-0006 à ADR-0010 et guides utilisateur/intégrateur/développeur/opérateur.
- Clarification permanente de la distinction baseline v0.7 / cible production 1.0.

# v0.7.0 — 2026-10-01

Alignement natif sur Kristal Standard 6.0 : lecteur direct `kristal_state`, vérification d’identité `kristal.v6:jcs-rfc8785`, projection locale explicitement dérivée et pertes déclarées, introspection des `coordinates`, `valuations`, `record_role`, `actionability`, conflits, succession, lineage, évidence et provenance. La terminologie du planner devient **affordances structurelles** pour ne pas confondre ses scores UI avec les capability manifests de runtime. Ajout des recettes États, Évolution, Divergences, Traçabilité et Décisions & action. `actionability` reste strictement distincte d’une autorité d’exécution.

# v0.6.0 — 2026-10-01

Konstellation devient un navigateur adaptatif de Kristals : profil structurel indépendant du domaine, Navigation Planner, recettes Chronologie/Hiérarchie/Dépendances/Parcours/Boucles/Preuves/Positions/Comparer, endpoints `/api/navigation/plan` et `/api/navigation/project`, projection adaptative bornée, interface pilotée par le plan et Astrolabe générique. Ajout de `navigationHints` déclaratifs validés pour permettre aux Kristals de publier leurs affordances sans code UI. Les anciennes vues Liste/Tableau/Constellation et les états v0.2 restent compatibles.

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
