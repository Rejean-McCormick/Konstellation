# ADR-0002 — Kristal remains the epistemic authority

Status: Accepted

## Decision

Konstellation queries a deterministic read projection of Kristal. Query infrastructure does not become an authority store.

## Consequences

Oxigraph may be deleted and rebuilt. Query results must retain references back to authoritative artifacts where required.
