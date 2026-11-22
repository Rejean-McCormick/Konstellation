import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, ui as uiBase } from '../src/lib/i18n.mjs';
import { UI_FINISH, uiFinish, localizedRecipeLabel, RECIPE_KEYS,
  assertionStatusLabel, localizedCapabilityLabel } from '../src/lib/i18n-finish.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('same 14 Spek/diK language codes; all V4 UI labels exist in every locale', () => {
  assert.deepEqual(LOCALES, ['en','fr','es','de','nl','sv','da','no','nn','fi','et','af','it','pt']);
  assert.deepEqual(Object.keys(UI_FINISH).sort(), [...LOCALES].sort());
  const base = Object.keys(UI_FINISH.fr).sort();
  assert.ok(base.length >= 100);
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(UI_FINISH[locale]).sort(), base);
    for (const key of base) {
      assert.equal(typeof uiFinish(locale,key), 'string');
      assert.ok(uiFinish(locale,key).trim());
    }
  }
});

test('French existing V3 labels unchanged; Spanish finishes missing controls', () => {
  assert.equal(uiFinish('fr','introTitle'), uiBase('fr','introTitle'));
  assert.equal(uiFinish('fr','visibleAssertions'), 'Assertions visibles');
  assert.equal(uiFinish('es','visibleAssertions'), 'Afirmaciones visibles');
  assert.equal(uiFinish('es','present'), 'con datos');
  assert.equal(uiFinish('es','missing'), 'ausentes de esta vista');
  assert.equal(uiFinish('es','communicationTitle'), 'Explicar esta exploración');
  assert.equal(uiFinish('es','connected'), 'Conectado');
  assert.equal(uiFinish('es','recipeTimeline'), 'Cronología');
});

test('recipe presentation is translated only when its canonical known label is present', () => {
  assert.deepEqual(Object.keys(RECIPE_KEYS).sort(), [
    'catalogue','table','constellation','timeline','hierarchy','dependencies','path','feedback','proofs',
    'arguments','dimensions','states','evolution','divergences','traceability','action-context','multiscale','spatial'
  ].sort());
  assert.equal(localizedRecipeLabel({ id:'timeline',label:'Chronologie' },'es'),'Cronología');
  assert.equal(localizedRecipeLabel({ id:'catalogue',label:'Liste' },'en'),'List');
  assert.equal(localizedRecipeLabel({ id:'timeline',label:'A reader-provided name' },'es'),'A reader-provided name');
  assert.equal(localizedRecipeLabel({ id:'unknown',label:'Source term' },'es'),'Source term');
  assert.equal(localizedCapabilityLabel('temporal','es'),'Cronología');
  assert.equal(localizedCapabilityLabel('unknown','es'),'');
});

test('status terms are presentation-only; unknown status is never fabricated',()=>{
  assert.equal(assertionStatusLabel('sourced','es'),'Con fuentes');
  assert.equal(assertionStatusLabel('disputed','en'),'Disputed');
  assert.equal(assertionStatusLabel('custom','en','Unknown legacy status'),'Unknown legacy status');
  assert.equal(assertionStatusLabel('custom','en'),'custom');
});

test('Explorer stays wired to locale, no principal ID or assertion-source rewrite',()=>{
  const e=read('src/components/Explorer.svelte');
  assert.match(e,/uiFinish as ui/);
  assert.match(e,/localizedRecipeLabel\(item,locale\)/);
  assert.match(e,/assertionStatusLabel, localizedCapabilityLabel/);
  assert.match(e,/ui\(locale,'present'\)/);
  assert.match(e,/ui\(locale,'missing'\)/);
  assert.match(e,/assertionStatusLabel\(a\.payload\.status,locale/);
  assert.match(e,/boot\?\.principal \? ui\(locale,'connected'\)/);
  assert.doesNotMatch(e,/\{boot\?\.principal\?\.id \|\|/);
  assert.match(e,/localizedLabel\(r\.label,locale\)/);
  assert.match(e,/ui\(locale,'introTitle'\)/);
  assert.match(e,/src="\/brand-logo\.svg"/);
});

test('nested panel, Astrolabe, projection, constellation and query tree read the same UI locale',()=>{
  const e=read('src/components/Explorer.svelte');
  assert.match(e,/<Communication\s+uiLocale=\{locale\}/);
  assert.match(e,/<QueryTree \{locale\}/);
  const comm=read('src/components/Communication.svelte');
  assert.match(comm,/export let uiLocale = 'fr'/);
  assert.match(comm,/ui\(uiLocale,'communicationTitle'\)/);
  assert.match(comm,/language = 'fr'/); // semantic language remains independent
  const q=read('src/components/QueryTree.svelte');
  assert.match(q,/<svelte:self \{locale\}/);
  assert.match(q,/localizedLabel\(registry\.find/);
  for (const file of ['Astrolabe','AdaptiveProjectionView','ConstellationView']) {
    assert.match(read('src/components/'+file+'.svelte'),/uiFinish as ui/);
  }
});

test('view label fix retains readable text in compact width, scrolling rather than hiding',()=>{
  const css=read('src/styles/global.css');
  assert.match(css,/konstellation-v4-view-labels/);
  assert.match(css,/\.view-switch\.adaptive-switch > button > span \{ display: inline; \}/);
  assert.match(css,/overflow-x: auto/);
});


test('multilingual field controls retain explicit accessible labels and UI tests assert translated commands',()=>{
  for (const locale of LOCALES) {
    for (const key of ['constellationSatellitesAria','fromYearAria','toYearAria']) {
      assert.ok(uiFinish(locale,key).trim().length > 4, `Accessibility label ${locale}/${key}`);
    }
  }
  assert.equal(uiFinish('fr','constellationSatellitesAria'),'Nombre maximal de satellites');
  assert.equal(uiFinish('fr','fromYearAria'),'Année de début');
  assert.equal(uiFinish('fr','toYearAria'),'Année de fin');
  const explorer=read('src/components/Explorer.svelte');
  assert.match(explorer,/aria-label=\{ui\(locale,'fromYearAria'\)\}/);
  assert.match(explorer,/aria-label=\{ui\(locale,'toYearAria'\)\}/);
  const constellation=read('src/components/ConstellationView.svelte');
  assert.match(constellation,/aria-label=\{ui\(locale,'constellationSatellitesAria'\)\}/);
  const tests=read('tests/ui/explorer.test.mjs');
  assert.match(tests,/uiFinish\('fr','constellationSatellitesAria'\)/);
  assert.match(tests,/uiFinish\('fr','communicationExport'\)/);
});
