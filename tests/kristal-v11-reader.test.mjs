import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadV11Config,v11Catalog,v11View,v11Neighborhood} from '../server/integrations/kristal-v11.mjs';
import {requireKristalV11ReadView} from '../server/integrations/kristal-v11-envelope.mjs';
const sha='a'.repeat(64);
const principal={id:'local-user',scopes:['read'],roles:['public']};
const model={profile:'kristal.integration.read-view/v11.0-draft.1',derived_only:true,
  source:{namespace_id:'test',graph_id:'g',framework_version:'11.0.0-draft.4',graph_sha256:sha,registry_sha256:sha,crosswalk_sha256:sha,catalog_sha256:sha},
  requested_locale:'fr-CA',coverage_counts:{direct:0,fallback:1,missing:2},
  presentation:[{kind:'entity',semantic_id:'KQ1',lexical:{status:'fallback',term:'Saint Augustin',effective_locale:'fr',layer_id:'fr'}},
    {kind:'entity',semantic_id:'KQ2',lexical:{status:'missing'}},
    {kind:'property',semantic_id:'KP3',lexical:{status:'missing'}}],
  assertions:[{id:'KA4',subject:'KQ1',predicate:'KP3',object:{kind:'entity',id:'KQ2'},sources:['KS5']}],limits:'test'};
const clone=x=>structuredClone(x);
test('real v11 envelope preserves KQ/KP/KA/KS references and locale fallback',()=>{
  const view=requireKristalV11ReadView(clone(model));
  const result=v11Neighborhood(view,'KQ1');
  assert.equal(result.entity.lexical.status,'fallback');
  assert.equal(result.assertions[0].predicate,'KP3');
  assert.deepEqual(result.assertions[0].sources,['KS5']);
  assert.equal(result.assertions[0].object_presentation.lexical.status,'missing');
});
test('v11 envelope rejects invented labels and external identity substitutions',()=>{
  for(const change of [v=>{v.presentation[1].lexical.term='Guess';},v=>{v.assertions[0].subject='Q1';},
    v=>{v.assertions[0].sources=['Q3'];},v=>{v.coverage_counts.missing=0;},
    v=>{v.source.graph_sha256='changed';},v=>{v.presentation[0].lexical.effective_locale='fr-CA';}]){
    const v=clone(model);change(v);assert.throws(()=>requireKristalV11ReadView(v));
  }
});
test('unavailable readers and hidden entities have non-revealing errors',()=>{
  assert.throws(()=>v11Catalog(null,principal,'local'),e=>e.status===404);
  assert.throws(()=>v11View(null,principal,'local','demo','fr'),e=>e.status===404);
  assert.throws(()=>v11Neighborhood(model,'KQ999'),e=>e.status===404);
  assert.throws(()=>v11Neighborhood(model,'Q1'),e=>e.status===404);
});
test('reader refuses public/shared modes, unknown principals and disallowed locales',()=>{
  const rdr={principals:new Set(['local-user']),datasets:[{id:'a',title:'A',locales:['fr'],inputs:{}}]};
  assert.throws(()=>v11Catalog(rdr,principal,'public'),e=>e.status===404);
  assert.throws(()=>v11Catalog(rdr,{id:'visitor'},'local'),e=>e.status===403);
  assert.throws(()=>v11View(rdr,principal,'local','a','ja'),e=>e.status===404);
  assert.throws(()=>v11View(rdr,principal,'local','unknown','fr'),e=>e.status===404);
});
test('malformed config is rejected prior to any source read',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'knav-v11-'));
  try{
    const file=path.join(dir,'config.json');
    fs.writeFileSync(file,JSON.stringify({profile:'invalid',mode:'local-only'}));
    assert.throws(()=>loadV11Config(file,'local'),e=>e.code==='V11_CONFIG_INVALID');
    assert.throws(()=>loadV11Config(file,'public'),e=>e.code==='V11_CONFIG_INVALID');
    assert.equal(loadV11Config(null,'local'),null);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('real exact-pinned Framework + Integration Pack view is readable (when supplied)',t=>{
  const fw=process.env.KRISTAL_FRAMEWORK_ROOT,pack=process.env.KRISTAL_INTEGRATION_PACK_ROOT;
  if(!fw||!pack){t.skip('Set both KRISTAL_FRAMEWORK_ROOT and KRISTAL_INTEGRATION_PACK_ROOT');return;}
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'knav-v11-real-'));
  try{
    const files={registry:'identity-registry.example.json',graph:'semantic-graph.example.json',crosswalk:'external-crosswalk.example.json',catalog:'dictionaries/catalog.json'};
    const config={profile:'konstellation.v11-local-reader/0.1',mode:'local-only',python:process.env.KRISTAL_PYTHON||'python',
      framework_root:fw,integration_pack_root:pack,principals:['local-user'],
      datasets:[{id:'demonstration',title:'Référence Framework',locales:['fr','fr-CA','en'],...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,path.join(fw,'examples','v11',v)]))}]};
    const file=path.join(dir,'v11.json');fs.writeFileSync(file,JSON.stringify(config));
    const reader=loadV11Config(file,'local');
    assert.equal(v11Catalog(reader,principal,'local').datasets[0].id,'demonstration');
    const view=v11View(reader,principal,'local','demonstration','fr-CA');
    assert.equal(view.publication_authorized,false);
    assert.equal(view.source.framework_version,'11.0.0-draft.4');
    assert.equal(view.presentation.find(x=>x.semantic_id==='KQ1001').lexical.status,'fallback');
    assert.equal(v11Neighborhood(view,'KQ1001').assertions[0].id,'KA3001');
    // Pin tampering is rejected before starting the Framework subprocess.
    const invalid=path.join(dir,'tampered.json');fs.writeFileSync(invalid,JSON.stringify({...config,framework_root:dir}));
    assert.throws(()=>loadV11Config(invalid,'local'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
