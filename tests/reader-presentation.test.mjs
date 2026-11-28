import test from 'node:test';
import assert from 'node:assert/strict';
import { technicalReaderView, catalogueStatus, filterCatalogue } from '../src/lib/reader-presentation.mjs';
const boot = (adapter, entityTypes) => ({capabilities:{packAdapter:adapter}, registry:{entityTypes}});
test('only code-owned structural views are classified as technical',()=>{
  const state=boot('kristal-local-v10',['v9_state','v9_artifact']);
  assert.equal(technicalReaderView(state,'v9_state'),true);
  assert.equal(technicalReaderView(state,undefined),true);
  const graph=boot('kristal-local-v10',['person','v9_state','v9_artifact']);
  assert.equal(technicalReaderView(graph,'person'),false);
  assert.equal(technicalReaderView(graph,'v9_artifact'),true);
  assert.equal(technicalReaderView(boot('kristal-github-collection-v10',['release']),'release'),true);
  assert.equal(technicalReaderView(boot('normalized-json-v1',['v9_state']),'v9_state'),false);
  assert.equal(technicalReaderView(null,'v9_state'),false);
});
test('catalogue never calls inventory or unavailable readers available',()=>{
  assert.equal(catalogueStatus({availability:'available',openable:false}),'inventory');
  assert.equal(catalogueStatus({availability:'unavailable',openable:true}),'unavailable');
  assert.equal(catalogueStatus({availability:'available',openable:true}),'available');
});
test('ordinary search is title-only; expert filters are optional and never expand authorized input',()=>{
  const items=[{title:'Accounting',stateRef:'urn:private:abc',source:'local_v10_reader',availability:'available',openable:true},{title:'Biology',source:'local_manager_preview',availability:'unknown',openable:false}];
  assert.deepEqual(filterCatalogue(items,{search:'abc'}),[]);
  assert.deepEqual(filterCatalogue(items,{search:'abc',expert:true}),[items[0]]);
  assert.deepEqual(filterCatalogue(items,{source:'local_manager_preview'}),items);
  assert.deepEqual(filterCatalogue(items,{source:'local_manager_preview',expert:true}),[items[1]]);
  assert.deepEqual(filterCatalogue(items,{availability:'available'}),[items[0]]);
});
