# Query Model

## QuerySpec

`QuerySpec` is the heart of Konstellation.

Example:

```json
{
  "version": "1.0",
  "root": { "type": "human" },
  "filters": [
    {
      "relation": "lifespan",
      "operator": "overlaps",
      "from": 300,
      "to": 500
    },
    {
      "relation": "field_of_work",
      "operator": "equals",
      "value": "concept:philosophy"
    },
    {
      "relation": "movement",
      "operator": "exists"
    }
  ],
  "sort": [{ "key": "label", "direction": "asc" }],
  "page": { "limit": 50, "cursor": null }
}
```

## Query operations

The initial operator vocabulary should stay small:

- `exists`
- `not_exists`
- `equals`
- `not_equals`
- `in`
- `not_in`
- `overlaps`
- `before`
- `after`
- `contains`

Relations declare which operators they support.

## Query transformations

User actions are pure transformations of QuerySpec:

```text
addFilter(spec, filter) -> spec'
removeFilter(spec, id) -> spec'
replaceValue(spec, filterId, value) -> spec'
pivot(spec, relationId, targetType) -> spec'
clear(spec) -> spec'
```

This makes undo/redo, history, saved searches, testing, and URL serialization straightforward.

## Query compilation

The browser does **not** generate arbitrary SPARQL.

The Query Engine:

1. validates QuerySpec against JSON Schema;
2. resolves relation IDs through the Relation Registry;
3. verifies operator compatibility;
4. builds an internal query plan;
5. compiles parameterized/escaped SPARQL;
6. applies resource limits;
7. executes through the backend adapter;
8. returns ResultSet.

## Stable identity

QuerySpec uses stable semantic IDs such as:

```text
human
birth_place
field_of_work
movement
influenced_by
```

It should not expose source-specific IDs such as `P19` as its public contract.

Source mappings belong in the Relation Registry / projection layer.
