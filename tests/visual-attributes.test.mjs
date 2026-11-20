import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseVisualAttributeBindings, loadVisualAttributeBindings,
  compileVisualAttributes, collectVisibleAttributeInput,
} from '../server/navigation/visual-semantics/attributes.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('../examples/visual-semantics/qualified-attributes.example.json',import.meta.url),'utf8'));
const rules=parseVisualAttributeBindings(fixture);
const n=(id,type='organism')=>({id,entityId:id,type});
const v=(dimension,value,unit=null,semantics=typeof value==='number'?'scalar':'categorical')=>({
  dimension, value, value_state:'known',value_semantics:semantics, ...(unit===null?{}:{unit}),
});
const rec=(assertionRef,subjectId,valuations,relationId='demo:measurement')=>({assertionRef,subjectId,relationId,valuations});
const inputs={ nodes:[n('b'),n('a','facility')],records:[
  rec('assertion:b','b',[v('demo:weight',20,'kg'),v('demo:category','groupB'),v('demo:x',20,'m'),v('demo:y',40,'m')]),
  rec('assertion:a','a',[v('demo:weight',50,'kg'),v('demo:category','groupA'),v('demo:x',10,'m'),v('demo:y',30,'m')]),
]};
const enc=(node,channel)=>node.encodings.find(e=>e.channel===channel);
const def={format:fixture.format,rules:[]};

test('default registry is empty and no semantic position can be inferred',()=>{
  assert.equal(loadVisualAttributeBindings().length,0);
  assert.equal(compileVisualAttributes(inputs,loadVisualAttributeBindings()).status,'no-qualified-attributes');
});

test('explicit 5-channel plan is stable, sourced, typed and never canonical',()=>{
  const p=compileVisualAttributes(inputs,rules);
  assert.equal(p.status,'explicit-attributes'); assert.equal(p.authoritative,false);
  assert.deepEqual(p.nodes.map(n=>n.id),['a','b']);
  assert.deepEqual(p.nodes[0].encodings.map(e=>e.channel),['color','shape','size','x','y']);
  assert.equal(enc(p.nodes[0],'shape').token,'square');
  assert.equal(enc(p.nodes[0],'color').token,'teal');
  assert.deepEqual(enc(p.nodes[0],'shape').assertionRefs,[]);
  assert.deepEqual(enc(p.nodes[0],'color').assertionRefs,['assertion:a']);
  assert.equal(enc(p.nodes[0],'size').ratio,0.5);
  assert.equal(enc(p.nodes[1],'size').unit,'kg');
  assert.equal(p.distance.qualified,true);
  assert.deepEqual(compileVisualAttributes({nodes:[...inputs.nodes].reverse(),records:[...inputs.records].reverse()},rules),p);
});

test('an unrelated relation cannot trigger color or numeric encoding',()=>{
  const p=compileVisualAttributes({nodes:[n('a')],records:[rec('fake','a',inputs.records[0].valuations,'unreviewed')]},rules);
  assert.deepEqual(p.nodes[0].encodings.map(e=>e.channel),['shape']);
});

test('unknown semantic, missing unit or incompatible unit is refused',()=>{
  for (const value of [
    v('demo:weight',10,'m'),
    {...v('demo:weight',10,'kg'),value_state:'unknown'},
    {...v('demo:weight','10','kg'),value_semantics:'scalar'},
    {...v('demo:weight',10,'kg'),value_semantics:'ordinal'},
    v('demo:weight',-1,'kg'),
    v('demo:weight',101,'kg'),
  ]){
    const p=compileVisualAttributes({nodes:[n('a')],records:[rec('source','a',[value])]},rules);
    assert.equal(enc(p.nodes[0],'size'),undefined);
  }
});

test('category with unknown key, wrong unit, non-categorical or missing status never receives color',()=>{
  for(const value of [
    v('demo:category','unreviewed'),
    v('demo:category','groupA','kg'),
    v('demo:category','groupA',null,'scalar'),
    {...v('demo:category','groupA'),value_state:'unknown'},
  ]){
    const p=compileVisualAttributes({nodes:[n('a')],records:[rec('a1','a',[value])]},rules);
    assert.equal(enc(p.nodes[0],'color'),undefined);
  }
});

test('conflicting values, mixed valid/invalid and malformed duplicate valuations are never silently selected',()=>{
  const variants=[
    [rec('a','a',[v('demo:weight',10,'kg')]),rec('b','a',[v('demo:weight',20,'kg')])],
    [rec('a','a',[v('demo:weight',10,'kg')]),rec('b','a',[v('demo:weight',20,'m')])],
    [rec('a','a',[v('demo:weight',10,'kg'),v('demo:weight',10,'kg')])],
  ];
  for (const records of variants) {
    const p=compileVisualAttributes({nodes:[n('a')],records},rules);
    assert.equal(enc(p.nodes[0],'size'),undefined);
  }
});

test('equal-valued measurements retain distinct, ordered witnesses',()=>{
  const p=compileVisualAttributes({nodes:[n('a')],records:[
    rec('b','a',[v('demo:weight',5,'kg')]),rec('a','a',[v('demo:weight',5,'kg')]),
  ]},rules);
  assert.deepEqual(enc(p.nodes[0],'size').assertionRefs,['a','b']);
});

test('distances are never qualified when axes have different units or no paired rule',()=>{
  const altered=JSON.parse(JSON.stringify(fixture));
  for(const rule of altered.rules) if(rule.channel==='y'){rule.unit='km';delete rule.distanceGroup;}
  for(const rule of altered.rules) if(rule.channel==='x') delete rule.distanceGroup;
  const parsed=parseVisualAttributeBindings(altered);
  assert.equal(compileVisualAttributes(inputs,parsed).distance.qualified,false);
  const onlyX=parseVisualAttributeBindings({...def,rules:[fixture.rules.find(r=>r.channel==='x')].map(r=>({...r,distanceGroup:undefined}))});
  assert.equal(compileVisualAttributes(inputs,onlyX).distance.qualified,false);
});

test('mismatching reviewed distance groups/scopes/units are rejected',()=>{
  for(const variant of ['distanceGroup','scope','unit']){
    const input=JSON.parse(JSON.stringify(fixture));
    const y=input.rules.find(r=>r.channel==='y');
    y[variant]=variant==='unit'?'km':variant==='scope'?'other:domain':'other:position';
    assert.throws(()=>parseVisualAttributeBindings(input),/INVALID_VISUAL_ATTRIBUTE_BINDING/);
  }
});

test('invalid mapping, unknown style, duplicate channel and fake permissions fail closed',()=>{
  const row=fixture.rules[0];
  const bad=[
    {...def,rules:[row,row]},
    {...def,rules:[{...row,approved:true}]},
    {...def,rules:[{...row,review:'ok'}]},
    {...def,rules:[{...row,id:13}]},
    {...def,rules:[{...row,mapping:{organism:'red'}}]},
    {...def,rules:[{...row,mapping:{organism:'circle',facility:'circle'}}]},
    {...def,rules:[{...row,mapping:JSON.parse('{"__proto__":"square"}')}]},
    {...def,rules:[{...row,mapping:{organism:'circle'},min:0}]},
  ];
  for(const input of bad)assert.throws(()=>parseVisualAttributeBindings(input),/INVALID_VISUAL_ATTRIBUTE_BINDING/);
});

test('non-finite ranges, negative size and bogus units are rejected before rendering',()=>{
  const size=fixture.rules.find(r=>r.channel==='size');
  for (const r of [
    {...size,min:-1}, {...size,min:0,max:0}, {...size,min:0,max:Infinity},
    {...size,unit:''},{...size,unit:42},{...size,min:0,max:1e309},
  ])assert.throws(()=>parseVisualAttributeBindings({...def,rules:[r]}),/INVALID_VISUAL_ATTRIBUTE_BINDING/);
});

test('only visible, policy-filtered entity ids and assertion refs feed the compiler',()=>{
  const state={entityIds:new Set(['a','b']),assertions:new Map([
    ['public',{id:'public'}],
  ]),assertionsByEntity:new Map([
    ['a',[
      {id:'public',subject:'a',relation:'demo:measurement',valuations:[v('demo:weight',50,'kg')]},
      {id:'secret',subject:'a',relation:'demo:measurement',valuations:[v('demo:weight',99,'kg')]},
    ]],
    ['secret', [{id:'hidden',subject:'secret',relation:'demo:measurement',valuations:[v('demo:weight',44,'kg')]}]],
  ])};
  const proj={nodes:[{id:'a',type:'organism'}, {id:'secret',type:'organism'}, {id:'assertion:public',type:'assertion',kind:'assertion'}]};
  const input=collectVisibleAttributeInput(proj,state);
  assert.deepEqual(input.nodes.map(n=>n.id),['a']);
  assert.deepEqual(input.records.map(r=>r.assertionRef),['public']);
  const text=JSON.stringify(compileVisualAttributes(input,rules));
  assert.equal(text.includes('secret'),false);
  assert.equal(text.includes('hidden'),false);
});

test('prefix-qualified traceability entities preserve display id and canonical subject ref',()=>{
  const state={entityIds:new Set(['foo']),assertions:new Map(),assertionsByEntity:new Map()};
  const input=collectVisibleAttributeInput({nodes:[{id:'entity:foo',kind:'entity',entityId:'foo',type:'organism'}]},state);
  assert.deepEqual(input.nodes,[{id:'entity:foo',entityId:'foo',type:'organism'}]);
});

test('rows, timeline items, spatial points and record projections share the exact adapter',()=>{
  const state={entityIds:new Set(['a']),assertions:new Map(),assertionsByEntity:new Map()};
  const entity={id:'a',type:'organism'};
  for(const p of [{rows:[entity]},{items:[{entity}]},{points:[{entity}]},{records:[{entity}]}]){
    assert.deepEqual(collectVisibleAttributeInput(p,state).nodes,[{id:'a',entityId:'a',type:'organism'}]);
  }
});

test('over-budget entities and assertions fail closed with explicit incomplete status',()=>{
  const state={entityIds:new Set(Array.from({length:161},(_,i)=>`a${i}`)),assertions:new Map(),assertionsByEntity:new Map()};
  const p={nodes:[...state.entityIds].map(id=>({id,type:'organism'}))};
  const input=collectVisibleAttributeInput(p,state);
  assert.equal(input.incomplete,true);
  const plan=compileVisualAttributes(input,rules);
  assert.equal(plan.status,'incomplete');assert.equal(plan.truncated,true);assert.deepEqual(plan.nodes,[]);
});

test('non-authoritative plan cannot be enabled by arbitrary per-Kristal metadata',()=>{
  const source={nodes:[n('a')],records:[rec('a','a',[v('demo:weight',42,'kg')])],
    visualChannels:{size:'huge'},metadata:{colors:{'a':'red'}}};
  const p=compileVisualAttributes(source,parseVisualAttributeBindings(def));
  assert.equal(p.status,'no-qualified-attributes');
});


test('reviewed attributes may not mix unrelated scopes in one meaningful picture',()=>{
  const input=JSON.parse(JSON.stringify(fixture));
  input.rules[0].scope='other:semantic-domain';
  assert.throws(()=>parseVisualAttributeBindings(input),/INVALID_VISUAL_ATTRIBUTE_BINDING/);
});
