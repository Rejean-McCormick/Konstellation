# 24 — Koreograph v0.3.0 : spécialisations et production locale

**État :** tranche de fonctionnalités implémentée et qualifiée sur fixtures ; pas une release 1.0 ni une qualification de Reader Policy. Base : snapshot du 26 novembre, code 0.1, correctif 0.1.1 et patch 0.2.0. Les résultats locaux communiqués par le propriétaire (Node 24.22.3, build Astro réussi, 22 tests Koreograph réussis) concernent la révision 0.2.0. Le patch 0.3.0 ne remplace pas package.json, le pin Volta, le serveur ni les composants Svelte d'intégration.

## Deux voies complémentaires

Le Score/Bundle 0.1 existant représente la navigation en constellation. Ses liens `navigation` ne contiennent pas de causalité ou de direction sémantique. Il ne faut jamais enrichir un Bundle par inférence de ces relations. L'oscillation axiale, le retour à l'origine, la translation rectiligne et la caméra fixe pendant le mouvement restent inchangés.

Le nouveau compilateur `src/lib/koreograph/specialized.mjs` produit un storyboard de chapitres à partir d'une projection spécialisée `navigation-projection/1.0` déjà exportée. La CLI `scripts/koreograph-specialized.mjs` appelle le validateur canonique du serveur, sans démarrer celui-ci. Elle accepte uniquement un fichier explicitement choisi et un dossier de sortie neuf. Le storyboard a le format `koreograph.projection-storyboard/0.1` ; il reste distinct du Bundle. Pas de conversion implicite, pas de nouvelle API, pas de nouvelle dépendance npm, pas d'IA. Le rendu est un SVG SMIL autonome à cartes fixes, avec apparition progressive des cartes ou liens, coupe nette entre chapitres et horloge explicite. Il réutilise les thèmes et l'échappement XML du moteur. Les cartes gardent leur position durant un chapitre ; aucune interpolation entre des dispositions différentes. Ce premier renderer spécialisé n'est pas encore un morphing continu des vues adaptatives.

### Sélection par projection, pas par lexique

| Famille de DTO | Mise en scène | Limites / garde-fous |
|---|---|---|
| tree | Branche parent-enfant si hiérarchie examinée | Vérifier chaque référence visible et l'orientation ; refuser cycle, parents multiples ou racines incohérentes ; sinon relations non orientées et parenté non déduite |
| dag | Dépendances et convergence des arcs vers une même cible | Ne pas assimiler le graphe à une preuve logique ni à un ordre d'exécution |
| causal-feedback | Révélation des relations candidates et, si qualifiées, des signes | Seuls les arcs concordants avec visualSemantics reçoivent flèche et signe ; pas de simulation ni de fermeture artificielle de boucle |
| timeline-lineage | Cartes ordonnées par début connu, intervalles et libellés fournis | Pas d'échelle temporelle proportionnelle, pas de reconstitution de lignage ; liens de lignage omis et vue signalée partielle |
| matrix | Comparaison des valeurs scalaires visibles, par dimension | Pas de score ni agrégation ; absence dans la projection distincte d'une valeur structurée non représentée ; pas d'inférence sur les unités |
| traceability | Relations visibles | Pas de remontée vers de nouvelles sources hors projection |
| flow | Relations de parcours décrites | Condition signalée, non évaluée ; aucune exécution ; consulter la projection pour ses conditions |
| multiscale | Appartenances par couche | Aucune hiérarchie entre couches déduite ; crossLinks non rendus |
| state-flow | Cartes d'état et valeurs de statut connues | Pas de simulation d'action, pas de valeur exposée si état non connu ; transitions non rendues |
| spatial | Cartes de coordonnées | Pas de fond cartographique, de géocodage ni de trajet inféré ; places non rendues |

Les cinq premières familles constituent les nouvelles chorégraphies principales. Les autres familles disposent d'une représentation de repli volontairement limitée. Un graphe est découpé en branches/convergences de trois arcs au plus ou relations individuelles. Les cartes de comparaison sont groupées par trois. La limite de 12 chapitres et la fenêtre source sont signalées dans le storyboard (`partial`, `omitted`, `totalPages`) ; `omitted` compte des éléments ou chapitres non représentés selon la famille, ce n'est pas un nombre canonique de faits. Les valeurs et libellés sélectionnés figurent dans la transcription HTML ; les textes peuvent être abrégés visuellement. Le rythme est déterminé par une estimation bornée du nombre de mots, entre 2,8 et 9 secondes par chapitre. Le mode réduit utilise des chapitres sans apparitions progressives. Le lecteur HTML démarre en pause, propose lecture/pause, navigation et timeline, avec transcription textuelle. Il reste à qualifier l'accessibilité complète. Aucun nouveau droit de lecture n'est attribué ; une qualification déclarée dans un JSON importé est une information de ce fichier, non une preuve authentifiée par le CLI.

### Produire une animation spécialisée

Depuis la racine du repo, avec les dépendances existantes installées :

```powershell
$Out = ".\artifacts\koreograph-specialized-$(Get-Date -Format yyyyMMdd_HHmmss)"
New-Item -ItemType Directory -Force .\artifacts | Out-Null
node scripts/koreograph-specialized.mjs --projection .\docs\koreograph\examples\specialized\hierarchy.json --private-projection --out $Out --theme signature --ratio 16:9
if ($LASTEXITCODE -ne 0) { throw 'Production echouee' }
Invoke-Item (Join-Path $Out 'animation.html')
```

Fixtures nouvelles : [hierarchy](examples/specialized/hierarchy.json), [convergence](examples/specialized/convergence.json), [causal](examples/specialized/causal.json), [timeline](examples/specialized/timeline.json), [comparison](examples/specialized/comparison.json). Toutes sont fictives, y compris les qualifications. Thèmes : signature, paper, graphite, ink, spectrum, atlas, blueprint, editorial (catalogue existant) ; `--ratio 16:9|1:1|9:16`, `--motion standard|reduced`. Les styles de cartes sont fixes ; la palette suit le thème et l'encodage par kind colore le marqueur. La personnalisation fine des formes de cartes et du style des liens reste à implémenter. Sorties : `animation.svg`, `animation.html`, `storyboard.json`, `manifest.json`. Pas de nouveau contrat serveur ; le storyboard n'est pas un format importable dans le studio générique.

Sur un vrai Kristal, ouvrir la vue adaptative dans Konstellation, sélectionner une recette et une politique de lecture autorisées, exporter son JSON avec le bouton de sauvegarde existant, puis sélectionner ce fichier avec `--projection` et `--private-projection`. Ne pas exporter une projection non autorisée. Pas de source réseau, de balayage du catalogue ni de réauthentification hors ligne. Le dossier de sortie doit être privé et sous contrôle local ; ne pas le synchroniser ou le publier sans autorisation distincte. L'intégration directe de ces spécialisations dans la vue Svelte est encore à faire : cette livraison utilise l'export existant et une CLI explicite.

## Correction géométrique bornée du moteur générique

`compileOptimizedPresentation` appelle d'abord `compilePresentation`. Sur `Q-BOUNDS`/`Q-LABEL`, elle examine jusqu'à deux tailles de police de labels (85 %, puis 70 % de l'original, plancher 16 px). Elle ne conserve une variante que si le nombre de catégories d'alertes géométriques diminue. Pas de réduction de densité cachée, pas de déplacement d'objets, pas de mutation du Bundle ou du thème enregistré, pas de changement de courbe de mouvement ; le cadrage unique peut être recalculé selon la taille effective. L'empreinte du thème dans le Plan correspond au thème effectif. Le studio utilise cette fonction et signale l'adaptation. Le batch simple l'active avec `--optimize` ; le batch multiple l'active systématiquement et enregistre les adaptations dans chaque entrée du manifeste. Le plan reste `review` et conserve `Q-NOT-RUNTIME-TESTED`. Les alertes persistantes nécessitent une revue. Cette méthode ne garantit pas la correction des collisions, la taille réelle des glyphes ou la lisibilité de toutes les productions.

## Production multi-Bundles

Créer un JSON local contenant uniquement les chemins des Bundles préalablement exportés et autorisés ; les chemins relatifs sont résolus relativement au fichier liste. Exemple :

```json
["bundle-a.json", "bundle-b.json"]
```

```powershell
$Liste = Read-Host 'Chemin de la liste JSON locale'
$Out = ".\artifacts\koreograph-campagne-$(Get-Date -Format yyyyMMdd_HHmmss)"
node scripts/koreograph-multi-batch.mjs --list $Liste --private-bundle --out $Out --themes signature,paper --formats svg,html,vtt
```

Budget : 1–12 Bundles de 4 Mio max, 20 sorties par Bundle, 120 par campagne. Exécution séquentielle via la CLI simple, sans shell. Les entrées sont copiées dans un temporaire du dossier de sortie privé pendant leur traitement, puis retirées normalement ; une interruption forcée peut laisser des fichiers temporaires à effacer manuellement. Les sous-manifestes sont liés par SHA-256 au manifeste parent ; les chemins privés des sources ne sont pas écrits dans ce dernier. Une entrée invalide fait échouer la campagne mais ne masque pas les résultats des autres entrées. Aucune qualification de navigateur ou autorisation de publication n'est attribuée par cette production. Les fichiers générés restent des copies locales potentiellement sensibles.

## Qualification par manifeste

```powershell
python scripts/koreograph-qualify-campaign.py (Join-Path $Out 'manifest.json') --report (Join-Path $Out 'runtime-report.json')
```

La campagne ne traite que les SVG animés explicitement inscrits dans un manifeste de production terminé (simple, multiple ou spécialisé). Elle vérifie la taille et SHA-256 du fichier et, dans le cas multiple, les SHA-256 des manifestes enfants. Elle refuse les sorties altérées, non réussies ou hors budget. Aucun HTML arbitraire exécuté. Pas de modification des manifestes ni d'élévation d'autorité. Chromium par défaut ; `--browsers chromium,firefox,webkit` est disponible si les moteurs Playwright Python correspondants sont installés. Un navigateur absent, un format incompatible ou une erreur d'exécution produit un échec et non un faux succès. Le contrôleur par fichier accepte aussi `--browser`. Les navigateurs supplémentaires n'ont pas été qualifiés dans cette livraison.

```powershell
python scripts/koreograph-runtime-check.py .\artifacts\koreograph-demo\animation.svg --browser chromium
```

Le statut du rapport porte uniquement sur les contrôles mesurés (géométrie des textes SVG à des instants échantillonnés, erreurs de page, tentatives réseau), pas sur WCAG, les styles de la page Astro ou les politiques de lecture. Un succès ne promeut pas un Plan en `pass` et ne constitue pas une autorisation de publication.

## Qualification locale avant clôture

1. `npm run test:koreograph`, `npm run check:frontend-security`, `npm run check:svelte-structure`, `npm run docs:check`, `npm run build`, `npm test`, `npm run test:ui` avec Node épinglé.
2. Générer les cinq fixtures spécialisées, tester le lecteur, puis contrôler les SVG. Ouvrir le studio générique et vérifier la chorégraphie validée.
3. Sur des Kristals réels choisis par le propriétaire, vérifier au moins une projection de chaque famille disponible, y compris une hiérarchie non qualifiée et une relation candidate non causale ; comparer chaque arc, intervalle et valeur à la projection visible. Tester une politique de lecture différente sans inclure de données interdites dans les fichiers de sortie. Une preuve d'autorisation n'est pas déduite du contenu du JSON exporté.
4. Exécuter une campagne multi-Bundles sur des copies autorisées et contrôler les rapports ; vérifier la reproductibilité et les manifestes. Vérifier les navigateurs disponibles, le clavier, les lecteurs d'écran, les thèmes, les contrastes et les formats vidéo selon les besoins.
5. Ne déclarer la release 1.0 qu'après la revue des données réelles, des résultats visuels, de l'accessibilité et des éventuels échecs. Les limitations du renderer spécialisé et la qualification du lecteur Svelte demeurent explicites.

## Résultats de cette livraison

- 29/29 tests Node ciblés, dont les 22 tests précédents ; 5 nouvelles fixtures validées avec JSON Schema 2020-12 ; les 10 familles du corpus de contrats existant compilent dans les tests ciblés.
- 15 SVG spécialisés (5 fixtures × 3 ratios, thème Signature) : Chromium, contrôles échantillonnés sans alerte ; rapport [matrice spécialisée](qualification/runtime-matrix-specialized-v0.3.json). Les cinq lecteurs HTML et le studio générique ont été contrôlés dans Chromium via contenu généré localement, sans réseau. Les contrôles de navigation de fichier locale étaient bloqués par la politique du navigateur du banc de test.
- Campagne de contrôle par manifeste : un SVG générique Signature, réussi. Tests statiques sécurité et structure Svelte sans problème. Les dépendances npm applicatives ne sont pas installées dans l'environnement de construction du patch : la CLI spécialisée, qui utilise Ajv via le serveur, reste à exécuter sur le poste ; son compilateur et son renderer ont été exécutés directement après validation Python des fixtures. Aucun build Astro ou test global prétendument réexécuté dans cet environnement.
- Aucun accès aux vrais Kristals, aucun test de publication, aucun commit distant. Les résultats précédents sur le poste ne valent pas pour les nouveaux fichiers tant que les tests locaux n'ont pas été relancés.
