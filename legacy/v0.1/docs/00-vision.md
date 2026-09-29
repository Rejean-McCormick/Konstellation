# Vision

## What Konstellation is

Konstellation is a **visual, deterministic query navigator for structured knowledge**.

The interaction may resemble a chatbot because the system can explain the current query and verbalize results, but the user is fundamentally manipulating a query over a graph.

A better mental model is:

> visual query builder + faceted browser + graph navigator + deterministic language realization.

## Why this exists

A large knowledge graph is difficult to explore directly with SPARQL. Most users do not want to know that Wikidata uses `P19` for place of birth or that a Kristal projection has a particular RDF predicate. They want to ask through visible concepts such as:

- period;
- place of birth;
- occupation;
- field of work;
- movement;
- religious tradition;
- educated at;
- influenced by;
- author of;
- member of;
- source / provenance.

Konstellation exposes these dimensions through a configurable **Query Lens**.

## What Konstellation is not

Konstellation is not:

- an LLM;
- a generative answer engine;
- a second epistemic authority;
- a replacement for Kristal;
- a Wikidata fork;
- a hard-coded Catholic or philosophy browser;
- a free-form SPARQL endpoint exposed directly to the browser.

## Product promise

A user should be able to:

1. choose a mode of exploration;
2. narrow an entity population with visible filters;
3. inspect why an entity matched;
4. pivot across declared relations;
5. see provenance and epistemic state when available;
6. save/share the query itself;
7. receive a deterministic natural-language rendering of the same structured result.

## First vertical slice

The first useful slice is **Catholic intellectual history** because it exercises:

- people;
- chronology;
- works;
- places;
- institutions;
- traditions and movements;
- influence relations;
- sources and provenance;
- Kristal epistemic state;
- SA verbalization.

The system is considered architecturally sound only if the same engine can load a very different lens, such as sociodemographic exploration, without adding domain-specific UI branches.
