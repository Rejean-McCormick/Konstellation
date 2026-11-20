import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVisualEncodingBindings, loadVisualEncodingBindings } from '../server/navigation/visual-semantics/registry.mjs';
import { compileVisualSemantics } from '../server/navigation/visual-semantics/compiler.mjs';

const rules = parseVisualEncodingBindings({format:'konstellation.visual-encoding-bindings/0.1', rules:[
  {relationId:'demo:conflicts',kind:'opposition',scope:'claims',review:'Reviewed fixture: conflict is explicit'},
  {relationId:'demo:causes',kind:'causal',scope:'lab',sign:1,review:'Reviewed fixture: explicit positive cause'},
  {relationId:'demo:inhibits',kind:'causal',scope:'lab',sign:-1,review:'Reviewed fixture: explicit inhibition'},
]});
const nodes = (...ids) => ids.map(id=>({id,label:id}));
const edge=(id,source,target,relationId)=>({id,source,target,relationId,relationLabel:'untrusted label'});
const conflictNodes=(...ids)=>ids.map(id=>({id:`assertion:${id}`,kind:'assertion',assertionRef:id,label:`Assertion ${id}`}));

test('baseline config fails closed: no relation is declared semantically qualified',()=>{
  assert.equal(loadVisualEncodingBindings().size,0);
  const plan=compileVisualSemantics({nodes:nodes('a','b'),edges:[edge('x','a','b','demo:conflicts')]},loadVisualEncodingBindings());
  assert.equal(plan.status,'no-qualified-encoding');
  assert.deepEqual(plan.opposition.components,[]);
});

test('a reviewed conflict yields two stable, explained sides and explicit witnesses',()=>{
  const input={nodes:nodes('b','a','c'),edges:[edge('1','a','b','demo:conflicts'),edge('2','b','c','demo:conflicts')]};
  const p=compileVisualSemantics(input,rules);
  assert.equal(p.opposition.components.length,1);
  assert.deepEqual(p.opposition.components[0].left,['a','c']);
  assert.deepEqual(p.opposition.components[0].right,['b']);
  assert.deepEqual(p.opposition.components[0].relations.map(r=>r.assertionRef),['1','2']);
  assert.equal(p.authoritative,false);
  assert.equal(p.opposition.unfulfilled.length,0);
  const reversed=compileVisualSemantics({nodes:[...input.nodes].reverse(),edges:[...input.edges].reverse()},rules);
  assert.deepEqual(reversed,p,'source ordering may not modify semantic layout');
});

test('a triangle of opposition is not forced onto a deceptive binary axis',()=>{
  const p=compileVisualSemantics({nodes:nodes('a','b','c'),edges:[edge('ab','a','b','demo:conflicts'),edge('bc','b','c','demo:conflicts'),edge('ac','a','c','demo:conflicts')]},rules);
  assert.equal(p.opposition.components.length,0);
  assert.deepEqual(p.opposition.unfulfilled[0].nodeIds,['a','b','c']);
  assert.deepEqual(p.opposition.unfulfilled[0].assertionRefs,['ab','ac','bc']);
});

test('unreviewed labels, duplicate/missing relation and nodes are never semantic',()=>{
  const p=compileVisualSemantics({nodes:nodes('a','b'),edges:[
    {...edge('1','a','b','fake:conflicts'),relationLabel:'conflicts with'},
    edge('2','a','secret','demo:conflicts'),
    edge('3','a','b','demo:depends_on'),
  ]},rules);
  assert.equal(p.status,'no-qualified-encoding');
  assert.equal(JSON.stringify(p).includes('secret'),false);
  assert.equal(JSON.stringify(p).includes('fake:conflicts'),false);
});

test('disconnected conflict components are not merged into one semantic coordinate system',()=>{
  const p=compileVisualSemantics({nodes:nodes('d','a','b','c'),edges:[edge('1','a','b','demo:conflicts'),edge('2','c','d','demo:conflicts')]},rules);
  assert.equal(p.opposition.components.length,2);
  assert.deepEqual(p.opposition.components.map(c=>c.left[0]),['a','c']);
});

test('causal influence and signs are qualified by exact rule, not label',()=>{
  const p=compileVisualSemantics({nodes:nodes('a','b'),edges:[
    edge('ca','a','b','demo:causes'),edge('cb','b','a','demo:inhibits'),
    {...edge('cc','a','b','not:qualified'),relationLabel:'increases'}
  ]},rules);
  assert.deepEqual(p.causalEdges.map(x=>x.sign),[1,-1]);
  assert.equal(p.causalEdges.some(x=>x.assertionRef==='cc'),false);
});

test('traceability explicit conflictsWith uses visible assertion refs, never inferred labels',()=>{
  const input={nodes:conflictNodes('a','b'),edges:[{id:'conflict:a:b',source:'assertion:a',target:'assertion:b',kind:'conflict'}]};
  const p=compileVisualSemantics(input,new Map(),{includeAssertionConflicts:true});
  assert.equal(p.opposition.components.length,1);
  assert.deepEqual(p.opposition.components[0].relations[0],{
    assertionRef:'conflict:a:b',source:'assertion:a',target:'assertion:b',relationId:'conflictsWith',
  });
  assert.equal(p.opposition.components[0].scope,'visible-assertion-conflict');
  assert.equal(compileVisualSemantics(input,new Map()).status,'no-qualified-encoding');
});

test('hidden assertion or forged type blocks conflict derived geometry',()=>{
  for(const input of [
    {nodes:conflictNodes('a'),edges:[{id:'conflict:a:b',source:'assertion:a',target:'assertion:b',kind:'conflict'}]},
    {nodes:nodes('assertion:a','assertion:b'),edges:[{id:'conflict:a:b',source:'assertion:a',target:'assertion:b',kind:'conflict'}]},
  ]) {
    const p=compileVisualSemantics(input,new Map(),{includeAssertionConflicts:true});
    assert.equal(p.opposition.components.length,0);
  }
});

test('visual registry rejects ambiguous IDs, duplicate rules, fake authorization, and unqualified signs',()=>{
  const valid={format:'konstellation.visual-encoding-bindings/0.1',rules:[{relationId:'r:a',kind:'opposition',scope:'domain',review:'review complete for this relation'}]};
  for(const bad of [
    {...valid,rules:[...valid.rules,valid.rules[0]]},
    {...valid,rules:[{...valid.rules[0],sign:1}]},
    {...valid,rules:[{...valid.rules[0],relationId:'../../../hidden'}]},
    {...valid,rules:[{...valid.rules[0],review:'ok'}]},
    {...valid,rules:[{...valid.rules[0],approved:true}]},
    {...valid,rules:[{...valid.rules[0],kind:'causal'}]},
  ])assert.throws(()=>parseVisualEncodingBindings(bad));
});
