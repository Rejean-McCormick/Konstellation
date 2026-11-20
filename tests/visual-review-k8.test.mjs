import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseHierarchyReviews, compileReviewedHierarchy, loadHierarchyReviews, HIERARCHY_REVIEW_FORMAT } from '../server/navigation/visual-semantics/hierarchy.mjs';

const datasetRef = 'sha256:'+'1'.repeat(64), readerPolicyRef='sha256:'+'2'.repeat(64);
const sample='rel:zoology:00001', relation='zoology.lineage_child_of';
const review = { id:'k8.zoology.fixture', datasetRef,readerPolicyRef,
  stateRef:'urn:kristal:state:zoology',relationId:relation,scope:'fixture:2026',
  direction:'child-to-parent',sampleAssertionRefs:[sample],reviewer:'Operator in synthetic test',
  reviewedOn:'2026-11-19',review:'Synthetic reviewed-rule fixture only, not a real authorization. The original assertion is child-to-parent. No unfiltered source can bypass this scope or grant publication.' };
const reviews=parseHierarchyReviews({format:HIERARCHY_REVIEW_FORMAT,rules:[review]});
const projection={nodes:[{id:'lineage:A'},{id:'lineage:B'}],
  edges:[{id:sample,source:'lineage:A',target:'lineage:B',relationId:relation}],
  relationIds:[relation]};
const state={entityIds:new Set(['lineage:A','lineage:B']),assertions:new Map([[sample,
  {id:sample,relation,subject:'lineage:A',value:'lineage:B'}]])};
const context={datasetRef,readerPolicyRef};

const tree = fs.readFileSync(new URL('../src/components/TreeView.svelte',import.meta.url),'utf8');

test('K8 does not activate any hierarchy from the live empty registry',()=>{
  assert.equal(loadHierarchyReviews().length,0);
  assert.equal(compileReviewedHierarchy(projection,state,context,[]),null);
});
test('K8 comparison UI only exists after reviewed K5 hierarchy is supplied',()=>{
  assert.match(tree,/\$:\s+showSemantic = Boolean\(qualifiedHierarchy && compareMode === 'semantic'\)/);
  assert.match(tree,/\{#if qualifiedHierarchy\}/);
  assert.match(tree,/Avant : relations visibles brutes/);
  assert.match(tree,/Après : hiérarchie examinée/);
  assert.match(tree,/assertionRefs\.join/);
});
test('synthetic reviewed fixture returns a noncanonical witnessed relation',()=>{
  const r=compileReviewedHierarchy(projection,state,context,reviews);
  assert.equal(r.status,'reviewed-visible-hierarchy');
  assert.equal(r.authoritative,false);
  assert.deepEqual(r.edges,[{source:'lineage:B',target:'lineage:A',relationId:relation,assertionRefs:[sample]}]);
});
test('mismatched reader policy or dataset hash never activates K8 comparison',()=>{
  for(const c of [{...context,readerPolicyRef:'sha256:'+'0'.repeat(64)},
    {...context,datasetRef:'sha256:'+'0'.repeat(64)}])
    assert.equal(compileReviewedHierarchy(projection,state,c,reviews),null);
});
test('invisible sample assertion prevents reviewed view',()=>{
  assert.equal(compileReviewedHierarchy(projection,{...state,assertions:new Map()},context,reviews),null);
});
test('raw edges and unknown relation labels cannot authorize hierarchy',()=>{
  assert.equal(compileReviewedHierarchy({...projection,relationIds:['weather.states']},state,context,reviews),null);
  assert.equal(compileReviewedHierarchy({...projection,edges:[]},state,context,reviews),null);
});
