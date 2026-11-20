import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileVisualEvidence} from '../server/navigation/visual-semantics/evidence.mjs';

const a = 'w:1';
const state={entityIds:new Set(['A','B']),assertions:new Map([[a,{id:a,subject:'A',value:'B',relation:'rel:lineage',valuations:[{dimension:'mass',unit:'kg',value:2}]}]])};
const basic={derived:true,projectionKind:'tree',truncated:false};
const hierarchy={status:'reviewed-visible-hierarchy',direction:'child-to-parent',relationId:'rel:lineage',
  ruleId:'human-reviewed-rule',scope:'scope:exact',truncated:false,
  edges:[{source:'B',target:'A',assertionRefs:[a]}]};

const result=(projection, s=state)=>compileVisualEvidence(projection,s);

test('K9 default visualization is neutral, never approved for publication',()=>{
  const x=result(basic);assert.equal(x.status,'unqualified');assert.equal(x.proofCount,0);
  assert.equal(x.publicationAuthorized,false);assert.equal(x.authoritative,false);
});
test('reviewed hierarchy witnesses are checked against the already visible state',()=>{
  const x=result({...basic,hierarchySemantics:hierarchy});
  assert.equal(x.status,'qualified');assert.equal(x.proofs.length,1);
  assert.deepEqual(x.proofs[0].assertionRefs,[a]);
});
test('hidden or substituted assertion refuses the entire semantic audit',()=>{
  const x=result({...basic,hierarchySemantics:hierarchy},{...state,assertions:new Map()});
  assert.equal(x.status,'refused');assert.deepEqual(x.proofs,[]);
  const forged=result({...basic,hierarchySemantics:{...hierarchy,edges:[{source:'A',target:'B',assertionRefs:[a]}]}});
  assert.equal(forged.status,'refused');
});
test('reviewed attribute value requires exact source assertion, entity and relation',()=>{
  const attributeSemantics={status:'explicit-attributes',rules:[{id:'rule:kg',channel:'size',scope:'s',relationId:'rel:lineage'}],
    nodes:[{entityId:'A',encodings:[{channel:'size',ruleId:'rule:kg',origin:'visible-assertion-valuation',assertionRefs:[a]}]}]};
  assert.equal(result({...basic,attributeSemantics}).status,'qualified');
  assert.equal(result({...basic,attributeSemantics:{...attributeSemantics,rules:[{...attributeSemantics.rules[0],relationId:'wrong'}]}}).status,'refused');
  assert.equal(result({...basic,attributeSemantics:{...attributeSemantics,nodes:[{entityId:'unreadable',encodings:attributeSemantics.nodes[0].encodings}]}}).status,'refused');
});
test('visible entity shape has no invented assertion witness',()=>{
  const attr={status:'explicit-attributes',rules:[{id:'rule:type',channel:'shape',scope:'scope'}],
    nodes:[{entityId:'A',encodings:[{channel:'shape',ruleId:'rule:type',origin:'visible-entity-type',assertionRefs:[]}]}]};
  const x=result({...basic,attributeSemantics:attr});
  assert.equal(x.status,'qualified');assert.deepEqual(x.proofs[0].assertionRefs,[]);
});
test('causal relation requires source-to-target matching actual visible witness',()=>{
  const visualSemantics={status:'explicit-relations',causalEdges:[{assertionRef:a,source:'A',target:'B',relationId:'rel:lineage',scope:'scope'}],opposition:{components:[]}};
  assert.equal(result({...basic,visualSemantics}).status,'qualified');
  assert.equal(result({...basic,visualSemantics:{...visualSemantics,causalEdges:[{...visualSemantics.causalEdges[0],source:'B'}]}}).status,'refused');
});
test('non-source conflict rendering edge is not counted as semantic source proof',()=>{
  const visualSemantics={status:'explicit-relations',causalEdges:[],opposition:{components:[{scope:'scope',relations:[
    {assertionRef:'conflict:hidden',source:'A',target:'B',relationId:'conflictsWith'}]}]}};
  assert.equal(result({...basic,visualSemantics}).status,'refused');
});
test('explicit conflictsWith survives only when both assertion witnesses remain visible',()=>{
  const conflicting={id:'w:2',subject:'B',value:'A',relation:'rel:lineage'};
  const s={entityIds:state.entityIds,assertions:new Map([
    [a,{...state.assertions.get(a),conflictsWith:['w:2']}],['w:2',conflicting]])};
  const nodes=[{id:'assertion:w:1',kind:'assertion',assertionRef:a},{id:'assertion:w:2',kind:'assertion',assertionRef:'w:2'}];
  const visualSemantics={status:'explicit-relations',causalEdges:[],opposition:{components:[{
    scope:'visible-assertion-conflict',relations:[{assertionRef:'conflict:w:1:w:2',
      source:'assertion:w:1',target:'assertion:w:2',relationId:'conflictsWith'}]}]}};
  const projection={...basic,nodes,visualSemantics};
  const ok=result(projection,s);
  assert.equal(ok.status,'qualified');assert.deepEqual(ok.proofs[0].assertionRefs,['w:1','w:2']);
  assert.equal(result(projection,state).status,'refused');
});
test('truncation is explicit and never implies a complete view',()=>{
  const x=result({...basic,truncated:true,hierarchySemantics:hierarchy});
  assert.equal(x.status,'partial');assert.equal(x.truncated,true);
});
test('mixed valid and invalid encoding fails closed rather than keeping a positive badge',()=>{
  const h={...hierarchy,edges:[...hierarchy.edges,{source:'B',target:'A',assertionRefs:['hidden:ref']}]};
  const x=result({...basic,hierarchySemantics:h});
  assert.equal(x.status,'refused');assert.equal(x.proofCount,0);
});
test('K9 contract and shared renderer expose audit without changing legacy data views',()=>{
  const schema=JSON.parse(fs.readFileSync(new URL('../contracts/navigation-projection.schema.json',import.meta.url)));
  const projection=fs.readFileSync(new URL('../server/navigation/projection.mjs',import.meta.url),'utf8');
  const adapter=fs.readFileSync(new URL('../src/components/AdaptiveProjectionView.svelte',import.meta.url),'utf8');
  assert.equal(schema.properties.visualAudit.$ref,'#/$defs/visualAudit');
  assert.equal(schema.$defs.visualAudit.properties.publicationAuthorized.const,false);
  assert.match(projection,/compileVisualEvidence\(result,state\)/);
  assert.match(adapter,/<SemanticAuditView \{data\} \/>/);
});
