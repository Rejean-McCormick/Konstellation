# Authority and Integration Boundaries

## Kristal

Owns epistemic structured state and its lifecycle.

Konstellation reads a projection; it does not mutate Kristal authority through ordinary query interaction.

## Da'at

Upstream transformation/bridge responsible for preparing knowledge for Kristal according to the kOA/Kristal contracts.

Konstellation is not an ingestion authority.

## SemantiK Architect

Owns deterministic articulation/realization of structured communication requests.

It does not select the factual content of an answer.

## Interaction Kernel

Used at explicit cross-component contract boundaries where an IK profile is appropriate.

Do not route every browser state transition through IK. UI state is local application state.

## UCKK Médiathèque

Media/work/catalog authority remains separate. Konstellation may expose links and projections but must not duplicate authoritative media catalog semantics into its own contracts.

## Oxigraph

Read/query infrastructure only. It is rebuildable and disposable.

## Query Lens / Relation Registry

Presentation and query semantics, not knowledge authority.
