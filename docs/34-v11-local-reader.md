# Optional Framework v11 local reader (Konstellation `1.0.0-rc.2`)

## Status and isolation

**Implemented in this snapshot; opt-in, local-only, experimental, and not release-qualified.** The `/v11` page and `/api/v11/*` endpoints are backed by `server/integrations/kristal-v11.mjs` rather than the older v6/v10 engine. No v6/v9/v10 migration, canon rewrite, remote synchronization, public publication or implicit semantic authority is performed.

The separate reader relies on **Kristal Integration Pack `0.3.0-alpha.1`** and the exactly pinned **Kristal Framework `11.0.0-draft.4`**. On configuration load, it verifies the external integration script SHA-256, the Framework pin manifest SHA-256 and the 13 Framework files referenced by that manifest. On every view request the pack's Python integration performs its own validation and dictionary-layer checks. The returned derived envelope is checked in `server/integrations/kristal-v11-envelope.mjs`.

**Crucial authorization boundary:** the derived v11 view lacks independently verifiable per-assertion access labels. A principal in the v11 allowlist can access the **entire configured dataset**. Register no private dataset unless *every* allowed principal is entitled to see its whole contents. The reader rejects `lan`, `shared` and `public` deployment profiles. C1/C2 qualification, hosted publication and fine-grained Reader Policy remain outside this preview.

## Windows setup

1. Use Node.js **>=24.15.0**, Python **>=3.11** with the `jsonschema` package, and a backed-up Konstellation checkout.
2. Obtain the **exact matching revisions** of Framework `11.0.0-draft.4` and Integration Pack `0.3.0-alpha.1`. Paths in the example configuration are placeholders, not verified installations. No third-party repo is bundled in this Konstellation snapshot.
3. Copy `config/v11-reader.local.example.json` to a **private JSON path outside Git**. Configure absolute `framework_root` and `integration_pack_root`; list explicit allowed `principals` and `datasets`. Each dataset supplies absolute `registry`, `graph`, `crosswalk`, `catalog` paths and an explicit `locales` list.
4. Make sure the selected local principal (default `local-user`, configured by `KONSTELLATION_LOCAL_PRINCIPAL`) is allowed to see **all** bytes in each configured dataset. The v11 reader never accepts file paths from an HTTP request.
5. Restore the **matching, committed and qualified** `package-lock.json` for `package.json` before running `npm ci`. This source ZIP does not include one; do not invent a lockfile and treat it as release evidence.
6. Run:

```powershell
$env:KONSTELLATION_DEPLOYMENT_PROFILE = 'local'
$env:KONSTELLATION_V11_CONFIG = 'C:\private\v11-reader.local.json'
$env:KONSTELLATION_ALLOWED_HOSTS = 'localhost,127.0.0.1,[::1]'
# Only when the verified matching package-lock.json is present:
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4321/v11`. The UI lists configured datasets and locales. For each selected entity it shows KQ/KP/KA/KS references and the assertions, sources, qualifiers and literal values available in the validated derived view. Lexical status is `direct`, `fallback` or `missing`; unknown terms are **not guessed**. The UI's own labels are currently French, while this documentation is English.

Disable the reader by clearing `KONSTELLATION_V11_CONFIG` and restarting. No reverse migration is necessary.

## Routes (read scope plus local allowlist required)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v11/catalog` | Dataset IDs, titles and allowed locale names; omits private paths |
| GET | `/api/v11/view?dataset=framework-demo&locale=fr-CA` | Validated, derived v11 dataset view; includes source SHA references and lexical coverage |
| GET | `/api/v11/neighborhood?dataset=framework-demo&locale=fr-CA&id=KQ1001` | An entity's neighborhood with KQ/KP/KA/KS references |

Routes return `404` when the reader is not configured or a dataset/locale/entity is unavailable; a principal outside the explicit local allowlist receives `403`. Bad Python validation responses do not reveal private subprocess details. Source files are revalidated/read on requests and remain unchanged. These APIs are **not equivalent to the v6/v10 Reader Policy APIs**.

## Verification and limits

```bash
node --test tests/kristal-v11-reader.test.mjs
python tools/validate.py
node scripts/check-svelte-structure.mjs
node scripts/check-frontend-security.mjs
node scripts/check-docs.mjs
```

The test `tests/kristal-v11-reader.test.mjs` has an optional real-external-repos case. Set `KRISTAL_FRAMEWORK_ROOT` and `KRISTAL_INTEGRATION_PACK_ROOT` to **matching pinned checkouts**, optionally `KRISTAL_PYTHON`, to enable it. Without them, that test is explicitly **skipped**, not passed.

The dated [v11 local validation report](VALIDATION_V11_LOCAL_PREVIEW_2026-10-27.md) records successful targeted checks with external checkouts, but the original environment had Node 22.16.0 and lacked the release lockfile, installed npm dependencies, a full Astro/Playwright build and production authorization/scale tests. The source archive alone cannot revalidate the external pin set. Final `1.0.0` qualification has **not** been established.

## Preserved invariants

- Internal semantic IDs KQ/KP/KA/KS remain distinct from accepted external Wikidata `Q…`/`P…` exact matches.
- Display labels and localization fallback do not certify assertions or add semantic facts.
- Framework and source media remain outside Konstellation; source bytes are not rewritten.
- v6, v10, Catho, Kompiler and the existing Explorer remain separate and unchanged.
- No implicit C1/C2 approval, hosted activation, or automatic dataset authorization.
