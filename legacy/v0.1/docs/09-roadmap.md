# Roadmap

## Phase 0 — Contracts first

Deliver:

- `relation.schema.json`
- `lens.schema.json`
- `query-spec.schema.json`
- `result-set.schema.json`
- canonicalization and validation tests

Exit criterion: invalid relation/operator combinations fail closed.

## Phase 1 — Catholic intellectual-history vertical slice

Deliver:

- Relation Registry with ~20 useful relations;
- `catholic-intellectual-history` lens;
- Kristal → RDF projector;
- local Oxigraph store;
- Query Engine;
- faceted results UI;
- entity inspector;
- provenance/status display.

Exit criterion: Augustine can emerge from filters rather than hard-coded entity selection.

## Phase 2 — Prove genericity

Add:

- `intellectual-history` lens;
- `sociodemography` lens.

Exit criterion: both lenses work without domain-specific branches in query-engine code.

## Phase 3 — Visual query editing

Add Svelte Flow advanced view.

Exit criterion: graph edits and facet edits round-trip to the same canonical QuerySpec.

## Phase 4 — Result graph

Add Cytoscape.js neighborhood exploration.

Exit criterion: result graph is a projection of ResultSet / explicit follow-up queries, not an independent query language.

## Phase 5 — SA language layer

Add deterministic adapter:

```text
QuerySpec + ResultSet → CommunicationRequest → SA
```

Initial commands:

- Explain query
- Summarize results
- Explain match
- Show provenance

## Phase 6 — Saved/shared lenses and queries

Add:

- saved QuerySpec artifacts;
- lens import/export;
- content hashes;
- version compatibility checks.

## Phase 7 — Scale

Only after measurement:

- facet caches;
- precomputed counts;
- RDF partitioning;
- query-plan instrumentation;
- optional QLever backend.

Do not introduce QLever merely in anticipation of scale.
