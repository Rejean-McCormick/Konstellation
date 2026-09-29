# ADR-0001 — QuerySpec is the canonical query representation

Status: Accepted

## Decision

All query-capable surfaces serialize to the same versioned `QuerySpec` contract.

## Consequences

- Facets and visual graph editing remain interoperable.
- Saved queries are portable.
- SPARQL remains an implementation detail.
- SA can explain the same query object the engine executed.
