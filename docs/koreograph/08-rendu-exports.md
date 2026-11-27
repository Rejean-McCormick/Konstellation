# 08 — Rendu, SVG animé et exports

## Un moteur, plusieurs supports

Le Bundle est l'entrée commune du lecteur SVG Svelte et des exporteurs. Le rendu doit dépendre de `frameAt`, et non de la chronologie CSS réelle, des délais réseau ou d'une suite de clics Playwright. Le lecteur SVG existant de Constellation inspire la surface, mais l'animation de morphing nécessite un groupe stable d'objets de présentation. Les transitions CSS existantes ne sont pas le contrat temporel d'export.

| Format | Approche | Priorité proposée | Limites |
|---|---|---|---|
| Score JSON | Export déclaratif strict | V0.1 | Requiert la source autorisée pour résolution |
| HTML local autonome | Surface SVG + runtime minimal + bundle réduit, sans réseau | V0.1 | Contexte d'ouverture et CSP à tester ; contient les données embarquées |
| SVG statique | Frame à un temps choisi, textes et légendes | V0.1 | Poster, pas de mouvement |
| SVG animé autonome | Compiler propriétés et segments en animations déclaratives SVG (SMIL ou CSS selon support) | V0.2 | Sous-ensemble compatible, pas d'équivalence universelle avec le HTML |
| PNG | Capture d'un frame figé | V0.2 | Raster et résolution fixe |
| MP4 / WebM | Séquence de frames déterministes puis encodage | V0.2 | Dépendances/codec/plateforme à vérifier |
| GIF | Conversion optionnelle | V0.3+ | Palette, poids, texte dégradé ; préférer vidéo ou HTML |

Le v0.1 privilégie le HTML et le SVG statique : c'est la manière la plus simple de livrer une vraie animation vectorielle dans le navigateur sans maintenir deux moteurs. L'export SVG animé n'est pas synonyme de capture du DOM. Un SVG dans une balise `img`, un logiciel de présentation ou un éditeur vectoriel peut traiter différemment scripts, CSS ou SMIL. Tester les supports réellement visés ; si un segment non transposable est utilisé, refuser l'export ou demander un fallback explicite, jamais livrer un fichier statique sous l'étiquette animé.

## Export HTML

Le HTML autonome peut être un dossier HTML/JS/CSS local avec assets relatifs et aucune requête externe ; le « fichier HTML unique » est une option ultérieure si la CSP et l'échappement sont validés. Inclure seulement les données de rendu nécessaires, les labels, diagnostics de troncature et transcription. Le runtime est code-owned, jamais fourni dans le Score. Pour respecter la CSP du produit, préférer JS/CSS externes, transformations par attributs SVG, et éviter tout HTML non échappé. Tester l'ouverture locale et l'hébergement sous CSP stricte séparément ; un fichier exporté n'hérite pas automatiquement des protections du serveur.

## Export SVG animé

Compiler uniquement les propriétés supportées : transform, cx/cy, r, opacité et lignes, avec intervalles finis. Les textes changés sont des objets distincts fondus ; pas de morphing de chaînes. La caméra fixe simplifie la transposition. Déclarer les temps et easing selon les segments et conserver la dernière frame ; boucle uniquement si explicitement demandée et sans saut trompeur. Interdire scripts de données, événements inline, `foreignObject`, liens externes non contrôlés et références vers des assets distants. Échapper XML et vérifier la structure produite. Documenter le support par navigateur et logiciel hôte dans le rapport de recette.

## Capture vidéo déterministe

Utiliser Playwright, déjà présent, pour charger le lecteur d'export avec un Bundle autorisé local, attendre les fonts et la disponibilité de la surface, puis appeler un `setTime(t)` interne au mode export. Capturer une image seulement après confirmation de la frame et un cycle de peinture. Pas de `waitForTimeout` utilisé comme synchronisation métier. Une capture vidéo ordinaire Playwright peut servir au prototype Replay, mais elle n'offre pas la même garantie de temps que le rendu image par image.

Profil de départ : 1920 × 1080, 30 fps, 16:9 ; 1080 × 1920 pour 9:16 ; 1080 × 1080 pour 1:1. Pour durée D en ms, N=ceil(D*fps/1000) images ; frame i à `i*1000/fps` pour i de 0 à N-1, la dernière image échantillonne explicitement D afin de conserver l'état final (le dernier intervalle est adapté). Durée encodée N/fps, écart inférieur à une frame. Pour un rendu interactif, utiliser le temps exact sans ce rééchantillonnage final.

Exemple de commande **optionnelle**, à adapter et vérifier sur le poste cible, après création contrôlée de frames 000000.png, etc. :

```bash
ffmpeg -framerate 30 -start_number 0 -i frames/%06d.png -c:v libx264 -pix_fmt yuv420p demo.mp4
```

FFmpeg n'est pas une dépendance actuelle de Konstellation et la disponibilité du codec n'a pas été vérifiée. Le moteur ne doit pas invoquer une commande shell construite à partir du titre utilisateur ; passer les arguments séparément à un exécutable autorisé. Aucun audio automatique dans le scope initial. Un encodeur absent ne bloque pas Score/HTML/SVG ; signaler l'option indisponible.

## Manifeste et reproductibilité

À côté du fichier, option locale de manifeste : version Score/Bundle, versions compilateur/adaptateur/runtime, révision Konstellation si autorisée, locale, aspect, dimensions, fps, font et environnement, durée effective, avertissements, SHA-256 du fichier et des données minimisées sous réserve d'autorisation. Ne pas embarquer tokens, chemins absolus, identifiants de principal ou journal de requêtes. Les empreintes de corpus peuvent être sensibles : manifeste public minimal distinct du manifeste privé. Les fichiers temporaires sont bornés et supprimés en fin/annulation. Pas de publication automatique vers CDN, Git ou plateforme vidéo.

## Extension v0.2 : cohérence de présentation

Aperçu et export consomment le même Bundle + Presentation Plan. Figer thème effectif, encodage, géométrie, métriques de font et piste caméra/captions ; recalculer QA après changement. Les textes d'overlay ne suivent pas le zoom. Pour SMIL/CSS autonome, compiler aussi les transformations caméra et transitions des formes et labels si transposables ; sinon refuser le format avec alternative HTML. Un poster accompagne l'export animé si demandé ; une transcription conserve le parcours et les diagnostics. Le manifeste ajoute hashes de thème/plan si autorisés. Voir [contrats](19-production-contracts.md) et [batch](20-production-serie-et-release.md).
