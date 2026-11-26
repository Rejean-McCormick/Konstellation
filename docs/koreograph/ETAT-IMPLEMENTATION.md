# Koreograph dans Konstellation

Koreograph est disponible comme aperçu local du lecteur historique. L’activation requiert le profil de déploiement local et une adresse limitée à la boucle locale. Le navigateur utilise le contexte, la session et les API de l’explorateur.

    npm ci
    npm run build
    KONSTELLATION_ENABLE_KOREOGRAPH=true npm start

Dans Constellation, ouvrir un nœud puis ouvrir **Koreograph**. **Script** compose un parcours à partir des voisins filtrés. **Kapture** enregistre les navigations confirmées, puis **Préparer le rejeu** vérifie la partition auprès du lecteur. **Auto** explore les voisins visibles selon la recette et la limite de sauts choisies. Une partition JSON peut être importée et modifiée. Chaque export présente deux liens, le fichier et son reçu privé.

| Lot | Couverture livrée |
|---|---|
| KOR-0 | Schémas versionnés et validation AJV précompilée pour le navigateur. |
| KOR-1 | API Constellation existante, contrôle du contexte, compilation du Score et lecteur SVG à temps explicite. |
| KOR-2 | Continuité centre-satellite, affectation stable des survivants, révélation, pause, fondu et mouvement réduit. |
| KOR-3 | Script, Kapture, Auto, import et édition JSON, annulation et diagnostics. |
| KOR-4 | Flag local, Score, Bundle, SVG poster, HTML autonome, PNG navigateur et reçu privé. |
| KOR-5 | SVG animé autonome et rendu hors ligne PNG, MP4 et WebM. |
| KOR-6 | Adaptateurs **Traçabilité**, **Hiérarchie** et **Causalité**, assujettis aux témoins exacts de l’audit de projection. Les sept autres renderers adaptatifs offrent des extraits animés neutres. |
| KOR-7 | Tests locaux et vérification de sorties avec Chromium et FFmpeg. Toute qualification de production et diffusion suit les procédures propres à kOA. |

## Rendu raster local

Le script de rendu utilise Playwright Chromium. Les vidéos requièrent FFmpeg avec les encodeurs libx264 ou libvpx-vp9.

    npx playwright install chromium
    node scripts/koreograph-render.mjs koreograph.bundle.json demo.png --private --time 1200
    node scripts/koreograph-render.mjs koreograph.bundle.json demo.mp4 --private --receipt koreograph.bundle.json.receipt.json
    node scripts/koreograph-render.mjs koreograph.bundle.json demo.webm --private

Le CLI rend hors ligne et enregistre l’environnement de rendu, l’empreinte du résultat et la cadence. L’option de reçu vérifie l’empreinte du Bundle. Le CLI refuse de remplacer un fichier existant et nettoie ses fichiers temporaires. Les vidéos sont échantillonnées à 30 images/s, avec une dernière image à la fin du parcours. Le SVG animé utilise SMIL à 12 images/s. La compatibilité avec les logiciels de présentation et les autres lecteurs SVG reste à qualifier. Les pixels peuvent varier selon les polices et l’environnement.

Les reçus identifient les entrées filtrées par empreinte et les versions du compilateur et du moteur. L’engagement déclaré du Kristal est ajouté lorsque la configuration permet déjà d’exposer l’identité du corpus. Un reçu décrit les entrées et sorties du rendu. Les décisions sur le canon et la diffusion relèvent de leurs autorités respectives.

## Vérification

    node scripts/generate-koreograph-validators.mjs --check
    node --test tests/koreograph.test.mjs
    npm run test:ui
    npm run docs:check
    npm run check:svelte-structure
    npm run check:frontend-security

Avec le serveur local actif et Koreograph activé, lancer la recette Chromium.

    PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 npx playwright test tests/browser/koreograph.spec.mjs

Le scénario utilise le pack synthétique, enregistre un saut réellement résolu puis vérifie le clavier et la réouverture autonome hors ligne. Les encodages sémantiques et les recettes automatiques supplémentaires restent à qualifier séparément. La v11, Konstellation-Light, la publication et les profils partagés ont leurs propres contrats.
