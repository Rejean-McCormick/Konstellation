# Konstellation

**Moteur universel de navigation adaptative pour Kristals.**

Cette branche contient l’implémentation **Konstellation 1.0 RC** (`1.0.0-rc.2`) alignée sur la spécification complète de [`docs/`](docs/README.md). Le suffixe RC signifie uniquement que les gates de release reproductible/build/E2E doivent encore être exécutés dans un environnement Node supporté ; l’architecture et le code cible 1.0 sont présents.

## Principe

> Le Kristal définit ce qui est connaissable. La Lens définit l’angle. Konstellation dérive des affordances depuis la structure visible, construit un `NavigationPlan` explicable et choisit un renderer contrôlé. Une vue ne crée jamais de vérité.

## Architecture 1.0

```text
kristal_state v6 / normalized pack
          ↓
Reader Policy + rôles
          ↓
Structural Introspection
          ↓
Navigation Affordances
          ↓
Lens + ResultSet + Focus
          ↓
NavigationPlan 1.0
          ↓
Projection DTO 1.0
          ↓
Renderer Registry
          ↓
Konstellation Shell
```

## Renderers natifs

Konstellation 1.0 fournit : Liste, Tableau, Constellation, `timeline-lineage`, `tree`, `dag-proof`, `flow-path`, `causal-feedback`, `matrix-profile`, `state-flow`, `traceability`, `multiscale-layer` et `spatial`.

Ils sont génériques : aucun renderer n’est nommé d’après Math, HumanBody, HistoryTech, ScolQc, Catho ou un autre domaine.

## Démarrer

Prérequis de release : **Node.js >= 24.15.0** et un `package-lock.json` généré/commité dans l’environnement de release.

```bash
npm ci
npm run build
npm start
```

Par défaut, le profil `local` écoute sur `127.0.0.1:4321`.

### Sélection des Kristals

Si une Kristal-Kollection est placée dans `../kristals` (à côté du dossier `Konstellation`), `Konstellation_Launcher.cmd` démarre automatiquement avec `examples/integrations/kristal-kollection.json`. L’interface affiche alors un sélecteur **KRISTAL** dans le bandeau de contexte. Le dernier Kristal choisi est conservé dans le navigateur et les explorations exportées/partagées mémorisent aussi leur `kristalRef`.

Les domaines qui ne contiennent pas exactement un fichier `*.kristal-state.json` lisible restent visibles mais désactivés dans le sélecteur. Le choix est transmis par requête (`X-Konstellation-Kristal`) : il ne modifie pas globalement le corpus d’une instance partagée.

## Vérification

```bash
npm test
npm run test:ui
npm run build
npm run test:e2e
npm run benchmark -- --full
npm run release:preflight
```

Le gate complet :

```bash
npm run release:check
```

## Profils de déploiement

- `local` — single-user, principal local ;
- `lan` — réseau de confiance avec auth recommandée/obligatoire par config ;
- `shared` — authentification, rôles/scopes, audit et rate limiting ;
- `public` — CSP stricte, gateway/TLS recommandés, auth sauf opt-in readonly public.

Voir [`docs/22-deployment.md`](docs/22-deployment.md) et [`docs/19-security.md`](docs/19-security.md).

## Documentation

Point d’entrée : **[`docs/README.md`](docs/README.md)**.

Pour l’état exact du code : **[`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)**.  
Pour la qualification actuelle : **[`docs/VALIDATION-v1.0-RC.md`](docs/VALIDATION-v1.0-RC.md)**.  
Pour la release finale : **[`docs/25-release-1.0.md`](docs/25-release-1.0.md)**.

## Structure

| Chemin | Rôle |
|---|---|
| `src/` | shell Astro/Svelte et renderers |
| `server/` | moteur, API, policy, profiler, planner, projections |
| `contracts/` | JSON Schemas publics et upstream |
| `tests/` | contrats, moteur, policy, navigation, UI, API, E2E |
| `benchmarks/` | seuils de régression |
| `scripts/` | import, benchmark, release gates |
| `docs/` | spécification, guides, ADRs, runbooks et historique |
| `data/` | corpus de démonstration |

## Statut

Ne pas publier le tag final `1.0.0` tant que `npm run release:check` n’est pas vert sous Node supporté avec lockfile commité. Voir [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md).
