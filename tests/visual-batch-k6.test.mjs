import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validatePins,rankCandidates,makeSecondPass,renderPrivateDiagnosticSvg,runK6 } from '../tools/visual-semantics/k6-core.mjs';

const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const fixture={schema_version:'6.0',artifact_type:'kristal_state',assertions:[
  {assertion_id:'demo:1',statement:{predicate:'demo.child_of',object:{kind:'referent',value:'demo:B'}},evidence_refs:['demo:source:1'],valuations:[]},
  {assertion_id:'demo:2',statement:{predicate:'demo.weather_score',object:{kind:'string',value:'high'}},
    evidence_refs:[],valuations:[{dimension:'demo:rain',value_semantics:'ordinal',value_state:'known',value:'high'}]},
]};
const makePins=(bytes,profile='native-v6')=>({format:'konstellation.k6-source-pins/0.1',status:'PRIVATE_CANDIDATE_INVENTORY_NOT_AUTHORIZED',snapshot:{name:'demo.zip',sha256:sha('zip-demo')},entries:[
  {slug:'demo',profile,path:profile==='native-v6'?'kristals/demo/canon/domain/source.json':null,sha256:profile==='native-v6'?sha(bytes):null},
  {slug:'other',profile:'requires-adapter',path:null,sha256:null}
]});
function env() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'k6-test-'));
  const repo=path.join(root,'repo'),collection=path.join(root,'collection'),out=path.join(root,'private');
  fs.mkdirSync(repo);fs.mkdirSync(collection);
  const raw=Buffer.from(JSON.stringify(fixture));const filename=path.join(collection,'kristals/demo/canon/domain/source.json');
  fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,raw);
  const pins=path.join(root,'pins.json');fs.writeFileSync(pins,JSON.stringify(makePins(raw)));
  return {root,repo,collection,out,pins,raw,filename,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}

test('pins are strict, duplicate, unknown and traversal entries fail closed',()=>{
  const b=Buffer.from('demo'),v=makePins(b);
  assert.equal(validatePins(v).entries.length,2);
  for(const copy of [
    {...v,entries:[...v.entries,v.entries[0]]},
    {...v,entries:[{...v.entries[0],path:'kristals/demo/canon/domain/../x.json'}]},
    {...v,entries:[{...v.entries[0],sha256:'invalid'}]},
    {...v,entries:[{...v.entries[0],path:'kristals/other/canon/domain/x.json'}]},
    {...v,entries:[{...v.entries[0],approved:true}]},
  ])assert.throws(()=>validatePins(copy));
});

test('two passes inventory real shape, queue and clearly nonsemantic diagnostics',()=>{
 const e=env();try {
  const a=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out});
  assert.equal(a.summary.status,'PASSED_NATIVE_PASSES_ADAPTERS_PENDING');
  assert.equal(a.summary.auditedNativeStates,1);assert.equal(a.summary.assertionsAudited,2);
  assert.equal(a.summary.missingAdapters,1);assert.equal(a.summary.refused,0);
  assert.equal(a.summary.notApproved,true);assert.equal(a.summary.notPolicyFiltered,true);
  const wb=fs.readFileSync(path.join(a.runDir,'REVIEW_WORKBENCH.html'),'utf8');
  assert.match(wb,/NON filtrée/);assert.match(wb,/private-diagrams\/demo.svg/);
  const p1=JSON.parse(fs.readFileSync(path.join(a.runDir,'pass1/demo.json')));
  const p2=JSON.parse(fs.readFileSync(path.join(a.runDir,'pass2/demo.json')));
  assert.equal(p1.assertionCount,2);assert.equal(p1.knownScalarValuationCount,0);
  const rel=p2.candidateRelations.find(x=>x.relationId==='demo.child_of');
  assert.ok(rel.candidateGroups.includes('REFERENT_GRAPH_CANDIDATE'));
  assert.equal(rel.qualification,'NOT_REVIEWED_NOT_POLICY_FILTERED');
  assert.ok(p2.candidateRelations.some(x=>x.candidateGroups.includes('ORDINAL_NOT_SCALAR')));
  const svg=fs.readFileSync(path.join(a.runDir,'private-diagrams/demo.svg'),'utf8');
  assert.match(svg,/SOURCE NON FILTRÉE/);assert.match(svg,/barres = comptages uniquement/);
  assert.doesNotMatch(svg,/<script|<foreignObject/i);
  const second=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out});
  assert.equal(second.cachedPass1,1);assert.equal(second.runDir,a.runDir);
 }finally{e.close()}
});

test('source mismatch does not emit any fake assertion or diagram',()=>{
 const e=env();try {
  fs.writeFileSync(e.filename,'{"schema_version":"6.0","assertions":[]}');
  const a=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out});
  assert.equal(a.summary.status,'PARTIAL_REFUSED_INPUTS');assert.equal(a.summary.refused,1);
  assert.equal(a.summary.auditedNativeStates,0);assert.equal(a.summary.items[0].reason,'SOURCE_PIN_SHA256_MISMATCH');
  assert.ok(!fs.existsSync(path.join(a.runDir,'private-diagrams/demo.svg')));
 }finally{e.close()}
});

test('explicit symlink input and output inside repository or collection are rejected',()=>{
 const e=env();try {
  assert.throws(()=>runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:path.join(e.repo,'out')}),/OUTPUT_MUST/);
  assert.throws(()=>runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:path.join(e.collection,'out')}),/OUTPUT_MUST/);
  fs.unlinkSync(e.filename);
  try {fs.symlinkSync(e.pins,e.filename);}catch{ return; }
  const a=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out});
  assert.equal(a.summary.items[0].reason,'SYMLINK_SOURCE_REFUSED');
 }finally{e.close()}
});

test('diagnostic SVG escapes predicate names and has a finite bound',()=>{
 const audit={source:{sha256:sha('demo')},assertionCount:3,predicateCount:1,predicates:[{relationId:'abc&lt;"&<script>',objectKinds:{referent:3},valuations:[],sampleAssertionRefs:[],assertionCount:3}]};
 const svg=renderPrivateDiagnosticSvg(audit,'demo');
 assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script>'));
 assert.equal(rankCandidates(audit)[0].qualification,'NOT_REVIEWED_NOT_POLICY_FILTERED');
 assert.equal(makeSecondPass(audit,'demo').status,'PASS_2_REVIEW_REQUIRED_NOT_APPROVED');
});

test('max only processes bounded subset, never claims unprocessed entries covered',()=>{
 const e=env();try {const a=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out,maxSources:1});
 assert.equal(a.summary.processedEntries,1);assert.equal(a.summary.unprocessedEntries,1);assert.equal(a.summary.status,'PARTIAL_LIMITED_BATCH');
 }finally{e.close()}
});

test('no semantic qualification or approval can be derived from a relation name alone',()=>{
 const raw=Buffer.from(JSON.stringify({...fixture,assertions:[{assertion_id:'a:1',statement:{predicate:'genuine.cause-of',object:{kind:'referent',value:'b'}},valuations:[]}]}));
 const e=env();try{fs.writeFileSync(e.filename,raw);fs.writeFileSync(e.pins,JSON.stringify(makePins(raw)));
 const a=runK6({repositoryRoot:e.repo,collectionRoot:e.collection,pinsPath:e.pins,outputRoot:e.out});
 const p2=JSON.parse(fs.readFileSync(path.join(a.runDir,'pass2/demo.json')));
 const r=p2.candidateRelations[0];assert.deepEqual(r.candidateGroups,['REFERENT_GRAPH_CANDIDATE']);
 assert.deepEqual(r.needs,['readerPolicyRef','datasetRef','visibleWitnesses','semanticReview','scope']);
 }finally{e.close()}
});
