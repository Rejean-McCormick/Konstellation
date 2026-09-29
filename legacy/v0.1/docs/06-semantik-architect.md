# SemantiK Architect Integration

## Role

SemantiK Architect (SA) is the **language realization layer**.

Konstellation decides what structured query was made and what structured results were returned. SA decides how already-selected semantic content is communicated.

## Boundary

```text
QuerySpec + ResultSet
        ↓ deterministic adapter
SemanticGraph + communication obligations
        ↓
CommunicationRequest
        ↓
SemantiK Architect
        ↓
CommunicationResult
```

## Supported initial uses

SA can be invoked to:

- explain the current query;
- summarize a result set;
- verbalize a selected entity card;
- explain why an entity matched filters;
- present provenance/status information;
- generate deterministic multilingual labels/sentences where the SA runtime supports the required realization.

## What SA must not do

SA must not:

- choose which facts are true;
- silently add facts;
- rank entities unless the QuerySpec explicitly supplies an ordering rule;
- broaden the query;
- infer a religious, political, demographic, or intellectual affiliation absent from the structured input.

## Chat-like interaction

A future chat-like surface should be implemented as deterministic QuerySpec transformations, e.g.:

```text
"show his works"
→ pivot current subject through authored_work

"sources"
→ add provenance view

"only before 500"
→ add temporal filter
```

Free-form generative NLP is not required for the core product.
