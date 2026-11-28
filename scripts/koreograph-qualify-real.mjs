#!/usr/bin/env node
// Read-only, opt-in qualification against the existing local Konstellation API.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonical, sourceOf, targetKey, normalizeProjection, makeScore, compileScore } from '../src/lib/koreograph/engine.mjs';
import { compileOptimizedPresentation } from '../src/lib/koreograph/presentation.mjs';
import { renderAnimatedSvg, standaloneHtml } from '../src/lib/koreograph/render.mjs';
import { compileSpecialized, renderSpecialized, specializedHtml } from '../src/lib/koreograph/specialized.mjs';
import { THEMES } from '../src/lib/koreograph/themes.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const families=new Set(['timeline-lineage','tree','dag-proof','flow-path','causal-feedback','matrix-profile','state-flow','traceability','multiscale-layer','spatial']);
const sha=x=>createHash('sha256').update(x).digest('hex');
const demand=(ok,code)=>{if(!ok)throw new Error(code);};
const eq=(a,b)=>canonical(a)===canonical(b);
const safeCode=e=>/^KQ-[A-Z0-9-]+$/.test(e?.message)?e.message:'KQ-COMPILER-OR-CONTRACT';
const order=(a,b)=>a<b?-1:a>b?1:0;
export function parseOptions(args){
 const opts={base:'http://127.0.0.1:4321',out:null,python:'python',browsers:'chromium,firefox,webkit',ratio:'1:1',theme:'signature','max-kristals':'12','max-policies':'2','max-lenses':'1','max-recipes':'2','max-cases':'48',only:null};
 let consent=false,apiOnly=false;
 for(let i=0;i<args.length;i++){const k=args[i];if(k==='--catalogue-prive'){consent=true;continue;}if(k==='--api-only'){apiOnly=true;continue;}demand(k.startsWith('--')&&Object.hasOwn(opts,k.slice(2))&&args[i+1]&&!args[i+1].startsWith('--'),'KQ-OPTION');opts[k.slice(2)]=args[++i];}
 demand(consent&&opts.out,'KQ-CONSENT-AND-NEW-OUT');
 const u=new URL(opts.base);demand(u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password,'KQ-LOOPBACK-ONLY');opts.base=u.origin;
 for(const [k,max] of Object.entries({'max-kristals':24,'max-policies':5,'max-lenses':6,'max-recipes':8,'max-cases':120})){const n=Number(opts[k]);demand(Number.isInteger(n)&&n>=1&&n<=max,'KQ-BUDGET');opts[k]=n;}
 opts.browsers=opts.browsers.split(',');demand(opts.browsers.length===new Set(opts.browsers).size&&opts.browsers.every(x=>['chromium','firefox','webkit'].includes(x)),'KQ-BROWSER');
 demand(['1:1','16:9','9:16'].includes(opts.ratio)&&THEMES.some(x=>x.id===opts.theme),'KQ-PRESENTATION');
 opts.only=opts.only?opts.only.split(','):null;opts.apiOnly=apiOnly;return opts;
}
export function makeApi(base,token='',fetcher=fetch){
 return async(endpoint,kristal=null,payload=null,{expectRefusal=false}={})=>{
  demand(/^\/(?:api\/(?:kristals|bootstrap|query|navigation\/plan|navigation\/project|constellation))(?:\?readerPolicyRef=[^&]+)?$/.test(endpoint),'KQ-ENDPOINT');
  const response=await fetcher(base+endpoint,{method:payload===null?'GET':'POST',headers:{...(payload===null?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{}),...(kristal?{'X-Konstellation-Kristal':kristal}:{})},...(payload===null?{}:{body:JSON.stringify(payload)}),redirect:'error',signal:AbortSignal.timeout(45000)});
  if(expectRefusal){await response.body?.cancel();return response.status;}
  if(!response.ok){await response.body?.cancel();throw Error('KQ-HTTP-'+response.status);}
  // Never persist a raw DTO. Bound both HTTP bytes and subsequent compilation.
  const reader=response.body.getReader();let total=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;demand(total<=32*1024*1024,'KQ-RESPONSE-BUDGET');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 };
}
function verifyBoot(b,k,policy){demand(b.koreographAvailable===true&&typeof b.principal?.id==='string'&&b.principal.id!=='anonymous','KQ-LOCAL-KOREOGRAPH-OFF');demand(b.kristal===k&&b.synthetic===false,'KQ-NOT-REAL-SELECTED');demand(Array.isArray(b.entities)&&Array.isArray(b.lenses)&&Array.isArray(b.policies),'KQ-BOOTSTRAP');if(policy)demand(b.context?.readerPolicyRef===policy,'KQ-POLICY-MISMATCH');return b;}
function projectionEntities(p){
 const ids=[];const add=e=>{if(typeof e?.id==='string')ids.push(e.id);};
 if(['tree','dag','causal-feedback','flow','multiscale'].includes(p.projectionKind))for(const n of p.nodes||[])add(n);
 if(p.projectionKind==='traceability')for(const n of p.nodes||[])if(n.kind==='entity'&&n.entityId)ids.push(n.entityId);
 for(const x of [...(p.items||[]),...(p.records||[]),...(p.points||[]),...(p.places||[])]){add(x.entity);add(x.place);}
 if(p.projectionKind==='matrix')for(const x of p.rows||[])add(x);
 if(p.projectionKind==='multiscale')for(const m of p.memberships||[])ids.push(m.entityId);
 if(p.projectionKind==='state-flow')for(const t of p.transitions||[])ids.push(t.source,t.target);
 return ids;
}
export async function runCampaign(opts,{api,validate,runtime,progress=()=>{},save=async()=>{}}){
 const report={format:'koreograph.real-campaign/0.1',state:'running',publicationAuthorized:false,scope:'API locale réelle, compilation et contrôles SVG/HTML échantillonnés; pas de qualification exhaustive des droits, du composant Svelte, ni de publication.',settings:{ratio:opts.ratio,theme:opts.theme,browsers:opts.browsers,apiOnly:opts.apiOnly,limits:{kristals:opts['max-kristals'],policies:opts['max-policies'],lenses:opts['max-lenses'],recipes:opts['max-recipes'],cases:opts['max-cases']}},catalogue:{available:0,unavailable:0,selected:0,excluded:0},sources:[],cases:[],policyProbes:[],limitsHit:[],errors:[]};
 const limit=code=>{if(!report.limitsHit.includes(code))report.limitsHit.push(code);};
 const record=async c=>{report.cases.push(c);progress(`${c.id} ${c.kind} ${c.state}`);await save(report);};
 const job=async(meta,fn)=>{if(report.cases.length>=opts['max-cases']){limit('cases');return;}const c={id:'C'+String(report.cases.length+1).padStart(3,'0'),...meta,state:'fail',diagnostics:[],runtime:[]};try{await fn(c);if(!c.runtime.length)c.state='review';else if(c.runtime.some(x=>x.state==='fail'))c.state='fail';else if(c.runtime.some(x=>x.state!=='pass')||c.diagnostics.length||c.partial)c.state='review';else c.state='pass';}catch(e){c.diagnostics.push(safeCode(e));}await record(c);};
 async function qualify(c,svg,html){demand(Buffer.byteLength(svg)<=32*1024*1024&&Buffer.byteLength(html)<=32*1024*1024,'KQ-OUTPUT-BUDGET');c.svgSha256=sha(svg);c.htmlSha256=sha(html);if(!opts.apiOnly){c.runtime=await runtime(svg,html,c,opts);demand(c.runtime.length===opts.browsers.length,'KQ-RUNTIME-COUNT');}}
 try{
  const catalog=await api('/api/kristals');demand(catalog.selectable===true&&Array.isArray(catalog.items),'KQ-NO-LOCAL-CATALOG');
  const available=catalog.items.filter(x=>x.available===true&&typeof x.id==='string').sort((a,b)=>order(a.id,b.id));report.catalogue.available=available.length;report.catalogue.unavailable=catalog.items.length-available.length;
  const selected=opts.only?available.filter(x=>opts.only.includes(x.id)):available;demand(!opts.only||opts.only.every(id=>selected.some(x=>x.id===id)),'KQ-UNKNOWN-SELECTION');demand(selected.length,'KQ-NO-REAL-SOURCE');report.catalogue.excluded=available.length-selected.length;
  if(selected.length>opts['max-kristals'])limit('kristals');const picks=selected.slice(0,opts['max-kristals']);report.catalogue.selected=picks.length;
  for(const [i,item] of picks.entries()){
   const source={id:'K'+String(i+1).padStart(2,'0'),state:'review',policies:[],errors:[]};report.sources.push(source);progress(source.id+' lecture');
   const boots=[];
   if(report.cases.length>=opts['max-cases']){limit('cases');source.state='not-sampled';continue;}
   try{
    const initial=verifyBoot(await api('/api/bootstrap',item.id),item.id);const refs=[initial.context.readerPolicyRef,...initial.policies.filter(p=>p.available!==false).map(p=>p.ref)];const unique=[...new Set(refs)];if(unique.length>opts['max-policies'])limit('policies');source.availablePolicies=unique.length;source.unavailablePolicies=initial.policies.filter(p=>p.available===false).length;
    for(const [j,ref] of unique.slice(0,opts['max-policies']).entries()){
     const p={id:'P'+(j+1),state:'review',lenses:[],errors:[]};source.policies.push(p);if(report.cases.length>=opts['max-cases']){limit('cases');p.state='not-sampled';continue;}
     try{
      const b=ref===initial.context.readerPolicyRef?initial:verifyBoot(await api('/api/bootstrap?readerPolicyRef='+encodeURIComponent(ref),item.id),item.id,ref);demand(['datasetRef','registryRef','executionProfileRef'].every(key=>b.context[key]===initial.context[key]),'KQ-SOURCE-CONTEXT-CHANGED');const visible=new Set(b.entities.map(e=>e.id));boots.push({b,visible,p});p.visibleEntities=visible.size;
      const types=new Set(b.entities.map(e=>e.type));const lenses=b.lenses.filter(l=>types.has(l.rootType));p.availableLenses=lenses.length;if(lenses.length>opts['max-lenses'])limit('lenses');
      for(const [n,lens] of lenses.slice(0,opts['max-lenses']).entries()){
       const l={id:'L'+(n+1),state:'review',errors:[],availableRecipes:0};p.lenses.push(l);if(report.cases.length>=opts['max-cases']){limit('cases');l.state='not-sampled';continue;}const meta={source:source.id,policy:p.id,lens:l.id};
       try{
        const query={schemaVersion:'0.2',context:b.context,selection:{entityType:lens.rootType,filters:[],links:[]},order:'entity_id_asc',pageSize:Math.min(24,b.policies.find(x=>x.ref===ref)?.defaultPageSize||24)};validate('query-spec',query);
        const result=await api('/api/query',item.id,{query});validate('result-set',result);demand(eq(result.context,b.context),'KQ-QUERY-CONTEXT');demand(result.rows.every(row=>visible.has(row.entityId)),'KQ-QUERY-ENTITY-NOT-VISIBLE');
        const focus=result.rows[0]?.entityId;if(!focus){l.state='empty';continue;}
        const request={query,lensRef:lens.id,selectedEntityId:null};const plan=await api('/api/navigation/plan',item.id,request);validate('navigation-plan',plan);demand(plan.lensRef===lens.id&&plan.entityType===lens.rootType,'KQ-PLAN-CONTEXT');
        const recipes=plan.views.filter(v=>families.has(v.rendererId));l.availableRecipes=recipes.length;if(recipes.length>opts['max-recipes'])limit('recipes');
        await job({...meta,kind:'orbital'},async c=>{
         const src=sourceOf(b.context,lens.id,item.id),start={focus:{kind:'entity',id:focus},groupId:null},cache=new Map();
         const resolver=async t=>{const key=targetKey(t);if(!cache.has(key)){const raw=await api('/api/constellation',item.id,{context:b.context,lensRef:lens.id,...t,limit:10});validate('constellation-response',raw);const norm=normalizeProjection(raw,t,src);for(const x of [norm.target,...norm.satellites.map(s=>s.target)])if(x.focus.kind==='entity')demand(visible.has(x.focus.id),'KQ-ORBITAL-ENTITY-NOT-VISIBLE');cache.set(key,raw);}return structuredClone(cache.get(key));};
         const score=makeScore(src,start,{aspectRatio:opts.ratio,maxHops:2,seed:42});const bundle=await compileScore(score,resolver);demand(eq(bundle,await compileScore(score,resolver)),'KQ-NONDETERMINISTIC');demand(bundle.provenance.publicationAuthorized===false,'KQ-AUTHORITY');
         const steps=[{action:'focus',target:start}];const first=normalizeProjection(await resolver(start),start,src).satellites.find(x=>targetKey(x.target)!==targetKey(start));if(first)steps.push({action:'follow',target:first.target});steps.push({action:'hold',durationMs:500});for(const mode of ['script','capture']){const v=await compileScore(makeScore(src,start,{aspectRatio:opts.ratio,mode,steps}),resolver);demand(v.provenance.publicationAuthorized===false,'KQ-AUTHORITY');}c.modes=first?['auto','script','capture']:['auto','script-static','capture-static'];
         let rejected=false;try{normalizeProjection({...await resolver(start),context:{...b.context,readerPolicyRef:b.context.readerPolicyRef+'-invalid'}},start,src);}catch{rejected=true;}demand(rejected,'KQ-STALE-CONTEXT-ACCEPTED');
         const {plan:pres}=await compileOptimizedPresentation(bundle,{themeId:opts.theme});c.scenes=bundle.scenes.length;c.partial=bundle.scenes.some(s=>s.truncated);c.diagnostics.push(...pres.qa.diagnostics.map(x=>x.code).filter(x=>x!=='Q-NOT-RUNTIME-TESTED'));demand(pres.qa.state!=='fail','KQ-PRESENTATION-FAIL');await qualify(c,renderAnimatedSvg(bundle,pres),standaloneHtml(bundle,pres));
        });
        for(const recipe of recipes.slice(0,opts['max-recipes']))await job({...meta,kind:'specialized',recipe:recipe.id,renderer:recipe.rendererId},async c=>{
         const dto=await api('/api/navigation/project',item.id,{...request,recipeId:recipe.id,pageSize:48,nodeBudget:100,edgeBudget:150});validate('navigation-projection',dto);demand(dto.recipeId===recipe.id&&dto.rendererId===recipe.rendererId,'KQ-PROJECTION-RECIPE');demand(projectionEntities(dto).every(id=>visible.has(id)),'KQ-PROJECTION-ENTITY-NOT-VISIBLE');
         const story=compileSpecialized(dto,{aspectRatio:opts.ratio});demand(eq(story,compileSpecialized(dto,{aspectRatio:opts.ratio})),'KQ-NONDETERMINISTIC');demand(story.publicationAuthorized===false&&story.authoritative===false,'KQ-AUTHORITY');c.family=story.projectionKind;c.mode=story.mode;c.pages=story.pages.length;c.partial=story.partial;c.omitted=story.omitted;c.empty=!story.pages.some(p=>p.cards.length);if(c.empty)c.diagnostics.push('KQ-EMPTY-PROJECTION');await qualify(c,renderSpecialized(story,{themeId:opts.theme}),specializedHtml(story,{themeId:opts.theme}));
        });
        l.state='sampled';
       }catch(e){l.state='fail';l.errors.push(safeCode(e));report.errors.push({source:source.id,policy:p.id,lens:l.id,code:safeCode(e)});}
      }
      p.state='sampled';
     }catch(e){p.state='fail';p.errors.push(safeCode(e));report.errors.push({source:source.id,policy:p.id,code:safeCode(e)});}
    }
    // A known entity visible under a different available policy must not be disclosed under the restricted one.
    for(const a of boots)for(const b of boots)if(a!==b){const hidden=b.b.entities.find(e=>!a.visible.has(e.id));const probe={source:source.id,policy:a.p.id,comparison:b.p.id,state:'not-applicable'};if(hidden){const lens=a.b.lenses.find(x=>x.rootType===hidden.type)||a.b.lenses[0];if(lens){try{const status=await api('/api/constellation',item.id,{context:a.b.context,lensRef:lens.id,focus:{kind:'entity',id:hidden.id},groupId:null,limit:5},{expectRefusal:true});const unknown=await api('/api/constellation',item.id,{context:a.b.context,lensRef:lens.id,focus:{kind:'entity',id:'koreograph-qualification-absent:'+sha(hidden.id).slice(0,24)},groupId:null,limit:5},{expectRefusal:true});probe.httpStatus=status;probe.unknownHttpStatus=unknown;probe.state=status===404&&unknown===404?'pass':'fail';}catch(e){probe.state='fail';probe.code=safeCode(e);}}}report.policyProbes.push(probe);}
    source.state='sampled';
   }catch(e){source.state='fail';source.errors.push(safeCode(e));report.errors.push({source:source.id,code:safeCode(e)});}
   await save(report);
  }
 }catch(e){report.errors.push({code:safeCode(e)});}
 report.summary={sources:report.sources.length,cases:report.cases.length,pass:report.cases.filter(c=>c.state==='pass').length,review:report.cases.filter(c=>c.state==='review').length,fail:report.cases.filter(c=>c.state==='fail').length,runtimeChecks:report.cases.reduce((n,c)=>n+c.runtime.length,0),policyPass:report.policyProbes.filter(x=>x.state==='pass').length,policyFail:report.policyProbes.filter(x=>x.state==='fail').length,families:[...new Set(report.cases.filter(c=>c.family).map(c=>c.family))].sort()};
 if(!report.summary.families.length)limit('no-specialized-sampled');if(!report.cases.some(c=>c.kind==='orbital'&&c.scenes>1))limit('no-orbital-travel-sampled');
 report.state=report.errors.length||report.summary.fail||report.summary.policyFail||!report.cases.length?'fail':report.summary.review||report.limitsHit.length||!report.summary.policyPass?'review':'pass';await save(report);return report;
}
async function runtime(svg,html,c,opts){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kg-real-'));try{const file=path.join(dir,'animation.svg'),player=path.join(dir,'animation.html');await fs.writeFile(file,svg,{mode:0o600});await fs.writeFile(player,html,{mode:0o600});const results=[];const env={...process.env};delete env.KOREOGRAPH_QUALIFICATION_TOKEN;for(const browser of opts.browsers){const proc=spawnSync(opts.python,[path.join(here,'koreograph-real-browser.py'),file,player,'--browser',browser,'--kind',c.kind],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024,windowsHide:true,env});try{const r=JSON.parse(proc.stdout);demand([0,1,2].includes(proc.status)&&r.sha256===c.svgSha256&&['pass','review','fail'].includes(r.state)&&(r.state==='fail'||r.html?.sha256===c.htmlSha256),'KQ-RUNTIME-RECEIPT');results.push(r);}catch{results.push({browser,state:'fail',diagnostics:['KQ-RUNTIME-EXECUTION']});}}return results;}finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function main(){const opts=parseOptions(process.argv.slice(2));const {validate}=await import('../server/contracts.mjs');await fs.mkdir(opts.out);const output=path.join(opts.out,'qualification.json');const save=async r=>{const tmp=path.join(opts.out,'qualification.tmp');await fs.writeFile(tmp,JSON.stringify(r,null,2)+'\n',{mode:0o600});await fs.rename(tmp,output);};const token=process.env.KOREOGRAPH_QUALIFICATION_TOKEN||'';const r=await runCampaign(opts,{api:makeApi(opts.base,token),validate,runtime,save,progress:console.log});console.log(JSON.stringify({state:r.state,summary:r.summary,limitsHit:r.limitsHit,report:output},null,2));process.exitCode=r.state==='pass'?0:r.state==='review'?2:1;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(safeCode(e));process.exitCode=1;});
