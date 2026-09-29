# Architecture

## Logical architecture

```text
                  ┌───────────────────────────┐
                  │      Kristal release      │
                  │  authoritative knowledge  │
                  └─────────────┬─────────────┘
                                │
                     deterministic projection
                                │
                                ▼
                  ┌───────────────────────────┐
                  │         RDF export        │
                  │ reconstructable read data │
                  └─────────────┬─────────────┘
                                │ load
                                ▼
                  ┌───────────────────────────┐
                  │         Oxigraph          │
                  │       read/query model    │
                  └─────────────┬─────────────┘
                                │ SPARQL
                                ▼
┌──────────────┐   QuerySpec   ┌──────────────────────┐
│ Astro/Svelte │ ─────────────▶│ Query Engine         │
│ UI           │◀───────────── │ validate/compile/run │
└──────┬───────┘   ResultSet   └──────────────────────┘
       │
       │ optional narrative
       ▼
┌──────────────────────────────┐
│ SA adapter                   │
│ ResultSet → SemanticGraph +  │
│ communication obligations    │
└───────────────┬──────────────┘
                ▼
        SemantiK Architect
                ▼
          GF/RGL realization
```

## Canonical objects

Konstellation deliberately keeps the number of canonical representations small.

### QuerySpec

The **single canonical query-intent object**.

Used by:

- the UI;
- saved queries;
- URL state;
- tests;
- SPARQL compilation;
- query explanation;
- SA adapter input.

### ResultSet

The canonical result returned by the Query Engine.

It contains result entities and enough structured metadata to:

- render list/table/card views;
- explain matched filters;
- pivot into new queries;
- construct SA communication requests;
- expose provenance references without inventing prose.

### Relation Registry

A declarative registry that describes the relations Konstellation knows how to expose.

It is **not knowledge**. It is interface/query metadata.

### Query Lens

A declarative selection and arrangement of entity types, relations, operators, widgets, defaults, and result views.

It is **not knowledge** and does not change Kristal.

## Deployment boundary

A minimal deployment can be:

```text
browser
  ├─ Astro static shell
  └─ Svelte explorer
        ↓ HTTPS
Konstellation query service
        ↓
Oxigraph read store
```

SA may run as a separate service or process. Interaction Kernel is used only where ecosystem-level artifact/message interchange requires it; it is not the browser's event bus.

## Backend replaceability

The UI must never depend directly on Oxigraph-specific behavior.

Define a narrow backend interface:

```text
QueryBackend.execute(QuerySpec) -> ResultSet
QueryBackend.facets(QuerySpec, relationIds[]) -> FacetCounts
QueryBackend.entity(entityId) -> EntityView
```

Initial implementation: Oxigraph.

Possible future implementation: QLever.
