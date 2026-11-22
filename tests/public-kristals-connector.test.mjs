import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {digestIndex,mergePublicCatalog,validatePublicBundle,createPublicKristalsProvider} from '../server/public-kristals.mjs';
import {publicKristalsLabel} from '../src/lib/public-kristals-ui.mjs';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const publicRows = [
 {slug:'alpha',path:'kristals/alpha',title:'Alpha',state_ref:'urn:kristal:alpha:state',surface_digest:'sha256:'+'a'.repeat(64),state_logical_commitment:{profile:'kristal.state-commitment/jcs-sha256-v1',digest:'sha256:'+'b'.repeat(64)}},
 {slug:'beta',path:'kristals/beta',title:'Beta',state_ref:'urn:kristal:beta:state',surface_digest:'sha256:'+'c'.repeat(64),state_logical_commitment:{profile:'kristal.state-commitment/jcs-sha256-v1',digest:'sha256:'+'d'.repeat(64)}},
 ];
const index={format:'kristal.github-collection-index/1.0',kristals:publicRows,count:2};
index.index_digest=digestIndex(index.format,index.kristals);
const revision='collection-'+index.index_digest.slice(7,23);
const bundle={format:'konstellation.light-navigation/1.0',view_kind:'derived-hosting-navigation',semantic_authority:false,
 title:'Alpha',slug:'alpha',revision,state_ref:publicRows[0].state_ref,surface_digest:publicRows[0].surface_digest,nodes:[],edges:[]};
const bytes=Buffer.from(JSON.stringify(bundle));const digest=hash(bytes);
const entry={slug:'alpha',revision,title:'Alpha',state_ref:publicRows[0].state_ref,surface_digest:publicRows[0].surface_digest,
 path:'data/pack-'+digest.slice(7)+'.json',sha256:digest,bytes:bytes.length,members:0,files:0};
const light={format:'konstellation.light-catalog/1.0',entries:[entry]};
const response=(value)=>({ok:true,headers:new Map([['content-length',String(value.length)]]),body:(async function*(){yield value;})()});
const fetchMock=async url=>{
 if(url.endsWith('/kristals/index.json'))return response(Buffer.from(JSON.stringify(index)));
 if(url.endsWith('/data/catalog.json'))return response(Buffer.from(JSON.stringify(light)));
 if(url.endsWith('/'+entry.path.replace('data/','data/')))return response(bytes);
 throw Error('Unexpected URL: '+url);
};

test('one authoritative index, future public entries visible even without a Light reader',()=>{
 const cat=mergePublicCatalog(index,light);
 assert.equal(cat.entries.length,2);assert.equal(cat.entries[0].available,true);
 assert.equal(cat.entries[1].available,false);assert.equal(cat.entries[1].slug,'beta');
 assert.equal(cat.entries[0].path,entry.path);
});
test('index digest, foreign entries and mismatched source surface are refused or ignored',()=>{
 assert.throws(()=>mergePublicCatalog({...index,index_digest:'sha256:'+'0'.repeat(64)},light),/Index public invalide/);
 const bad=structuredClone(light);bad.entries[0].surface_digest='sha256:'+'9'.repeat(64);
 const cat=mergePublicCatalog(index,bad);assert.equal(cat.entries[0].available,false);
 const foreign=structuredClone(light);foreign.entries[0].slug='not-public';
 assert.equal(mergePublicCatalog(index,foreign).entries[0].available,false);
});
test('only the expected bundle SHA-256, size, slug and read-only shape are accepted',()=>{
 assert.equal(validatePublicBundle(bytes,{...entry,available:true}).length,bytes.length);
 assert.throws(()=>validatePublicBundle(Buffer.from('tampered'),{...entry,available:true}),/Empreinte/);
 assert.throws(()=>validatePublicBundle(bytes,{...entry,available:false}),/Empreinte/);
});
test('provider fetches only fixed GitHub hosts, and serves verified same-origin catalog / bundle',async()=>{
 const provider=createPublicKristalsProvider({fetchImpl:fetchMock});
 const c=JSON.parse((await provider.serve('/kristals-publics/data/catalog.json')).toString());
 assert.equal(c.entries.length,2);
 const fetched=await provider.serve('/kristals-publics/'+entry.path);
 assert.equal(fetched.toString(),bytes.toString());
 await assert.rejects(()=>provider.serve('/kristals-publics/data/pack-'+('f'.repeat(64))+'.json'),/absent/);
 await assert.rejects(()=>provider.serve('/other-site/data/catalog.json'),/Chemin/);
});
test('the navigation label is editorial in the 14 existing languages',()=>{
 for(const language of ['en','fr','es','de','nl','sv','da','no','nn','fi','et','af','it','pt']){
  assert.ok(publicKristalsLabel(language).trim());
 }
});
