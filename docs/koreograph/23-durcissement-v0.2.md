# 23 — Koreograph 0.2.0 : durcissement et préqualification

**État :** tranche fonctionnelle durcie, non qualifiée pour la release 1.0. Ce chapitre complète et actualise le guide [0.1.0](22-implementation-v0.1.md). La version Konstellation et ses politiques de lecture ne changent pas. Aucun accès distant, commit ni publication.

## Changements

- Le mouvement validé en 0.1.1 est conservé : oscillation axiale bornée à 320 ms, retour à l'origine, translation rectiligne monotone, aucun rebond et une pose caméra stable. En mode automatique, la pose unique peut désormais réduire le zoom jusqu'à 0,7 si le format l'exige. Le mode fixe et le mode reduced conservent la pose identité. Le contrôle géométrique tient compte du zoom effectif.
- Le Score est copié après validation avant toute résolution asynchrone. Les labels vides et les kinds de focus invalides sont refusés. Le fondu neutre n'affiche que les connexions de la phase correspondante. Les pistes SMIL ordonnent les extrémités d'un lien non orienté de façon stable pour éviter une permutation des extrémités. Une piste horloge invisible préserve la durée même pour un focus isolé.
- Le studio importe et exporte les thèmes JSON locaux. Limite 32 KiB ; validation stricte des champs, couleurs hexadécimales, géométries, police générique, plages numériques, marque #1E6864, contraste texte/fond >=4,5:1. Aucun CSS libre ni URL. Un thème personnalisé à la fois, en mémoire ; pas de persistance automatique. Le changement de thème ne modifie ni Score ni Bundle. Les vérifications de contraste sont partielles, pas une attestation WCAG.
- Le CLI de production en série transforme un Bundle déjà exporté en variantes locales, sans accès à l'API, jeton, résolution de Kristal ou autre source de connaissances. Le manifeste ne change jamais l'autorisation de publication. Le CLI ne relit ni ne réauthentifie le Bundle ; validation syntaxique et cohérence interne ne prouvent pas sa provenance réelle.
- Un outil Python mesure la géométrie des textes dans Chromium en recherchant débordements et intersections, et signale les erreurs JavaScript et tentatives réseau. Le plan garde son statut `review` et `Q-NOT-RUNTIME-TESTED` : une preuve d'exécution séparée est liée au SHA-256 du fichier précis, pas à toute production future.

## Démarrer / tester

Depuis la racine du dépôt :

```powershell
npm run test:koreograph
npm run koreograph:demo
Invoke-Item .\artifacts\koreograph-demo\studio.html
```

Le patch ne modifie pas package.json : les commandes ajoutées sont des scripts directs. Aucun nouveau paquet npm. L'outil Python de qualification utilise la dépendance optionnelle Playwright Python, déjà nécessaire pour le script vidéo. Installer si besoin selon la politique locale : `python -m pip install playwright`, puis `python -m playwright install chromium`. Utiliser un navigateur déjà approuvé via `--chromium` si nécessaire. Ne pas installer automatiquement dans une machine de production.

## Production en série

Le dossier de sortie doit être nouveau ; son parent doit exister. Par défaut trois thèmes et deux formats. Ne pas utiliser un dossier synchronisé ou public pour des données privées. Contrôler l'accès au répertoire avec les permissions du système d'exploitation.

```powershell
$Out = ".\artifacts\koreograph-batch-$(Get-Date -Format yyyyMMdd_HHmmss)"
node scripts/koreograph-batch.mjs --out $Out --themes signature,paper,spectrum --formats svg,html,vtt
```

Sur un vrai Kristal, ouvrir le studio autorisé dans Konstellation, générer et vérifier le parcours, exporter **Bundle JSON** après confirmation locale, puis choisir explicitement ce fichier :

```powershell
$Bundle = Read-Host 'Chemin du Bundle exporté localement'
$Out = ".\artifacts\koreograph-private-$(Get-Date -Format yyyyMMdd_HHmmss)"
node scripts/koreograph-batch.mjs --bundle $Bundle --private-bundle --out $Out --themes signature,paper --formats svg,html,poster,plan,vtt
```

`--private-bundle` est un opt-in de traitement de copie privée, pas une autorisation de publier. Pas de glob, pas d'inventaire de Kristals, pas de token. Un seul Bundle (4 MiB max) par invocation, 8 thèmes max, 20 sorties max, 32 MiB par sortie. Formats : svg animé, HTML, poster SVG, plan JSON, sous-titres WebVTT. `--custom chemin.json` ajoute un thème (ID unique) et `--ratio` ne concerne que la fixture synthétique ; le format d'un Bundle réel reste celui exporté. Les variantes sont traitées séquentiellement et les fichiers finalisés par renommage depuis un temporaire. Le manifeste est actualisé entre sorties. Ctrl+C demande une annulation entre sorties (une opération synchrone en cours peut finir) ; les fichiers déjà produits sont conservés. Pas de garantie transactionnelle en cas de coupure système ou d'écritures concurrentes par un autre processus. Une sortie `success` signifie fichier écrit, pas rendu qualifié. `review` signifie revue obligatoire ; `failed` ou `cancelled` => sortie de commande non nulle. Vidéo reste le CLI séparé existant.

## Qualification Chromium

```powershell
python scripts/koreograph-runtime-check.py .\artifacts\koreograph-demo\animation.svg
```

Options : `--chromium C:\chemin\chrome.exe`, `--report nouveau-fichier.json`. Codes : 0 contrôle échantillonné réussi, 2 revue nécessaire, 1 erreur fatale ou échec d'exécution. La vérification accepte uniquement le sous-ensemble SVG autorisé du CLI vidéo, sans HTML arbitraire ni réseau. Elle examine les keyTimes et des points tous les 100 ms (max 10 000), compare les rectangles de texte visibles et le viewport. Le rapport ne contient pas les labels. Il est lié au SHA-256 du SVG ; il ne couvre ni audio, ni fontes d'un autre OS, ni chevauchement des objets avec les lignes, ni accessibilité complète, ni qualité narrative. Ne pas retirer manuellement les avertissements du Plan.

## Recette finale locale sur vrais Kristals (à exécuter par le propriétaire)

1. Vérifier Node >=24.15 et dépendances du repo. Exécuter `npm run build`, `npm run check:frontend-security`, `npm run docs:check`, `npm test`, `npm run test:ui`, puis suites E2E prévues par le dépôt après vérification de leurs préconditions. Conserver les résultats localement.
2. Démarrer `npm run dev`. Sélectionner explicitement deux Kristals autorisés de structures différentes. Pour chacun : ouvrir Constellation depuis une session non anonyme, lancer Auto, puis Script et Kapture ; vérifier que seuls les focus/voisins autorisés apparaissent ; comparer les labels aux projections de Konstellation. Vérifier les graphes isolés, denses et les changements de contexte. Ne pas exporter de secrets pour les besoins du test.
3. Changer de thème et de coloration, vérifier que le parcours demeure identique ; vérifier lecture, pause, seek, reduced-motion et clavier. Enregistrer et réimporter un thème personnalisé. Examiner les diagnostics et la lisibilité ; exécuter le contrôle Chromium sur les SVG effectivement exportés. Vérifier les fichiers localement (HTML, SVG, PNG, JSON et VTT, vidéo si dépendances qualifiées).
4. Vérifier sur comptes/profils de test autorisés : changement de Reader Policy ou de session pendant résolution, refus d'une projection non autorisée, invalidation du studio, annulation et flag serveur `KONSTELLATION_KOREOGRAPH=off`. Pas de modification des droits de production pour les tests.
5. Revue humaine de la chorégraphie et de la sémantique. Conserver les rapports privés par artefact et profil ; ne pas publier sans autorisation distincte. Si un contrôle échoue, corriger puis répéter. Aucun passage automatique de version en 1.0.

## Résultats de cette livraison (synthétique)

- 22 tests ciblés Node réussis ; dont thèmes invalides, mutation de Score, Bundle incohérent, graphe isolé, dense, doublons, fondu, cadrage carré et horloge de sortie statique.
- 24 SVG animés (8 thèmes x 3 aspects) réellement exécutés dans Chromium 144.0.7559.96 : 6 288 instants contrôlés, aucun débordement/intersection de texte détecté dans cette matrice finale, aucune erreur JavaScript ni tentative réseau. Le premier essai carré signalait des débordements ; corrigé par zoom constant adapté. Voir `qualification/runtime-matrix-synthetic.json`.
- Batch sur un Bundle synthétique explicitement exporté : 10 fichiers générés, refus d'import sans opt-in et de réutilisation d'un dossier existant. Import de thème valide et refus d'une palette URL contrôlés dans le studio Chromium.
- Validation des 5 schémas et 8 thèmes documentaires, 5 exemples et 26 cas négatifs réussie.

Ces résultats ne concernent que les fixtures synthétiques. Le build complet, les tests de Reader Policy réels, le rendu multi-navigateur, les recettes spécialisées (causalité, hiérarchie, temporalité, comparaison, convergence avec preuve structurelle), l'autocorrection exhaustive des layouts, l'accessibilité et le batch multi-Bundles restent à compléter/qualifier. Le multilinguisme reste hors périmètre. Aucun pourcentage arbitraire de maturité ni certification de production n'est attribué.
