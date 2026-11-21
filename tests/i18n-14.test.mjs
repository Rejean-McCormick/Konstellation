import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, UI, LANGUAGE_NAMES, ui, normalizeLocale, localizedLabel, hasLocalizedLabel, localizedEntityLabel, UI_TRANSLATIONS_STATUS, SOURCE_TRANSLATIONS_STATUS } from '../src/lib/i18n.mjs';
const required=['en','fr','es','de','nl','sv','da','no','nn','fi','et','af','it','pt'];
test('14 locales exactly match Spek and diK pinned code lists, including no and nn distinctly', () => {
  assert.deepEqual(LOCALES, required);
  assert.equal(new Set(LOCALES).size, 14);
  assert.equal(Object.keys(UI).length, 14);
  assert.equal(UI_TRANSLATIONS_STATUS,'EDITORIAL_UI_UNREVIEWED');
  assert.equal(SOURCE_TRANSLATIONS_STATUS,'ONLY_SUPPLIED_REALIZATIONS');
});
test('every locale has 52 editorial UI keys and language name',()=>{
  const keys=Object.keys(UI.fr);
  assert.equal(keys.length,52);
  for(const l of LOCALES){
    assert.equal(Object.keys(UI[l]).length,52,l);
    assert.ok(LANGUAGE_NAMES[l],l);
    for(const key of keys) assert.ok(typeof ui(l,key)==='string' && ui(l,key).trim(), `${l}:${key}`);
  }
});
test('invalid or malicious locale values fall back strictly to French',()=>{
  for(const x of ['', null,undefined,'zz','en-US','__proto__','toString','fr<script>']){
    assert.equal(normalizeLocale(x),'fr'); assert.equal(ui(x,'explorer'),UI.fr.explorer);
  }
});
test('source labels use only supplied realizations and never translate IDs',()=>{
  const labels={fr:'Hypatie',en:'Hypatia'};
  assert.equal(localizedLabel(labels,'en'),'Hypatia');
  assert.equal(localizedLabel(labels,'es'),'Hypatie');
  assert.equal(hasLocalizedLabel(labels,'en'),true);
  assert.equal(hasLocalizedLabel(labels,'es'),false);
  assert.equal(localizedLabel('Augustin','fi'),'Augustin');
  assert.equal(localizedLabel({fr:'Sourcé'},'pt'),'Sourcé');
  assert.equal(localizedLabel({it:'Italiano'},'en'),'');
  const entity={id:'P001',label:'Hypatie',labels};
  assert.equal(localizedEntityLabel(entity,'en'),'Hypatia');
  assert.equal(localizedEntityLabel(entity,'es'),'Hypatie');
  assert.equal(entity.id,'P001');assert.equal(entity.label,'Hypatie');
});
test('UI text is independent from auth or reading policy (no semantic rewriting)',()=>{
  const before={id:'K:123',context:{readerPolicyRef:'sha256:aa'},assertions:[{id:'A1',relation:'is_a'}]};
  for(const lang of LOCALES)ui(lang,'explorer');
  assert.deepEqual(before,{id:'K:123',context:{readerPolicyRef:'sha256:aa'},assertions:[{id:'A1',relation:'is_a'}]});
});
