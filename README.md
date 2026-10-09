# Konstellation

**Adaptive, domain-agnostic navigation engine for Kristal knowledge.**

**Release candidate:** `1.0.0-rc.2`. Architecture and target code exist, but a reproducible release build and full E2E gates remain prerequisites for final `1.0.0` qualification. See [implementation status](docs/IMPLEMENTATION.md) and [current validation evidence](docs/VALIDATION-v1.0-RC.md).

## Core principle

> Kristal defines what is knowable. A Lens defines the viewing angle. Konstellation derives explainable navigation affordances from visible structure, creates a `NavigationPlan`, and selects a controlled renderer. A view never creates new semantic truth.

```text
Kristal state v6 / normalized pack
    → Reader Policy + roles
    → Structural Introspection
    → Navigation Affordances
    → Lens + ResultSet + Focus
    → NavigationPlan 1.0
    → Projection DTO 1.0
    → Renderer Registry
    → Konstellation Shell
```

## Renderers

Generic renderers include list, table, constellation, `timeline-lineage`, `tree`, `dag-proof`, `flow-path`, `causal-feedback`, `matrix-profile`, `state-flow`, `traceability`, `multiscale-layer` and `spatial`. They are not hard-coded to a domain such as mathematics, history or medicine.

## Requirements and startup

A qualified release requires **Node.js >= 24.15.0** and a committed, reproducible `package-lock.json` generated under the supported release environment.

```bash
npm ci
npm run build
npm start
```

The default `local` profile listens on `127.0.0.1:4321`.

### Local Kristal selection

When a compatible Kristal collection is placed in `../kristals` beside the Konstellation folder, `Konstellation_Launcher.cmd` can select `examples/integrations/kristal-kollection.json`. The context header offers a **KRISTAL** selector. The selected reference is retained locally and included in shared/exported navigation metadata. Domains without exactly one readable `*.kristal-state.json` remain visible but disabled. `X-Konstellation-Kristal` scopes a request without mutating the shared server corpus.

The reference to a local **Kristal-Kollection directory/layout** does not rename the separate GitHub hosting repository `kristal-public`.

## Tests and release gates

```bash
npm test
npm run test:ui
npm run build
npm run test:e2e
npm run benchmark -- --full
npm run release:preflight
npm run release:check
```

**Do not tag final `1.0.0`** until `npm run release:check` succeeds in a supported environment with the committed lockfile.

## Deployment profiles

| Profile | Boundary |
| --- | --- |
| `local` | Single local operator |
| `lan` | Trusted-network deployment with configured authentication policy |
| `shared` | Authentication, roles/scopes, audit and rate limiting |
| `public` | Strict CSP, recommended TLS/gateway and authentication unless read-only public access is explicitly enabled |

Read [deployment](docs/22-deployment.md) and [security](docs/19-security.md) before exposing services.

## Repository map

| Path | Contents |
| --- | --- |
| `src/` | Astro/Svelte shell and renderers |
| `server/` | Engine, API, reader policy, profiler, planner and projections |
| `contracts/` | Published and upstream JSON Schemas |
| `tests/` | Policy, API, UI, contract and E2E tests |
| `benchmarks/` | Regression measurements |
| `scripts/` | Import and release tooling |
| `docs/` | Specifications, guides, ADRs and runbooks |
| `data/` | Demonstration corpus |

Start at [documentation index](docs/README.md); consult [release policy](docs/25-release-1.0.md) for qualification requirements.
