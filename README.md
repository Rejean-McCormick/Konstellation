# Konstellation

**Adaptive, domain-independent navigation for Kristal knowledge.** Konstellation derives explainable views from authorized read surfaces; it does not alter a Kristal's canonical state or turn a presentation into semantic authority.

**Repository version:** `1.0.0-rc.2` (`package.json`). **Final `1.0.0` has not been qualified.** The current source snapshot includes three distinct reading paths: the neutral local selector and experimental v9/v10 reader, established v6/normalized-pack integrations, and an **optional, isolated Framework v11 local preview** at `/v11`. None of these paths implies public publication, certification, or automatic cross-version conversion.

## Start on Windows: neutral local selection

1. Install **Node.js 24.15.0 or newer** and npm. Back up existing files before updating a working installation.
2. Set `directory` in `config/local-catalog.json` to the parent of your authorized Kristal workspaces. The supplied example uses `C:/mycode/Kristal/locals`.
3. Double-click **`Konstellation.cmd`** from the repository root, then open <http://127.0.0.1:4321>.
4. Choose an entry under **My Kristals** and open it in Explorer. Only the selected workspace is read; the launcher does not silently select Théophile or Catho.

The launcher selects `config/local-catalog.json`, binds to loopback, installs npm dependencies with `npm install` **if `node_modules` is absent**, runs `npm run build`, and starts the server. Because installation can change a working tree or generate a lockfile, use a backed-up checkout and do not mistake a locally generated lockfile for a qualified release lockfile. The repository's supplied snapshot does **not** include `package-lock.json`.

For the reproducible release procedure, a **verified, committed `package-lock.json` matching `package.json`** must already be available:

```powershell
npm ci
npm run build
npm start
```

Do not run `npm ci` against this snapshot alone; it will fail without the lockfile. Never fabricate a release lockfile to bypass qualification. See [Windows installation](docs/README.md) and [release gates](docs/25-release-1.0.md).

### Local Kristal v10 path (experimental)

The neutral catalog uses `kristal-local-catalog-v10` and, after explicit selection, `kristal-local-v10`. It reads Framework v9 semantic-state structures retained by the **Framework v10 `10.0.0-draft.3.2`** architecture. A configured `node-edge-json/1` derived read model may expose named `kind` perspectives, provenance and relationships; without it, the reader can show technical topology rather than a complete domain-specific decoder. Labels and UI ordering are **display preferences**, not canonical identities or validations.

The provided `config/active-reader.json` is a **direct Catho reader configuration**, not the neutral launcher default. `config/local-catalog.json` is the neutral catalog source. For the Catho example, keep the workspace at `C:\mycode\Kristal\locals\A-Kristal-Catho`: **do not move or rewrite its `canon/`, `state/` or `derived/`**. See [local v10 reader](docs/33-kristal-v10-local-reader.md), [local selection](docs/LOCAL_SELECTOR_2026-10-16.md) and [Catho perspectives](docs/35-parcours-locaux-catho.md).

### Framework v11 local preview (separate, opt-in)

**Status: implemented in this snapshot, local-only, experimental and unqualified.** The `/v11` page uses `server/integrations/kristal-v11.mjs` and the external **Kristal Integration Pack `0.3.0-alpha.1`** against exactly pinned **Kristal Framework `11.0.0-draft.4`** source files. It does **not** route through the v6/v10 engine or migrate v9/v10 states.

The reader is disabled unless you explicitly configure `KONSTELLATION_V11_CONFIG` with a **private absolute path** to a configuration based on `config/v11-reader.local.example.json`. This config names the Framework and Integration Pack directories, read-only inputs, allowed datasets/locales, and local principal allowlist. Python **3.11+** with `jsonschema` and the exact pinned external components are also required. The source archives for those two external repositories are **not included in this Konstellation snapshot**.

```powershell
$env:KONSTELLATION_DEPLOYMENT_PROFILE = 'local'
$env:KONSTELLATION_V11_CONFIG = 'C:\private\v11-reader.local.json'
$env:KONSTELLATION_ALLOWED_HOSTS = 'localhost,127.0.0.1,[::1]'
# With verified dependencies and the matching committed lockfile available:
npm ci
npm run build
npm start
# Open http://127.0.0.1:4321/v11
```

The v11 route presents KQ/KP/KA/KS references, validated derived assertions and source references, and explicit lexical `direct` / `fallback` / `missing` states. It is **not a per-assertion authorization reader**: a listed principal may read the **whole configured dataset**. Do not register sensitive datasets unless every allowlisted local principal is authorized to see all their content. `lan`, `shared` and `public` modes are refused, and no C1/C2 qualification or publication rights are inferred. Disable by removing `KONSTELLATION_V11_CONFIG` and restarting the server. See [v11 setup and limits](docs/34-v11-local-reader.md) and [v11 validation record](docs/VALIDATION_V11_LOCAL_PREVIEW_2026-10-27.md).

## Navigation architecture

```text
Authorized Kristal v6/v9-derived/v10 or normalized read surfaces
  -> Reader Policy and visible structure
  -> QuerySpec / Lens / ResultSet / Focus
  -> Navigation affordances -> NavigationPlan 1.0
  -> bounded projection -> controlled renderer -> Astro/Svelte Explorer

Separate, explicitly configured Framework v11 / Integration Pack
  -> exact source pins and local principal + dataset allowlist
  -> derived v11 view -> /v11 UI and /api/v11/*
  (NOT a v6/v10 conversion or a Reader Policy equivalent)
```

Renderers for the main engine include constellation, list/table, timeline-lineage, tree, dag-proof, flow-path, causal-feedback, matrix-profile, state-flow, traceability, multiscale-layer and spatial projections. Domain examples do not redefine the general-purpose contracts.

## Checks and release qualification

```bash
node --test tests/kristal-v11-reader.test.mjs
python tools/validate.py
npm test
npm run test:ui
npm run build
npm run test:e2e
npm run benchmark -- --full
npm run release:preflight
npm run release:check
```

The first v11 test runs isolated checks but **skips the real Framework + Pack integration** unless `KRISTAL_FRAMEWORK_ROOT` and `KRISTAL_INTEGRATION_PACK_ROOT` point to matching checkouts. The source validation record reports targeted successes, **not** a full qualified release. At the time of the source snapshot, the release lockfile, full supported-Node build, and Playwright qualification had not been demonstrated; **do not tag `1.0.0`** based on these docs alone.

## Deployment and trust boundaries

| Profile | Purpose |
| --- | --- |
| `local` | Loopback single-operator use; explicit local readers, optional v11 allowlist |
| `lan` | Network access subject to configured authentication; v11/local-file reading unavailable |
| `shared` | Authentication, roles/scopes, audit and rate limits; v11 unavailable |
| `public` | Strict CSP and gateway protections; v11 unavailable |

Read [security](docs/19-security.md) and [deployment](docs/22-deployment.md) before exposing a server outside loopback.

## Repository structure and documentation

| Directory | Purpose |
| --- | --- |
| `src/` | Astro/Svelte UI, Explorer and separate v11 page |
| `server/` | API, core engine, integrations and navigation |
| `contracts/` | JSON Schemas and upstream contract snapshots |
| `config/` | Local reader and v11 configuration example |
| `tests/` | Unit, integration, UI and browser tests |
| `scripts/`, `tools/` | Validation, setup and release checks |
| `docs/` | Current and historical implementation, guides and ADRs |
| `data/` | Demonstration datasets, not a universal Kristal model |

Start with the [documentation index](docs/README.md). The English wiki is distributed separately as the local `Konstellation.wiki` checkout; no remote wiki publication is implied by this source snapshot.
