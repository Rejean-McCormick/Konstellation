# Konstellation documentation

This directory is the **repository documentation index**. Read the [documentation manifest](DOCS-MANIFEST.md) for normative versus explanatory or historical status.

**Current code:** Konstellation `1.0.0-rc.2`. **Qualification:** final `1.0.0` remains pending reproducible dependency installation, the supported Node toolchain, browser E2E, benchmarks, and release checks. The supplied source snapshot does not include `package-lock.json`. [Implementation status](IMPLEMENTATION.md) and [RC validation](VALIDATION-v1.0-RC.md) distinguish implementation from qualification.

**Current optional integration:** [isolated Framework v11 local reader](34-v11-local-reader.md), using a pinned Framework `11.0.0-draft.4` and Integration Pack `0.3.0-alpha.1`, *not* the traditional v6/v10 navigation engine. Review the [October 27 validation record](VALIDATION_V11_LOCAL_PREVIEW_2026-10-27.md). The v11 preview is local-only, opt-in, dataset-level authorized, and not publication-ready.

## Guiding principle

> The Kristal defines what is knowable. A Lens defines the reading angle. Konstellation derives explainable navigation from **visible, authorized** structure; a view never creates canonical truth.

## Architecture and semantics

1. [Decisions and invariants](00-decisions.md)
2. [System architecture](01-architecture.md)
3. [QuerySpec, Lens, reader policy and state](02-query-model.md)
4. [Adaptive navigation](03-navigation.md)
5. [Authority, semantics and projections](04-knowledge-semantics.md)
6. [Execution and Renderer Registry](05-execution.md)
7. [Integrations and external contracts](06-integrations.md)
8. [Adaptive navigation detail](15-adaptive-navigation.md)
9. [Kristal v6 alignment](16-kristal-v6-alignment.md)

## Implementation and operations

- [Current implementation status](IMPLEMENTATION.md)
- [1.0 RC validation](VALIDATION-v1.0-RC.md)
- [Import](IMPORT.md) and [integrations](INTEGRATIONS.md)
- [Operations](OPERATIONS.md), [deployment](22-deployment.md), [security](19-security.md)
- [Public API and contracts](24-api-contracts.md)
- [1.0 release qualification](25-release-1.0.md)
- [Local v10 reader and Manager alpha.14](33-kristal-v10-local-reader.md)
- [Neutral local catalog](LOCAL_SELECTOR_2026-10-16.md)
- [Optional local v11 reader: configuration, boundaries, API](34-v11-local-reader.md)
- [v11 local-preview validation evidence](VALIDATION_V11_LOCAL_PREVIEW_2026-10-27.md)
- [Performance](18-performance-scalability.md), [observability](20-observability.md), [tests and golden corpus](21-testing-golden-corpus.md)
- [Renderer registry](17-renderer-registry.md), [extension guide](23-extension-guide.md)
- [Migration](08-migration.md), [source audit](09-source-audit.md), [validation strategy](10-validation-report.md)
- [1.0 delivery plan](07-delivery-plan.md), [glossary](26-glossary.md)
- [Expected Kristal-family behavior](27-behavior-by-kristal.md), [anti-patterns](28-anti-patterns.md), [reference sequences](29-reference-sequences.md)

## Specialized and historical reference material

- [GitHub-hosted Framework v10 collection model](30-kristal-v10-github.md)
- [My Kristals Manager preview](31-my-kristals-manager-preview.md)
- [Manager + Discovery 3.3](32-manager-discovery-3.3.md)
- [Catho reading paths](35-parcours-locaux-catho.md) and [relation registry correction](36-correctif-registre-relations-catho.md)
- [October 17 French semantic-display patch](37-semantic-display-fr-2026-10-17.md)
- [Astrolabe](11-astrolabe.md), [biblical graph](12-biblical-graph.md), [Playwright](13-playwright.md), [Théophile enrichment](14-theophile-enrichment.md)

Historical reports are retained for traceability. They do **not** override the current code, contracts or validation gates.

## Architectural decisions and role guides

- [ADRs](adr/README.md): ADR-0005 to ADR-0010
- [User guide](guides/USER.md), [integrator guide](guides/INTEGRATOR.md), [developer guide](guides/DEVELOPER.md), [operator guide](guides/OPERATOR.md)
- [Runbooks](runbooks/README.md): startup, rollback, backup, incident, upgrade and threat model

## Documentation maintenance

Update contracts, the implementation-status document, relevant guides, tests and change records when behavior actually changes. Keep qualified release claims separate from experimental local previews. Wiki pages are introductions; repository schemas, tests and the implementation remain the detailed references.
