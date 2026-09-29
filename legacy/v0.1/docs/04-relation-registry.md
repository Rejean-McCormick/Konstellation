# Relation Registry

## Purpose

The Relation Registry is the semantic bridge between user-facing concepts and backend mappings.

A relation is described once and reused by every lens.

## Example

```json
{
  "id": "birth_place",
  "version": "1.0",
  "label": {
    "fr": "lieu de naissance",
    "en": "place of birth"
  },
  "domain": ["human"],
  "range": ["place"],
  "direction": "outgoing",
  "operators": ["exists", "not_exists", "equals", "not_equals", "in"],
  "mappings": {
    "wikidata": { "property": "P19" },
    "kristalRdf": { "predicate": "urn:koa:relation:birth_place" }
  },
  "ui": {
    "defaultWidget": "entity-picker"
  }
}
```

## Presence versus value

Konstellation must preserve the important distinction between:

```text
HAS relation
```

and:

```text
relation = value
```

For example:

```text
movement exists
```

is different from:

```text
movement = Thomism
```

This distinction is represented by operators (`exists` vs `equals`), not by separate hard-coded widgets.

## Reverse relations

Some navigation requires reverse traversal, e.g. works authored by a person.

The registry may declare:

```json
{
  "id": "authored_work",
  "direction": "incoming",
  "inverseOf": "author",
  "domain": ["human"],
  "range": ["work"]
}
```

The query compiler decides how to express the reverse traversal in SPARQL.

## Registry governance

Changes to relation meaning are versioned.

Adding a UI label is not equivalent to changing relation semantics. Mappings to source-specific properties must remain auditable.
