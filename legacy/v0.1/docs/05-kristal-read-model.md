# Kristal Read Model

## Authority boundary

Kristal is the epistemic authority.

Konstellation must never infer that because something exists in its query store it is canonically recognized by Kristal.

The query store is a **derived read model**.

## Projection

A deterministic projector emits RDF/N-Quads from a pinned Kristal release or approved Kristal artifact set.

Conceptually:

```text
Kristal artifacts
      ↓
projection manifest
      ↓
RDF/N-Quads
      ↓
Oxigraph load
```

The projection should preserve identifiers that allow a result to point back to:

- the source Kristal artifact;
- assertion identity where available;
- source/provenance references;
- epistemic status fields needed by the reader;
- release/version/digest.

## Rebuildability

The Oxigraph store is disposable.

Given:

- the same pinned Kristal artifacts;
- the same projector version;
- the same registry mapping version;

it must be possible to rebuild the same read model.

## Wikidata

Wikidata is an ingestion/evidence source upstream of Kristal, not the authority used directly by the production UI unless a lens explicitly targets an ingestion/discovery environment.

Konstellation should normally query the Kristal projection, not the raw Wikidata dump.
