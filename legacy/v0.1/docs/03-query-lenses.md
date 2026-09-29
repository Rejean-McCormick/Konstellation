# Query Lenses

## Definition

A Query Lens defines **how a population can be explored**.

It does not contain factual assertions.

Example lenses:

```text
intellectual-history
catholic-intellectual-history
sociodemography
scientists
artists
literature
political-history
```

## Responsibilities

A lens may declare:

- starting entity type;
- visible relations;
- grouping/order of facets;
- widget hints;
- default filters;
- result columns/cards;
- allowed pivots;
- graph-view presets;
- SA narrative presets.

## Non-responsibilities

A lens must not:

- assert that an entity belongs to a group;
- override Kristal epistemic state;
- manufacture missing relations;
- embed business logic such as `if entity == Augustine`;
- encode source-specific query syntax.

## Example

```json
{
  "id": "intellectual-history",
  "version": "1.0",
  "label": {
    "fr": "Histoire intellectuelle",
    "en": "Intellectual history"
  },
  "rootType": "human",
  "facets": [
    { "relation": "lifespan", "widget": "range" },
    { "relation": "occupation", "widget": "multi-select" },
    { "relation": "field_of_work", "widget": "entity-picker" },
    { "relation": "movement", "widget": "entity-picker" },
    { "relation": "religious_tradition", "widget": "entity-picker" },
    { "relation": "educated_at", "widget": "entity-picker" },
    { "relation": "influenced_by", "widget": "entity-picker" }
  ]
}
```

## User-defined lenses

Long term, the Lens Editor can itself be declarative:

1. choose root entity type;
2. select relations from Relation Registry;
3. choose display widgets;
4. choose default views;
5. save as JSON.

The engine should be able to load a new valid lens without recompilation.
