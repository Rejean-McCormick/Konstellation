import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHierarchyReviews,loadHierarchyReviews,compileReviewedHierarchy,HIERARCHY_REVIEW_FORMAT } from '../server/navigation/visual-semantics/hierarchy.mjs';
import { auditNativeV6 } from '../tools/visual-semantics/k5-audit.mjs';

const sha = 'sha256:'+'a'.repeat(64),policy = 'sha256:'+'b'.repeat(64);
const sample='rel:zoology:00001';
const row = { id:'zoology.lineage.private',datasetRef:sha,readerPolicyRef:policy,
  stateRef:'urn:kristal:state:zoology', relationId:'zoology.lineage_child_of',
  scope:'zoology:lineage:2026',direction:'child-to-parent',sampleAssertionRefs:[sample],
  reviewer:'Maintainer local',reviewedOn:'2026-11-19',
  review:'Only the exact visible child-to-parent lineage assertions in this pinned snapshot may inform relative vertical hierarchy; no causal or taxonomic certainty is inferred.'};
const makeReviews=rows=>parseHierarchyReviews({format:HIERARCHY_REVIEW_FORMAT,rules:rows});
const reviews=makeReviews([row]);
const entityIds=new Set(['lineage:Metazoa','lineage:Porifera','lineage:Ctenophora','lineage:Eumetazoa','lineage:Cnidaria']);
const e=(id,src,dst,rel=row.relationId)=>({id,source:src,target:dst,relationId:rel});
const es=[e(sample,'lineage:Porifera','lineage:Metazoa'),e('rel:zoology:00002','lineage:Ctenophora','lineage:Metazoa'),e('rel:zoology:00003','lineage:Eumetazoa','lineage:Metazoa'),e('rel:zoology:00004','lineage:Cnidaria','lineage:Eumetazoa')];
const nodes=[...entityIds].map(id=>({id,type:'lineage'}));
const state={entityIds,assertions:new Map(es.map(edge=>[edge.id,{id:edge.id,subject:edge.source,value:edge.target,relation:edge.relationId}]))};
const projection={nodes,edges:es,relationIds:[row.relationId]};
const context={datasetRef:sha,readerPolicyRef:policy};

function build(p=projection,s=state,c=context,rs=reviews,options={}){return compileReviewedHierarchy(p,s,c,rs,options);}

test('default K5 qualification registry is empty',()=>assert.deepEqual(loadHierarchyReviews(),[]));
test('source and policy pins required, no auto approval by visible predicate name',()=>{
  assert.equal(build(projection,state,context,[]),null);
  assert.equal(build(projection,state,{...context,datasetRef:'sha256:'+'d'.repeat(64)}),null);
  assert.equal(build(projection,state,{...context,readerPolicyRef:'sha256:'+'c'.repeat(64)}),null);
});
test('reviewed real zoology relation resolves child -> parent into parent -> child with witnesses',()=>{
  const p=build(); assert.equal(p.status,'reviewed-visible-hierarchy'); assert.deepEqual(p.roots,['lineage:Metazoa']);
  assert.equal(p.authoritative,false);assert.equal(p.edges.length,4);
  assert.deepEqual(p.edges[0],{source:'lineage:Eumetazoa',target:'lineage:Cnidaria',relationId:row.relationId,assertionRefs:['rel:zoology:00004']});
  assert.equal(p.edges.find(e=>e.target==='lineage:Porifera')?.assertionRefs[0],sample);
});
test('stable on shuffled input, and correct partial-view warning',()=>{
  const a=build(projection,state,context,reviews,{truncated:true});
  const b=build({...projection,nodes:[...nodes].reverse(),edges:[...es].reverse()},state,context,reviews,{truncated:true});
  assert.deepEqual(a,b);assert.equal(a.truncated,true);
});
test('hidden sample witness or forged edge does not authorize hierarchy',()=>{
  assert.equal(build(projection,{...state,assertions:new Map()},context,reviews),null);
  const bad={...projection,edges:[{...es[0],source:'lineage:Eumetazoa'}]};
  assert.equal(build(bad,state,context,reviews),null);
});
test('unknown relation cannot be read as family tree',()=>{
  assert.equal(build({...projection,relationIds:['unknown'] }),null);
  assert.equal(build({...projection,edges:es.map(e=>({...e,relationId:'weather.states'})) }),null);
});
test('multiple parents are rejected, not drawn as one-parent tree',()=>{
  const other=e('rel:zoology:fake','lineage:Porifera','lineage:Eumetazoa');
  const s={...state,assertions:new Map([...state.assertions,[other.id,{id:other.id,subject:other.source,value:other.target,relation:other.relationId}]])};
  const p=build({...projection,edges:[...es,other]},s);assert.equal(p.status,'constraints-unfulfilled');
  assert.ok(p.unfulfilled.includes('MULTIPLE_PARENTS')); assert.deepEqual(p.edges,[]);
});
test('directed cycles are rejected',()=>{
  const other=e('rel:zoology:cycle','lineage:Metazoa','lineage:Porifera');
  const s={...state,assertions:new Map([...state.assertions,[other.id,{id:other.id,subject:other.source,value:other.target,relation:other.relationId}]])};
  const p=build({...projection,edges:[...es,other]},s);assert.equal(p.status,'constraints-unfulfilled'); assert.ok(p.unfulfilled.includes('CYCLE'));
});
test('self-parent edge is explicitly unfulfilled',()=>{
  const same=e('rel:zoology:self','lineage:Metazoa','lineage:Metazoa');
  const s={...state,assertions:new Map([...state.assertions,[same.id,{id:same.id,subject:same.source,value:same.target,relation:same.relationId}]])};
  const p=build({...projection,edges:[...es,same]},s);assert.ok(p.unfulfilled.includes('SELF_PARENT'));
});
test('malformed or ambiguously approved review is rejected',()=>{
  const wrong=[
    {...row,review:'ok'}, {...row,approved:true}, {...row,datasetRef:'bad'},
    {...row,readerPolicyRef:'bad'},{...row,direction:'auto'},
    {...row,sampleAssertionRefs:[]},{...row,sampleAssertionRefs:[sample,sample]},
    {...row,reviewedOn:'yesterday'},{...row,reviewer:'X'},
  ];
  for(const r of wrong)assert.throws(()=>makeReviews([r]),/INVALID_HIERARCHY_REVIEW/);
  assert.throws(()=>makeReviews([row,row]),/INVALID_HIERARCHY_REVIEW/);
});
test('audit v6 sees real scalar capability but never promotes any rule',()=>{
  const x={schema_version:'6.0',artifact_type:'epistemic',assertions:[
    {assertion_id:'a:1',statement:{predicate:'weather.states',object:{kind:'string'}},valuations:[{dimension:'generality',value_semantics:'ordinal',value_state:'known',value:'high'}]},
  ]};
  const p=auditNativeV6(x,sha,'urn:kristal:state:weather');
  assert.equal(p.assertionCount,1);assert.equal(p.knownScalarValuationCount,0);
  assert.equal(p.status,'OBSERVATION_ONLY_NOT_POLICY_FILTERED_NOT_APPROVED');
  assert.deepEqual(p.predicates[0].sampleAssertionRefs,['a:1']);
});
test('invalid native report source is not accepted',()=>{
  for(const x of [{schema_version:'9.0',assertions:[]},{schema_version:'6.0',assertions:[{assertion_id:'x',statement:{predicate:'a'}},{assertion_id:'x',statement:{predicate:'a'}}]}])
    assert.throws(()=>auditNativeV6(x,sha),/UNSUPPORTED_OR_INVALID_SOURCE|INVALID_ASSERTION_SHAPE/);
});
