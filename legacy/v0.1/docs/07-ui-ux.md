# UI / UX

## Primary experience

The default explorer should be **faceted**, not a giant node graph.

```text
┌─────────────────────────────────────────────────────┐
│ Konstellation        Lens: Intellectual history  ▾ │
├──────────────────┬──────────────────────────────────┤
│ FACETS           │ RESULTS                          │
│                  │                                  │
│ Period           │ Augustine of Hippo               │
│ 300 ───── 500    │ ...                              │
│                  │                                  │
│ Field            │                                  │
│ Philosophy       │                                  │
│                  │                                  │
│ Movement         │                                  │
│ exists           │                                  │
├──────────────────┴──────────────────────────────────┤
│ Human · 300–500 · philosophy · HAS movement        │
└─────────────────────────────────────────────────────┘
```

## Progressive disclosure

### Level 1 — Facets

Fast and familiar filtering.

### Level 2 — Entity inspector

Selecting an entity reveals declared pivots:

- works;
- places;
- institutions;
- movements;
- influences;
- sources.

### Level 3 — Visual Query Graph

Svelte Flow shows QuerySpec as editable nodes and edges.

This is an advanced view, not the default interaction.

### Level 4 — Result Graph

Cytoscape.js visualizes a selected result neighborhood.

It should be lazy-loaded only when opened.

## URL state

Shareable queries should encode either:

- a compact canonical QuerySpec; or
- an immutable saved-query ID whose content hash resolves to QuerySpec.

## Accessibility

Every graph action must have a non-graph equivalent. A user must be able to construct and inspect a query using keyboard-accessible controls without dragging nodes.
