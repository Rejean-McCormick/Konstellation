// Read-only connector. Source of catalogue identity: public kristal-public index.
// Read surfaces are pre-existing, derived Konstellation-Light bundles in its PUBLIC GitHub repo.
// NO canonical state is copied, rewritten, qualified, or promoted into an Engine Reader Policy.
import { createHash } from 'node:crypto';

const INDEX_URL = 'https://raw.githubusercontent.com/Rejean-McCormick/kristal-public/main/kristals/index.json';
const LIGHT_BASE = 'https://raw.githubusercontent.com/Rejean-McCormick/Konstellation-Light/main/light/site/data/';
const HEX = /^sha256:[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,100}$/;
const BUNDLE = /^data\/pack-([a-f0-9]{64})\.json$/;
const SHA = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const utf8Compare = (a,b) => Buffer.compare(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
function stableJson(x){
  if(x === null || typeof x === 'boolean' || typeof x === 'string') return JSON.stringify(x);
  if(typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
  if(Array.isArray(x)) return '[' + x.map(stableJson).join(',') + ']';
  if(isObject(x)) return '{' + Object.keys(x).sort((a,b)=>{
    const aa=Array.from(a,c=>c.codePointAt(0)), bb=Array.from(b,c=>c.codePointAt(0));
    for(let i=0;i<Math.min(aa.length,bb.length);i++)if(aa[i]!==bb[i])return aa[i]-bb[i];
    return aa.length-bb.length;
  }).map(k=>JSON.stringify(k)+':'+stableJson(x[k])).join(',')+'}';
  throw Error('Valeur non représentable dans l’index public.');
}
export function digestIndex(format,kristals) { return SHA(Buffer.from(stableJson({format,kristals}),'utf8')); }
export function mergePublicCatalog(index, light){
  if(!isObject(index) || index.format!=='kristal.github-collection-index/1.0' || !Array.isArray(index.kristals) ||
     !Number.isSafeInteger(index.count) || index.count!==index.kristals.length ||
     index.count<1 || index.count>1000 || !HEX.test(index.index_digest) ||
     digestIndex(index.format,index.kristals)!==index.index_digest) throw Error('Index public invalide.');
  if(!isObject(light) || light.format!=='konstellation.light-catalog/1.0' || !Array.isArray(light.entries) || light.entries.length>2000)
    throw Error('Catalogue de lecture Light invalide.');
  const indexed=new Map();let prev='';
  for(const x of index.kristals){
    if(!isObject(x)||!SLUG.test(x.slug)||x.path!==`kristals/${x.slug}`||
       !HEX.test(x.surface_digest)||typeof x.title!=='string'||x.title.length>200||!x.title||
       typeof x.state_ref!=='string'||x.state_ref.length>400||!x.state_ref||
       !isObject(x.state_logical_commitment)||x.state_logical_commitment.profile!=='kristal.state-commitment/jcs-sha256-v1'||
       !HEX.test(x.state_logical_commitment.digest)||indexed.has(x.slug)|| (prev && utf8Compare(prev,x.slug)>=0))
      throw Error('Entrée publique non conforme.');
    indexed.set(x.slug,x);prev=x.slug;
  }
  const revision='collection-'+index.index_digest.slice(7,23);
  const readModels=new Map();
  for(const item of light.entries){
    if(!isObject(item)||!SLUG.test(item.slug)||!isObject(indexed.get(item.slug)))continue;
    const publicEntry=indexed.get(item.slug);
    if(item.revision!==revision || item.state_ref!==publicEntry.state_ref || item.surface_digest!==publicEntry.surface_digest)continue;
    const match=BUNDLE.exec(item.path||'');
    if(!match||item.sha256!==`sha256:${match[1]}`||!Number.isSafeInteger(item.bytes)||item.bytes<1||item.bytes>8*1024*1024)
      throw Error('Bundle de lecture non conforme pour '+item.slug);
    if(readModels.has(item.slug))throw Error('Bundle de lecture dupliqué pour '+item.slug);
    readModels.set(item.slug,{slug:item.slug,revision,title:publicEntry.title,state_ref:item.state_ref,surface_digest:item.surface_digest,
      path:item.path,sha256:item.sha256,bytes:item.bytes, members:item.members,files:item.files, available:true});
  }
  const entries=index.kristals.map(x=>readModels.get(x.slug)||{
    slug:x.slug, title:x.title, revision, state_ref:x.state_ref, surface_digest:x.surface_digest,
    available:false, path:null,sha256:null,bytes:0,members:null,files:x.file_count,
  });
  return {
    format:'konstellation.light-catalog/1.0',
    notice:'Catalogue unique : kristal-public. Lecture dérivée et non qualifiée depuis Konstellation-Light. Les entrées sans bundle sont signalées indisponibles.',
    entries,
  };
}
export function validatePublicBundle(bytes,entry){
  if(!entry?.available || !BUNDLE.test(entry.path||'')||bytes.length!==entry.bytes||SHA(bytes)!==entry.sha256)
    throw Error('Empreinte du bundle de lecture invalide.');
  const obj=JSON.parse(bytes.toString('utf8'));
  if(!isObject(obj) || obj.format!=='konstellation.light-navigation/1.0'||obj.semantic_authority!==false||
    !['derived-hosting-navigation','derived-public-knowledge'].includes(obj.view_kind)||
    obj.slug!==entry.slug||obj.revision!==entry.revision||obj.state_ref!==entry.state_ref||
    obj.surface_digest!==entry.surface_digest||!Array.isArray(obj.nodes)||!Array.isArray(obj.edges)||
    obj.nodes.length>12000||obj.edges.length>12000)throw Error('Identité ou structure du bundle non conforme.');
  return bytes;
}
// Remote URLs are constant. Never accept a URL, repository, branch, or path from the visitor.
export async function readPublicBytes(url,maxBytes,{fetchImpl=fetch}={}){
  if(url!==INDEX_URL && url!==LIGHT_BASE+'catalog.json' &&
     !(url.startsWith(LIGHT_BASE)&&/^pack-[a-f0-9]{64}\.json$/.test(url.slice(LIGHT_BASE.length))))
    throw Error('Origine externe non autorisée.');
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store',
    headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Source publique indisponible (HTTP '+response.status+').');
  const size=Number(response.headers?.get('content-length')||0);
  if(size>maxBytes)throw Error('Document public trop volumineux.');
  const chunks=[];let length=0;
  for await(const chunk of response.body){
    length+=chunk.byteLength;
    if(length>maxBytes){await response.body.cancel?.().catch(()=>{});throw Error('Document public trop volumineux.');}
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks,length);
}
export function createPublicKristalsProvider({fetchImpl=fetch,ttlMs=120000}={}){
  let cache=null,expires=0,pending=null;
  async function catalog(){
    if(cache && Date.now()<expires)return cache;
    if(pending)return pending;
    pending=(async()=>{
      const [indexBytes,lightBytes]=await Promise.all([
        readPublicBytes(INDEX_URL,1024*1024,{fetchImpl}),
        readPublicBytes(LIGHT_BASE+'catalog.json',1024*1024,{fetchImpl}),
      ]);
      const result=mergePublicCatalog(JSON.parse(indexBytes.toString('utf8')),JSON.parse(lightBytes.toString('utf8')));
      cache=result;expires=Date.now()+ttlMs;return result;
    })();
    try{return await pending;}finally{pending=null;}
  }
  async function serve(pathname){
    if(pathname==='/kristals-publics/data/catalog.json'){
      return Buffer.from(JSON.stringify(await catalog())+'\n','utf8');
    }
    const match=/^\/kristals-publics\/data\/pack-([a-f0-9]{64})\.json$/.exec(pathname);
    if(!match)throw Error('Chemin du catalogue public invalide.');
    const row=(await catalog()).entries.find(x=>x.available&&x.sha256===`sha256:${match[1]}`&&x.path===`data/pack-${match[1]}.json`);
    if(!row)throw Error('Bundle absent du catalogue public vérifié.');
    return validatePublicBundle(await readPublicBytes(LIGHT_BASE+`pack-${match[1]}.json`,8*1024*1024,{fetchImpl}),row);
  }
  return Object.freeze({catalog,serve});
}
export const publicKristalsProvider=createPublicKristalsProvider();
