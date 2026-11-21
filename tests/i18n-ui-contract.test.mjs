import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read=(file)=>readFileSync(path.join(root,file),'utf8');
test('Explorer offers all 14 choices even before login and persists locale only',()=>{
  const s=read('src/components/Explorer.svelte');
  assert.match(s, /<select id="konstellation-language"/);
  assert.match(s, /\{#each LOCALES as language\}/);
  assert.match(s, /localStorage\.setItem\('konstellation\.locale\.v1'/);
  assert.doesNotMatch(s, /localStorage\.setItem\('konstellation\.auth\.token'/);
  assert.match(s, /language-fallback/);
});
test('Astrolabe, projections receive selected locale without touching the authorization',()=>{
  const explorer=read('src/components/Explorer.svelte');
  const astrolabe=read('src/components/Astrolabe.svelte');
  assert.match(explorer, /<Astrolabe \{locale\}/);
  assert.match(explorer, /<AdaptiveProjectionView\s+\{locale\}/);
  assert.match(explorer, /<ConstellationView\s+\{locale\}/);
  assert.match(astrolabe, /export let locale = 'fr'/);
  assert.match(astrolabe, /localizedEntityLabel\(item\.entity,locale\)/);
  assert.match(explorer, /boot\?\.principal/);
});

// Guard against the Windows '/C:/...' file-URL pathname regression.
test('test fixtures resolve by fileURLToPath, never file URL pathname',()=>{
  const self=readFileSync(fileURLToPath(import.meta.url),'utf8');
  assert.match(self,/const root = fileURLToPath\(new URL\('\.\.\/', import\.meta\.url\)\)/);
  assert.doesNotMatch(self,/path\.resolve\(new URL\(/);
  assert.ok(root && read('src/lib/i18n.mjs').includes('LOCALES'));
});

test('French Playwright heading is validated through live i18n dictionary instead of a hard-coded Svelte literal',()=>{
  const regression=read('tests/diag-ui-regressions.test.mjs');
  const explorer=read('src/components/Explorer.svelte');
  assert.match(explorer, /<h1>\{ui\(locale,'introTitle'\)\}/);
  assert.match(regression, /ui\('fr', 'introTitle'\)/);
  assert.doesNotMatch(regression, /assert\.match\(explorer, \/Explorez la structure des connaissances\//);
});
