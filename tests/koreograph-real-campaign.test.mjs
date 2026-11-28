import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseOptions,runCampaign,makeApi} from '../scripts/koreograph-qualify-real.mjs';
import {DEMO_SOURCE,DEMO_START,demoResolve} from '../src/lib/koreograph/demo-data.mjs';
const fixture=JSON.parse(await fs.readFile(new URL('../docs/koreograph/examples/specialized/hierarchy.json',import.meta.url),'utf8'));
const context=Object.fromEntries(Object.entries(DEMO_SOURCE).filter(([k])=>k!=='lensRef'));
const ids=['conscience','identite','perception','attention','experience','memoire','langage','contexte'].map(x=>'demo:'+x);
const base=[...ids,...fixture.nodes.map(x=>x.id)];
const opts=parseOptions(['--catalogue-prive','--out','x','--max-kristals','1','--max-lenses','1','--api-only']);
// Mock transport only. Actual API and Ajv are deliberately not claimed by this test.
const api=async(ep,k,p,extra)=>{
 if(ep==='/api/kristals')return {selectable:true,items:[{id:'private-secret-id',available:true}]};
 if(ep.startsWith('/api/bootstrap')){const restricted=ep.includes('restricted');return {koreographAvailable:true,kristal:k,synthetic:false,principal:{id:'local'},context:{...context,readerPolicyRef:restricted?'restricted':context.readerPolicyRef},entities:[...base,...(!restricted?['SECRET-HIDDEN']:[])].map(id=>({id,type:'demo'})),lenses:[{id:DEMO_SOURCE.lensRef,rootType:'demo'}],policies:[{ref:context.readerPolicyRef},{ref:'restricted'}]};}
 if(ep==='/api/query')return {context:p.query.context,rows:[{entityId:DEMO_START.focus.id}]};
 if(ep==='/api/navigation/plan')return {lensRef:DEMO_SOURCE.lensRef,entityType:'demo',views:[{id:'hierarchy',rendererId:'tree'}]};
 if(ep==='/api/navigation/project')return fixture;
 if(ep==='/api/constellation'){if(extra?.expectRefusal)return 404;return {...await demoResolve({focus:p.focus,groupId:p.groupId}),context:p.context};}
 throw Error('unexpected endpoint');
};
const run=(options=opts,transport=api)=>runCampaign(options,{api:transport,validate:()=>{},runtime:()=>{throw Error('unexpected runtime')}});
test('real qualification orchestrator covers two policies and both families; no label or raw identifiers in report',async()=>{const r=await run();assert.equal(r.summary.cases,4);assert.equal(r.summary.fail,0);assert.equal(r.summary.policyPass,1);assert.equal(r.state,'review');assert(!JSON.stringify(r).includes('private-secret-id'));assert(!JSON.stringify(r).includes('SECRET-HIDDEN'));assert(!JSON.stringify(r).includes('Bibliothèque fictive'));assert(r.cases.filter(c=>c.kind==='orbital').every(c=>c.modes.includes('capture')));});
test('hidden projected entity and false refusal both fail the campaign',async()=>{const r=await run(opts,async(...a)=>a[0]==='/api/navigation/project'?{...fixture,nodes:[...fixture.nodes,{id:'hidden-not-visible',type:'demo',label:'hidden'}]}:api(...a));assert.equal(r.summary.fail,2);assert.equal(r.state,'fail');const x=await run(opts,async(...a)=>a[3]?.expectRefusal?200:api(...a));assert.equal(x.summary.policyFail,1);assert.equal(x.state,'fail');});
test('case budget cannot silently promote incomplete results',async()=>{const r=await run({...opts,'max-cases':1});assert.equal(r.summary.cases,1);assert(r.limitsHit.includes('cases'));assert.equal(r.state,'review');});
test('real campaign refuses remote origins, implicit consent and non-read endpoints',async()=>{assert.throws(()=>parseOptions(['--catalogue-prive','--out','x','--base','https://example.com']));assert.throws(()=>parseOptions(['--out','x']));const transport=makeApi('http://127.0.0.1:4321','',async(url,init)=>{assert.equal(init.redirect,'error');return new Response(JSON.stringify({ok:true}));});assert.deepEqual(await transport('/api/kristals'),{ok:true});await assert.rejects(transport('/api/kompiler/run'),/KQ-ENDPOINT/);});
