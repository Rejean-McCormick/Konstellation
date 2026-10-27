# Vérification locale — lecteur Konstellation v11 opt-in (2026-10-27)

## Source et périmètre

- Dépôt de base : `znapshot_Konstellation_10270943.zip` (`1.0.0-rc.2`).
- Framework testé : `11.0.0-draft.4`, depuis le snapshot fourni.
- Integration Pack testé : `0.3.0-alpha.1`, code épinglé depuis le snapshot fourni et identique à celui du LOT1.
- Aucun changement du moteur v6/v10, des conversions historiques ni des contrats normatifs.
- Nouveau : `server/integrations/kristal-v11.mjs`, garde v11 locale reprise du Pack, route `/v11`, `V11Reader.svelte`, configuration exemple, 3 routes GET, tests et documentation.

## Tests exécutés et réussis

1. `node --test tests/kristal-v11-reader.test.mjs` avec `KRISTAL_FRAMEWORK_ROOT` et `KRISTAL_INTEGRATION_PACK_ROOT` pointant aux deux checkouts exacts : **6/6**, incluant la vue `fr-CA` réellement produite par l'Integration Pack (validation sémantique et dictionnaires Framework) et cas de refus.
2. Régression de navigation et sécurité sans dépendances npm : **29/29** (`navigation-adaptive`, `navigation-variety`, `kristal-v6-navigation`, `navigation-golden-1.0`, `security-1.0`).
3. `python tools/validate.py` : **62 contrôles**.
4. `node scripts/check-svelte-structure.mjs` : **20 fichiers, 0 problème**.
5. `node scripts/check-frontend-security.mjs` : **26 fichiers, 0 problème**.
6. `node scripts/check-docs.mjs` : **77 Markdown, 81 liens locaux, 0 problème**.
7. Syntaxe JS du serveur et de l'adaptateur : `node --check` réussi.

## Limites de qualification

- Node disponible dans l'environnement : 22.16.0; le projet exige Node 24.15.0+ pour la release.
- `package-lock.json` absent des ZIP Konstellation source et LOT1; le vrai fichier existe sur la branche GitHub mais n'était pas inclus dans les snapshots fournis. **Ne pas générer ni substituer un lockfile non vérifié.**
- `npm ci`, build Astro/Svelte et Playwright n'ont donc **pas** été exécutés dans cette livraison.
- Pas de test de lecture sur les Kristals privés, pas de charge à grande échelle ni test de sécurité en production.
- Le profil local autorise un dataset entier à un principal explicitement déclaré. Aucune Reader Policy individuelle C1/C2 n'est inférée de la vue.
- Aucun déploiement, aucune publication, aucune mutation GitHub, aucune donnée sur D: touchée.

**Décision :** prototype de lecteur v11 **local et opt-in**, prêt pour vérification sous Windows. Aucun statut de release publique ou de publication accordé.
