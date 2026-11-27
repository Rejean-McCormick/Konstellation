# 22 — Livraison du moteur expérimental 0.1.0

## Statut et périmètre

Cette livraison ajoute une première tranche fonctionnelle de Koreograph sur le snapshot Konstellation `1.0.0-rc.2`. Les chapitres de conception v0.2 sont conservés comme cible ; ce document prime pour l'état effectif du code. Aucun commit distant, changement de Reader Policy, publication ni qualification de release n'a été effectué. Aucun modèle génératif, service de montage, base de données ni dépendance npm supplémentaire.

## Démarrer

Le patch contient des chemins relatifs à la racine du dépôt et le `/docs` complet. Examiner les différences et conserver les modifications locales avant extraction. L'application existante nécessite Node >=24.15.0 et ses dépendances npm. Dans cette installation, lancer les commandes habituelles :

```bash
npm install
npm run dev
```

Dans Explorer, ouvrir la vue Constellation, choisir un nœud et attendre sa projection réussie. Le bouton **Koreograph** ouvre le studio. Il est exposé uniquement si le bootstrap renvoie `koreographAvailable:true` (profil de déploiement local, principal non anonyme). Pour le désactiver côté serveur, définir `KONSTELLATION_KOREOGRAPH=off` et redémarrer. Ce flag ne constitue pas une autorisation de publication.

- **Auto** choisit les cibles dans les réponses de `/api/constellation` (limite 10), classe par kind/salience selon la recette, seed de départ stable et évite les répétitions. Le chemin est fini et reproductible à projection égale.
- **Kapture** démarre au focus résolu ; naviguer normalement, puis terminer l'enregistrement. Seules les cibles confirmées sont enregistrées. Le moteur re-résout les cibles ; en cas de saut non attesté comme voisin, utilise un fondu neutre signalé, non une relation inventée. Maximum 12 visites.
- **Script** importe un fichier Score JSON strict, borné à 128 KiB, compatible avec le contexte actif. Un saut non voisin est refusé en mode Script. Le Score synthétique du dossier examples est à utiliser uniquement dans le laboratoire synthétique.
- Lecture, pause, restart et seek utilisent la même horloge. Changement de thème/couleur/forme, caméra et captions ne relance pas les appels API ; ratio, durée, densité ou recette nécessitent une nouvelle génération.
- Choisir un format d'export, puis confirmer la remise locale non révocable. Les fichiers produits sont privés par défaut. `publicationAuthorized:false` n'est jamais modifié.

### Laboratoire autonome sans installer Konstellation

```bash
node scripts/koreograph-demo.mjs
node scripts/koreograph-demo.mjs --theme spectrum --duration 15000 --ratio 16:9 --out ./artifacts/koreograph-demo
```

Le CLI ne résout **que** le graphe fictif fourni par `demo-data.mjs`. Ouvrir `artifacts/koreograph-demo/studio.html` avec un navigateur compatible SVG/SMIL ; si le navigateur bloque les fichiers locaux, servir ce répertoire sur une boucle locale de confiance. `animation.html` est une lecture autonome de la production ; `animation.svg` est un SVG animé SMIL sans script ; `poster.svg`, `score.json`, `bundle.json`, `presentation.json` sont également générés. `--score` accepte un Score JSON synthétique du contexte exact. Les huit thèmes sont intégrés au module de code ; `node scripts/koreograph-demo.mjs --sync-themes` régénère le catalogue depuis les JSON documentaires.

### Vidéo locale facultative

Le script [koreograph-video.py](../../scripts/koreograph-video.py) requiert Python Playwright, Chromium et FFmpeg installés localement. Il accepte un SVG animé généré par le moteur, valide une liste restreinte d'éléments/attributs, interdit les ressources externes, fixe la position SMIL à chaque frame, capture et encode sans shell, sans audio et sans réseau. Le fichier de sortie ne doit pas exister ; les temporaires sont supprimés. Budget 3600 images, 32 MiB SVG, dimensions 320–3840 paires.

```bash
python scripts/koreograph-video.py artifacts/koreograph-demo/animation.svg --out artifacts/koreograph-demo/demo.mp4 --fps 30 --width 1280
```

L'option `--chromium` permet d'indiquer un exécutable local approuvé. MP4 testé ; WebM et GIF sont proposés par le CLI, mais leurs encodeurs, formats, performances et compatibilité doivent être vérifiés sur l'installation cible. Le rendu SVG animé est échantillonné à 50 ms et interpole des pistes SMIL, donc ne promet pas une équivalence pixel à pixel avec le lecteur temps réel.

## Code

| Fichier | Responsabilité |
|---|---|
| [engine.mjs](../../src/lib/koreograph/engine.mjs) | Score, cible canonique, normalisation filtrée, parcours, scène, placement, timeline, frameAt |
| [presentation.mjs](../../src/lib/koreograph/presentation.mjs) | thème effectif, cadrage, captions factuelles, QA estimée et SHA-256 |
| [render.mjs](../../src/lib/koreograph/render.mjs) | SVG statique, pistes SMIL, lecteur HTML autonome, texte échappé |
| [studio.mjs](../../src/lib/koreograph/studio.mjs) | contrôleur DOM, session, capture, API, lecture, sélection de thèmes et export |
| [themes.mjs](../../src/lib/koreograph/themes.mjs) | huit presets générés depuis les JSON documentaires, brand #1E6864 |
| [demo-data.mjs](../../src/lib/koreograph/demo-data.mjs) | graphe fictif sans assertion métier |
| [KoreographStudio.svelte](../../src/components/KoreographStudio.svelte) | montage et destruction du studio dans la vue existante |
| [ConstellationView.svelte](../../src/components/ConstellationView.svelte) | cible après résolution réussie, contrôle d'ouverture |
| [Explorer.svelte](../../src/components/Explorer.svelte) | activation locale depuis bootstrap et identité de session en mémoire |
| [server/index.mjs](../../server/index.mjs) | indication de disponibilité locale, sans nouvelle route de données |
| [koreograph-demo.mjs](../../scripts/koreograph-demo.mjs) | CLI, génération de fichiers et packaging hors ligne du même code |
| [koreograph.test.mjs](../../tests/koreograph.test.mjs) | tests ciblés du compilateur, rendu et contrats |

## Validation et limites

Exécuter `npm run test:koreograph` (aucune dépendance externe), `npm run check:frontend-security`, `npm run docs:check` et `python docs/koreograph/validate-design.py` lorsque Python jsonschema est installé. Les tests du projet complet nécessitent la version Node et l'installation de dépendances du propriétaire.

Résultats de cette tranche : 14 tests unitaires ciblés réussis sur Node 22.16.0 (ce moteur seul n'utilise pas les dépendances Astro), vérification statique sécurité front-end réussie, compilation du graphe fictif en 4 scènes, 7 segments, 10 665 ms. Le QA échantillonne les positions/rectangles approximatifs, signale les collisions, réduit les voisins facultatifs si besoin, décale les apparitions et atténue temporairement les contextes qui recouvrent le focus. La réduction ne retire pas la cible de passage. Les contrôles de sécurité s'appuient sur les réponses API filtrées, vérification de contexte, annulation/invalidation et exports explicites ; les tests avec de vrais profils de lecture restent à effectuer.

Le studio et le lecteur autonome ont été chargés en Chromium via injection du document local dans une page de test : lecture, pause, seek, thèmes, génération des sept types de Blob (Score, Bundle, Plan, SVG, SVG animé, HTML, PNG) contrôlés. Les téléchargements effectifs par le navigateur et le chargement de fichiers locaux via URL étaient bloqués par la politique du conteneur, donc les Blobs ont été inspectés avant l'action de téléchargement. La vidéo MP4 synthétique a été encodée par FFmpeg sur 256 frames, 640×360, 24 fps.

Non exécutés : build Astro/Svelte complet (Node 22 disponible au lieu du >=24.15 requis, node_modules absent), test réel de l'intégration Konstellation et Reader Policy, suites UI/E2E du repo et validation multi-corpus. Le flag de disponibilité local est proposé et non qualifié. Ne pas déclarer cette tranche release-ready.

Ne sont pas livrés : import de thèmes personnalisés, production batch générale, manifestes de production, adaptateurs spécialisés (hiérarchie, causalité, temporalité, etc.), API Production Request complète, QA avec métriques de police exactes, qualification WCAG, transcription distincte, traduction étendue, preuve de performance des gros corpus, export vidéo direct depuis l'interface. Le CLI vidéo est distinct ; il ne confère aucune autorisation de diffusion. Les paramètres avancés et seuils géométriques sont des décisions proposées. L'interface actuelle est en français. Les contrats documentaires restent drafts ; aucune promotion de statut canonique.
