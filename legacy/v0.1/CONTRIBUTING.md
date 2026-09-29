# Contributing

## Architectural rules

1. Do not hard-code domain-specific relation logic in UI components.
2. Do not expose backend property IDs as public QuerySpec semantics.
3. Do not make Oxigraph an authority store.
4. Do not let SA select factual content.
5. New lenses must validate against the Lens schema.
6. New relations must declare supported operators and mappings.
7. Query compilation must fail closed on unknown semantics.
8. Every query-engine change requires deterministic tests.
