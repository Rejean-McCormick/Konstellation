# Konstellation — lecteur v11 local expérimental (1.0.0-rc.2)

## Statut et frontière de sécurité

**Implémenté, optionnel, local seulement.** Ce lecteur ne publie pas de Kristals, ne modifie pas leurs octets, n'active pas de traduction et ne crée aucune autorité sémantique. Les API et l'interface **n'utilisent pas** le moteur historique v6/v10 : les métadonnées de statut épistémique, de certitude, de contrôle de sources et de Reader Policy v6 ne sont pas présentes dans la vue dérivée v11. Il serait faux de les inventer.

La vue provient de `Kristal Integration Pack 0.3.0-alpha.1`, à partir du **Framework 11.0.0-draft.4**. Le lecteur vérifie le SHA-256 exact du script `tools/v11_integration.py`, du pin de 13 fichiers, et les 13 empreintes réelles du Framework avant de démarrer. Le script épinglé exécute la validation sémantique, l'audit des dictionnaires et la vérification de leurs couches avant de produire la vue.

**Aucune ouverture en `lan`, `shared`, `public`**. En mode `local`, une configuration et une allowlist explicites de principaux sont obligatoires. Il s'agit d'un accès au **jeu de données entier**, pas d'une ACL par assertion : la vue v11 ne contient pas d'étiquettes d'accès vérifiables. N'y configurez **aucun corpus non approuvé pour l'utilisateur local choisi**. Les données sensibles à autorisations fines exigent un véritable lecteur avec Reader Policy indépendante. Le passage à un serveur public exigera de vrais reçus C1/C2 et une nouvelle implémentation de l'admission/contrôle des vues.

## Mise en route Windows sans modifier le canon

1. Garder la sauvegarde de votre Konstellation actuel et vérifier qu'il contient `package-lock.json` provenant **du commit qualifié** du même `package.json`. Les archives de snapshot fournies n'incluaient pas ce fichier : ne pas le générer au hasard, ne pas utiliser `npm install` comme contournement.
2. Installer Python 3.11+ et `jsonschema`, Node **24.15.0+**; conserver Framework draft.4 et Integration Pack 0.3.0-alpha.1 côte à côte, non modifiés.
3. Copier `config/v11-reader.local.example.json` vers un fichier de configuration **privé**, hors Git. Adapter les chemins absolus des deux dépôts et des quatre entrées du graphe, choisir les locales déclarées dans le catalogue et l'allowlist des principaux qui peuvent voir l'intégralité du jeu. L'exemple de chemins est indicatif.
4. PowerShell, dans Konstellation :

```powershell
$env:KONSTELLATION_DEPLOYMENT_PROFILE = 'local'
$env:KONSTELLATION_V11_CONFIG = 'C:\chemin-prive\v11-reader.local.json'
$env:KONSTELLATION_ALLOWED_HOSTS = 'localhost,127.0.0.1,[::1]'
npm ci
npm run build
npm start
```

5. Ouvrir `http://127.0.0.1:4321/v11`. Le sélecteur de dataset et de langue n'expose que les jeux explicitement admis. Le statut direct / fallback / missing reste affiché sans inventer de traduction. Cliquer sur une entité donne les assertions KA, les propriétés KP, les sources KS et les valeurs littérales du graphe.

Désactiver entièrement ce lecteur : arrêter le serveur et supprimer `KONSTELLATION_V11_CONFIG`. Il n'y a pas de migration à inverser.

## API isolée

- `GET /api/v11/catalog`: liste des datasets admis pour le principal local, sans chemins privés.
- `GET /api/v11/view?dataset=framework-demo&locale=fr-CA`: représentation dérivée complète avec empreintes et statut lexical.
- `GET /api/v11/neighborhood?dataset=framework-demo&locale=fr-CA&id=KQ1001`: voisinage avec références KQ/KP/KA/KS et sources.

Toutes les routes requièrent la lecture (`read`) en plus de l'allowlist v11; en l'absence de configuration, elles répondent 404. Le serveur ne reçoit **jamais** de chemins à partir d'une requête HTTP. Un mauvais identifiant/la mauvaise locale ne révèle pas d'autre donnée. Les erreurs de validation Python ne sont pas renvoyées au client. Les ressources locales sont relues/vérifiées à chaque demande; aucun fichier canonique n'est écrit.

## Tests et qualifications

```bash
node --test tests/kristal-v11-reader.test.mjs
python tools/validate.py
node scripts/check-svelte-structure.mjs
node scripts/check-frontend-security.mjs
```

Le test d'intégration **sur les vrais dépôts Framework et Pack**, qui vérifie les SHA, le langage `fr-CA`, et les assertions du graphe, utilise en plus les variables `KRISTAL_FRAMEWORK_ROOT`, `KRISTAL_INTEGRATION_PACK_ROOT` (et éventuellement `KRISTAL_PYTHON`). Sans ces variables ce test est ignoré, avec un message explicite.

Le **build Astro/Svelte**, la suite complète dépendant de `node_modules`, les tests Playwright et la validation d'un jeu de données réel sous Windows restent nécessaires avant toute qualification de release. Les copies de ZIP source ne contiennent pas le `package-lock.json` actuel du GitHub : récupérer le vrai fichier à la même révision avant d'exécuter `npm ci`.

## Invariants conservés

- Identités canoniques KQ / KP / KA / KS; Wikidata Q/P uniquement en correspondance externe `exactMatch` acceptée.
- Statuts lexicaux direct / fallback / missing selon le catalogue épinglé, provenance de couches conservée.
- Source de vérité Framework et Médiathèque hors Konstellation; aucune migration ou modification de `D:`.
- Lecteurs v6, v10, Catho, Kompiler et navigation classique inchangés.
- Aucune assertion transformée en statut `validated`, ni publication implicite.
