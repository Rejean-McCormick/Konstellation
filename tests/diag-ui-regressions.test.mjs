import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../server/contracts.mjs';
import { loadVisualEncodingBindings } from '../server/navigation/visual-semantics/registry.mjs';
import { loadVisualAttributeBindings } from '../server/navigation/visual-semantics/attributes.mjs';
import { loadHierarchyReviews } from '../server/navigation/visual-semantics/hierarchy.mjs';

test('visual registries remain code-owned and loadable via the canonical project root', () => {
  assert.equal(loadVisualEncodingBindings() instanceof Map, true);
  assert.equal(Array.isArray(loadVisualAttributeBindings()), true);
  assert.equal(Array.isArray(loadHierarchyReviews()), true);
  for (const name of ['visual-semantics.json', 'visual-attributes.json', 'visual-hierarchy-reviews.json']) {
    const source = path.join(ROOT, 'config', name);
    assert.equal(fs.statSync(source).isFile(), true);
  }
});

test('Playwright readiness is anchored to current Explorer heading, not legacy copy', () => {
  const explorer = fs.readFileSync(path.join(ROOT, 'src/components/Explorer.svelte'), 'utf8');
  const fixtures = fs.readFileSync(path.join(ROOT, 'tests/browser/fixtures.mjs'), 'utf8');
  assert.match(explorer, /Explorez la structure des connaissances/);
  assert.match(fixtures, /Explorez la structure des connaissances/);
  assert.doesNotMatch(fixtures, /Suivez le fil des idées/);
  assert.match(fixtures, /expect\.soft\(apiErrors/);
});

test('branded resource exists for both Astro entry points', () => {
  const logo = fs.readFileSync(path.join(ROOT, 'public/brand-logo.svg'), 'utf8');
  assert.match(logo, /<svg/);
  assert.match(logo, /<\/svg>/);
  for (const route of ['src/pages/index.astro', 'src/pages/v11.astro']) {
    assert.match(fs.readFileSync(path.join(ROOT, route), 'utf8'), /\/brand-logo\.svg/);
  }
});

test('keyboard and tree semantics remain explicit', () => {
  const tree = fs.readFileSync(path.join(ROOT, 'src/components/TreeView.svelte'), 'utf8');
  const view = fs.readFileSync(path.join(ROOT, 'src/components/ConstellationView.svelte'), 'utf8');
  assert.match(tree, /aria-selected=\{index === activeIndex\}/);
  assert.match(view, /<svelte:window on:keydown/);
  assert.match(view, /<div class="constellation-portrait-card" role="dialog"/);
});

test('UI Explorer mock implements neutral collection discovery and scoped policy bootstrap', () => {
  const fixture = fs.readFileSync(path.join(ROOT, 'tests/ui/explorer.test.mjs'), 'utf8');
  assert.match(fixture, /case '\/api\/kristals':/);
  assert.match(fixture, /case '\/api\/fleet':/);
  assert.match(fixture, /status: 404/);
  assert.match(fixture, /requestUrl\.pathname/);
  assert.match(fixture, /requestUrl\.searchParams\.get\('readerPolicyRef'\)/);
  assert.match(fixture, /engine\.bootstrap\(lenses, context\)/);
});

test('Explorer refuses missing lenses and awaits a visibly updated policy in its UI regression tests', () => {
  const explorer = fs.readFileSync(path.join(ROOT, 'src/components/Explorer.svelte'), 'utf8');
  const fixture = fs.readFileSync(path.join(ROOT, 'tests/ui/explorer.test.mjs'), 'utf8');
  assert.match(explorer, /if \(!nextLens \|\| !query\)/);
  assert.match(explorer, /Perspective indisponible pour cette politique de lecture/);
  assert.match(fixture, /loadLenses\(engine, path\.join\(ROOT, 'examples', 'lenses'\)\)/);
  assert.match(fixture, /engine\.policies\.get\(research\)\.description/);
  assert.match(fixture, /unknown perspective is refused/);
});
