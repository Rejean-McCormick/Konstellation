# Konstellation — Correctif groupé D17 (20 novembre 2026)

Le ZIP utilisateur `KONSTELLATION_DIAG_RESULTATS_20261120-121438.zip` confirme **16 niveaux**, dont D17 FAIL ; D12 et N06 WARN ; D13 BLOCKED ; D19 SKIP. 11 niveaux PASS.

## Cause des échecs

- Vitest : les trois configurations `visual-semantics`, `visual-attributes` et `visual-hierarchy-reviews` utilisaient des URL construites à partir de `import.meta.url`, parfois virtuelle dans Vitest. Les configurations sont dorénavant lues exclusivement sous `ROOT/config`, où `ROOT` est le répertoire serveur canonique. Le serveur garde son test d’entrée directe mais refuse de convertir une URL non `file:` en chemin.
- Playwright : le fixture de démarrage attendait une ancienne phrase d’accueil. Il attend désormais `Explorez la structure des connaissances`, mais valide toujours les résultats, l’absence d’alertes et les API.
- Les réponses **explicitement désactivées** de `/api/fleet` (404) et `/api/kompiler/capabilities` (503) ne constituent pas un échec de disponibilité. Le fixture les autorise uniquement si chemin, statut et message attendu concordent. Les autres erreurs restent signalées.
- Trois avertissements Svelte A11y : état sélectionné de `treeitem`, gestion de la touche Escape sur fenêtre et conteneur de dialogue générique.
- `/brand-logo.svg` était demandé mais absent du snapshot consulté. Ajout d’un SVG local neutre et autonome.

## Ce que le pack ne fait pas

Aucune règle sémantique n’est approuvée. D12 reste attendu tant que les registres sont vides ; D13 reste `BLOCKED` jusqu’à une Reader Policy autorisée. D19 exige le ZIP source facultatif. Les deux lignes de N06 semblent être des accès à une variable d’environnement (`KONSTELLATION_CURSOR_SECRET`), non une valeur de secret exposée dans le code inspecté, mais la vérification de l’environnement et de l’historique reste distincte.

## Installation

1. Copiez le pack ZIP dans Downloads. Lancer `installer_d17.py --target "C:\mycode\Konstellation\Konstellation" --check` pour l’inventaire exact et le refus de divergence.
2. Lancez `installer_d17.py --target ... --apply` ; le script sauvegarde les fichiers existants, exécute les tests Node, Vitest, Svelte, sécurité, Astro et Playwright smoke. Le rollback est automatique si une étape échoue.
3. Les rapports de validation sont placés dans `%LOCALAPPDATA%/Konstellation/semantic-visual-backups/DIAG-D17-.../validation/` ; aucune action Git ou distante.

**Important :** la compilation et les tests navigateur de ce correctif devront s’exécuter sur ton Windows, car cet environnement ne dispose pas de la chaîne npm/Chromium installée. Le pack ne doit pas être déclaré validé avant cela.

## Correctif complémentaire D17 V2 après la validation Windows

Le premier installateur D17 a été restauré (`ROLLED_BACK`) après l’échec de `03-vitest-ui`. Le rapport `KONSTELLATION_D17_VALIDATION_20261120-133059.zip` a montré que la résolution des registres fonctionne désormais : `renderers.test.mjs` passe (11/11), mais **les sept tests d’Explorer échouent au démarrage** parce que le faux serveur répond `Unknown endpoint` à `GET /api/kristals`. Le faux serveur ne gérait pas non plus le paramètre `readerPolicyRef` du bootstrap.

D17 V2 corrige `tests/ui/explorer.test.mjs` en reflétant la forme exacte des réponses du serveur pour le catalogue neutre, le Fleet optionnel (404), et le bootstrap lié à la politique de lecture. La version V2 inclut la totalité des changements D17 V1, remplace sa documentation d’installation et ajoute une vérification de non-régression du faux serveur.

**Commande V2 :** `tools/installer_d17_v2.py --target "C:\mycode\Konstellation\Konstellation" --check` puis `--apply`. Les sauvegardes V2 portent le préfixe `DIAG-D17-V2-`.

Les tests complets et Vitest de D17 V2 doivent encore passer sur Windows ; aucune qualification sémantique n’est activée par ce changement.

## Correctif complémentaire D17 V3 après le second rollback

La validation Windows de D17 V2 a également restauré la base (`ROLLED_BACK`), mais le nombre de tests Vitest en échec a diminué de 7 à **2 sur 18**. Le rapport `KONSTELLATION_D17_V2_VALIDATION_20261120-144502.zip` montre :

- `tests/ui/renderers.test.mjs` : 11/11 réussis ; cinq tests Explorer supplémentaires réussis.
- Changement de perspective : le test envoyait l’ID `sociodemography` sans charger les Lens d’exemple. L’interface tentait alors d’accéder à `nextLens.rootType` malgré une Lens absente (rejet non géré). V3 charge les Lens effectivement demandées dans l’essai et refuse proprement une perspective inconnue dans l’application.
- Changement de politique : le test réinspectait l’entité avant que la nouvelle politique soit effectivement appliquée. V3 attend que la description de la **nouvelle Reader Policy** soit affichée et que les résultats aient fini de se recharger avant d’attendre l’assertion `disputed`.
- Playwright smoke : 2/2 réussis dans le rapport V2 ; les contrôles précédents de sécurité/structure et Astro réussissent.

D17 V3 est **cumulatif** : il reprend les correctifs V1/V2, sans dépendre d’une installation préalable. Les autorisations de lecture et les règles visuelles ne sont pas assouplies. Les tests Vitest V3 doivent encore passer sur le Windows cible ; une exécution isolée sans dépendances npm ne constitue pas cette validation.
