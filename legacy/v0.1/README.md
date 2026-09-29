# Konstellation

**Visual Query Navigator for Kristal**

Konstellation is a deterministic, visual knowledge-query application for the kOA ecosystem.

It is **not an AI chatbot**. It lets a user build structured queries visually, execute them against a read projection of Kristal, inspect the resulting entities and relations, and optionally ask SemantiK Architect (SA) to verbalize the query or result in natural language.

## Core idea

```text
Kristal (authority)
      ↓ deterministic projection
RDF read model
      ↓
Oxigraph
      ↓
QuerySpec Engine
      ↓
Astro + Svelte
      ↓
facets / visual graph / results
      ↓
SemantiK Architect (optional verbalization)
```

Konstellation separates five things that must not be conflated:

1. **Knowledge** — Kristal owns epistemic state and authority.
2. **Read projection** — Oxigraph indexes a reconstructable RDF projection.
3. **Query intent** — `QuerySpec` is the canonical representation of a query.
4. **Navigation perspective** — `Query Lens` JSON decides which relations and filters a user sees.
5. **Language realization** — SemantiK Architect expresses already-selected content; it does not decide what is true or what to include.

## Example

A user starts from the implicit root `human`, chooses the lens **Intellectual history**, then applies:

- lifespan overlaps 300–500;
- field of work = philosophy;
- movement exists.

Konstellation serializes that interaction as a `QuerySpec`, compiles it to SPARQL, executes it, and returns matching people. The user may then select Augustine of Hippo and pivot to works, influences, places, institutions, movements, sources, or other declared relations.

No rule such as `if Augustine then ...` exists in the UI.

## Design principles

- **People-first, but not people-only.** A person is a natural starting point; navigation can pivot to works, places, institutions, movements, concepts, sources, and other entity types.
- **Relations are data, not UI code.** The Relation Registry defines relations, operators, labels, types, directionality, and mappings.
- **Lenses are declarative.** A lens chooses which relations matter for a particular mode of exploration.
- **One canonical query model.** UI state, URLs, saved searches, tests, SPARQL compilation, and SA explanations all derive from the same `QuerySpec`.
- **Kristal remains authoritative.** Query infrastructure never becomes a second truth store.
- **Fail closed.** Unknown relation IDs, invalid operators, unsupported mappings, or malformed queries are rejected rather than guessed.
- **Deterministic by default.** Given the same Kristal release, lens, registry, and QuerySpec, the same result set should be reproducible.
- **Progressive complexity.** Facets/list views are primary; graph query editing and graph visualization are advanced views.

## Proposed stack

| Responsibility | Technology |
|---|---|
| Application shell | Astro |
| Interactive UI | Svelte |
| Faceted query UI | Svelte components |
| Advanced visual query graph | Svelte Flow |
| Result graph visualization | Cytoscape.js |
| Canonical query model | JSON + JSON Schema |
| Query language | SPARQL |
| Initial graph read model | Oxigraph |
| Future very-large graph backend | QLever adapter |
| Epistemic authority | Kristal |
| Natural-language realization | SemantiK Architect + GF/RGL |
| Cross-component interchange where required | Interaction Kernel |

## Repository documentation

- [`docs/00-vision.md`](docs/00-vision.md)
- [`docs/01-architecture.md`](docs/01-architecture.md)
- [`docs/02-query-model.md`](docs/02-query-model.md)
- [`docs/03-query-lenses.md`](docs/03-query-lenses.md)
- [`docs/04-relation-registry.md`](docs/04-relation-registry.md)
- [`docs/05-kristal-read-model.md`](docs/05-kristal-read-model.md)
- [`docs/06-semantik-architect.md`](docs/06-semantik-architect.md)
- [`docs/07-ui-ux.md`](docs/07-ui-ux.md)
- [`docs/08-boundaries.md`](docs/08-boundaries.md)
- [`docs/09-roadmap.md`](docs/09-roadmap.md)
- [`docs/10-repository-layout.md`](docs/10-repository-layout.md)

## Initial contracts

- [`contracts/query-spec.schema.json`](contracts/query-spec.schema.json)
- [`contracts/relation.schema.json`](contracts/relation.schema.json)
- [`contracts/lens.schema.json`](contracts/lens.schema.json)
- [`contracts/result-set.schema.json`](contracts/result-set.schema.json)

These contracts are intentionally small. They should stabilize before significant frontend implementation.

## Status

**Design / repository bootstrap.**

The first target vertical slice is the Catholic/intellectual-history corpus, but the engine must remain generic enough to load a sociodemographic lens without application-code changes.
