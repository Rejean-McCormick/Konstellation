# Proposed Repository Layout

```text
Konstellation/
├── README.md
├── CHANGELOG.md
├── package.json
├── astro.config.mjs
├── contracts/
│   ├── query-spec.schema.json
│   ├── result-set.schema.json
│   ├── relation.schema.json
│   └── lens.schema.json
├── registry/
│   ├── relations/
│   │   ├── birth_place.json
│   │   ├── field_of_work.json
│   │   ├── movement.json
│   │   └── ...
│   └── entity-types/
│       ├── human.json
│       ├── work.json
│       ├── place.json
│       └── ...
├── lenses/
│   ├── intellectual-history.json
│   ├── catholic-intellectual-history.json
│   └── sociodemography.json
├── src/
│   ├── pages/
│   │   └── explore.astro
│   ├── components/
│   ├── explorer/
│   │   ├── query-state/
│   │   ├── facets/
│   │   ├── graph-query/
│   │   └── results/
│   ├── query-engine/
│   │   ├── validate/
│   │   ├── plan/
│   │   ├── sparql/
│   │   └── backend/
│   ├── projection/
│   │   └── kristal-rdf/
│   ├── adapters/
│   │   ├── oxigraph/
│   │   ├── semantik-architect/
│   │   └── interaction-kernel/
│   └── lib/
├── tests/
│   ├── contracts/
│   ├── query-engine/
│   ├── lenses/
│   ├── projection/
│   └── e2e/
├── examples/
│   ├── lenses/
│   └── queries/
└── docs/
    └── adr/
```

## Package boundaries

The UI may import contract types and client-side QuerySpec helpers.

The UI must not import Oxigraph internals or SPARQL templates directly.

The query compiler must not contain lens-specific branches.
