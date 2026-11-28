#!/usr/bin/env node
// Inventory of the actual authorized local reader, not an assessment of canonical truth.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeApi } from './koreograph-qualify-real.mjs';
import { technicalReaderView } from '../src/lib/reader-presentation.mjs';
import { canonical } from '../src/lib/koreograph/engine.mjs';
const demand=(ok,code)=>{if(!ok)throw new Error(code);};
const code=e=>/^(KA|KQ)-[A-Z0-9-]+$/.test(e?.message)?e.message:'KA-READER-OR-CONTRACT';
const same=(a,b)=>canonical(a)===canonical(b);
export async function audit({api,validate,save=async()=>{},progress=()=>{},maxLenses=3}){
  const report={format:'konstellation.reader-audit/1',state:'running',publicationAuthorized:false,
    scope:'Catalogue autorisé / politique par défaut / trois perspectives maximum / première page et premier focus. Aucun jugement sur le contenu canonique non exposé.', entries:[],summary:{},errors:[]};
  try{
    const cat=await api('/api/kristals');
    demand(cat.selectable===true&&Array.isArray(cat.items)&&cat.items.length<=2000,'KA-CATALOGUE');
    demand(cat.items.every(x=>typeof x.id==='string'&&typeof x.label==='string')&&new Set(cat.items.map(x=>x.id)).size===cat.items.length,'KA-CATALOGUE-IDENTITY');
    for(const [i,item] of cat.items.entries()){
      // Reader IDs and catalogue names are local inventory data. No entity labels,
      // assertions, raw DTOs, tokens or canonical file paths are written.
      const e={index:i+1,readerId:item.id,title:item.label,state:'non-disponible',visibleEntities:0,technicalEntities:0,eligibleLenses:0,policiesAvailable:0,observations:[],errors:[]};
      report.entries.push(e);
      if(item.available===true){
        try{
          const b=await api('/api/bootstrap',item.id);
          demand(b.kristal===item.id&&b.principal?.id&&b.principal.id!=='anonymous'&&Array.isArray(b.entities)&&Array.isArray(b.lenses)&&Array.isArray(b.registry?.entityTypes)&&Array.isArray(b.policies)&&b.context?.readerPolicyRef,'KA-BOOTSTRAP');
          const visible=new Map(b.entities.map(x=>[x.id,x.type]));
          demand(visible.size===b.entities.length&&b.entities.every(x=>typeof x.id==='string'&&typeof x.type==='string'),'KA-ENTITY-IDENTITY');
          const nontechnical=b.entities.filter(x=>!technicalReaderView(b,x.type));
          e.visibleEntities=b.entities.length;e.technicalEntities=e.visibleEntities-nontechnical.length;
          e.policiesAvailable=b.policies.filter(p=>p.available!==false).length;
          const types=new Set(nontechnical.map(x=>x.type));
          const lenses=b.lenses.filter(l=>types.has(l.rootType)&&!technicalReaderView(b,l.rootType));
          e.eligibleLenses=lenses.length;
          if(technicalReaderView(b)|| (e.visibleEntities>0&&!nontechnical.length))e.state='structure-technique';
          else if(b.synthetic!==false)e.state='synthetique-ou-non-confirme';
          else if(!e.visibleEntities)e.state='vide-dans-la-vue';
          else if(!lenses.length)e.state='sans-perspective-observee';
          else{
            e.state='contenu-a-verifier';
            for(const lens of lenses.slice(0,maxLenses)){
              const o={index:e.observations.length+1,lensId:lens.id,rows:0,entityNeighbors:0,specializedViews:0,partial:false};e.observations.push(o);
              try{
                const query={schemaVersion:'0.2',context:b.context,selection:{entityType:lens.rootType,filters:[],links:[]},order:'entity_id_asc',pageSize:Math.min(24,b.policies.find(x=>x.ref===b.context.readerPolicyRef)?.defaultPageSize||24)};
                validate('query-spec',query);const result=await api('/api/query',item.id,{query});validate('result-set',result);
                demand(same(result.context,b.context)&&result.rows.every(r=>visible.get(r.entityId)===lens.rootType),'KA-QUERY-CONTEXT');o.rows=result.rows.length;
                if(!o.rows)continue;
                const plan=await api('/api/navigation/plan',item.id,{query,lensRef:lens.id,selectedEntityId:null});validate('navigation-plan',plan);
                demand(plan.lensRef===lens.id&&plan.entityType===lens.rootType,'KA-PLAN-CONTEXT');
                o.specializedViews=plan.views.filter(v=>['timeline-lineage','tree','dag-proof','flow-path','causal-feedback','matrix-profile','state-flow','traceability','multiscale-layer','spatial'].includes(v.rendererId)).length;
                const focus={kind:'entity',id:result.rows[0].entityId};
                const orbit=await api('/api/constellation',item.id,{context:b.context,lensRef:lens.id,focus,groupId:null,limit:12});validate('constellation-response',orbit);
                demand(same(orbit.context,b.context)&&same(orbit.focus,focus),'KA-CONSTELLATION-CONTEXT');
                const neighbors=orbit.satellites.map(s=>s.target.focus).filter(f=>f.kind==='entity');
                demand(neighbors.every(f=>visible.has(f.id)),'KA-ENTITY-NOT-VISIBLE');
                o.entityNeighbors=new Set(neighbors.filter(f=>f.id!==focus.id&&!technicalReaderView(b,visible.get(f.id))).map(f=>f.id)).size;
                o.partial=orbit.truncated===true;
              }catch(err){o.error=code(err);e.errors.push(o.error);}
            }
            if(e.errors.length)e.state='audit-incomplet';
            else if(e.observations.some(o=>o.entityNeighbors>0))e.state='navigation-observee';
            else if(e.observations.some(o=>o.rows>0))e.state='entites-observees';
            else e.state='aucun-resultat-echantillonne';
          }
        }catch(err){e.state='lecture-non-confirmee';e.errors.push(code(err));}
      }
      progress(`${e.index}/${cat.items.length} ${e.title} : ${e.state}`);await save(report);
    }
  }catch(err){report.errors.push(code(err));}
  report.summary=Object.fromEntries([...new Set(report.entries.map(e=>e.state))].sort().map(s=>[s,report.entries.filter(e=>e.state===s).length]));
  report.state=report.errors.length?'fail':report.entries.some(e=>e.errors.length)?'review':'complete';
  await save(report);return report;
}
async function main(){
  const args=process.argv.slice(2);
  demand(args.length===3&&args[0]==='--catalogue-prive'&&args[1]==='--out'&&args[2],'KA-CONSENT-AND-NEW-OUT');
  const dir=path.resolve(args[2]);await fs.mkdir(dir);
  const {validate}=await import('../server/contracts.mjs');
  const output=path.join(dir,'audit.json');
  const save=async r=>{const tmp=path.join(dir,'audit.tmp');await fs.writeFile(tmp,JSON.stringify(r,null,2)+'\n',{mode:0o600});await fs.rename(tmp,output);};
  const result=await audit({api:makeApi('http://127.0.0.1:4321',process.env.KOREOGRAPH_QUALIFICATION_TOKEN||''),validate,save,progress:console.log});
  // Shareable inventory has names and counts, but not reader/lens identifiers.
  const shared={...result,entries:result.entries.map(({readerId,observations,...e})=>({...e,observations:observations.map(({lensId,...o})=>o)}))};
  await fs.writeFile(path.join(dir,'audit-partage.json'),JSON.stringify(shared,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({state:result.state,entries:result.entries.length,summary:result.summary},null,2));
  process.exitCode=result.state==='fail'?1:result.state==='review'?2:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(code(e));process.exitCode=1;});
