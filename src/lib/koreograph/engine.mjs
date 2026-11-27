// Koreograph 0.1 — pure navigation compiler; no direct access to Kristal storage.
import { layoutConstellation } from '../constellation/layout.js';
export const VERSION = '0.2.0';
const KINDS = ['entity','concept','source','value','group'];
const FIELDS = ['datasetRef','registryRef','readerPolicyRef','executionProfileRef'];
const check = (ok, message) => { if (!ok) throw new Error(message); };
const str = (v,n=1000) => typeof v==='string' && v.length>0 && v.length<=n;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function canonical(value) {
  if (value===null || typeof value!=='object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export function targetOf(t) {
  const f=t?.focus; const g=t?.groupId;
  check(f && (g===null || typeof g==='string' && g.length<=300),'Cible invalide.');
  const kinds={entity:['id'],source:['id'],qualifier:['predicate','key'],'relation-value':['relation','key']};
  const keys=Object.hasOwn(kinds,f.kind)?kinds[f.kind]:null;
  check(Array.isArray(keys)&&keys.every(k=>str(f[k],k==='key'?2048:k==='id'?1000:500)), 'Focus invalide.');
  check(exact(f,['kind',...keys]),'Champs de focus inattendus.');
  const focus={kind:f.kind}; for(const k of keys) focus[k]=f[k];
  return {focus,groupId:g};
}
export const targetKey=t=>canonical(targetOf(t));
export function sourceOf(context,lensRef,kristalRef) {
  const source={}; for(const k of FIELDS){check(str(context?.[k]),'Contexte de lecture incomplet.');source[k]=context[k];}
  check(str(lensRef),'Lens manquante.');source.lensRef=lensRef;
  if(kristalRef){check(str(kristalRef,200),'Kristal invalide.');source.kristalRef=kristalRef;} return source;
}
export function normalizeProjection(raw, target, source) {
  check(raw?.schemaVersion==='0.1' && FIELDS.every(k=>raw.context?.[k]===source[k]), 'Projection hors contexte.');
  check(targetKey(raw)===targetKey(target),'Projection hors cible.');
  const node=n=>{check(KINDS.includes(n?.kind)&&str(n.label,500)&&n.label.trim().length>0,'Objet de projection invalide.');return {kind:n.kind,label:n.label};};
  check(Array.isArray(raw.satellites)&&raw.satellites.length<=25&&typeof raw.truncated==='boolean','Projection invalide.');
  return {target:targetOf(target),center:node(raw.center),satellites:raw.satellites.map(n=>{
    check(str(n.id,2200)&&Number.isFinite(n.salience?.score),'Satellite invalide.');
    return {...node(n),id:n.id,target:targetOf(n.target),score:n.salience.score};
  }),truncated:raw.truncated};
}
export function makeScore(source,start,opts={}) {
  const presentation={style:opts.style||'cinematic',durationMs:opts.durationMs??'auto',aspectRatio:opts.aspectRatio||'16:9',density:opts.density??5};
  const base={format:'koreograph.score/0.1',title:opts.title||'Exploration sémantique',locale:opts.locale==='en'?'en':'fr',source:sourceOf(source,source.lensRef,source.kristalRef),presentation};
  return opts.steps?{...base,mode:opts.mode||'script',steps:opts.steps}:{...base,mode:'auto',auto:{start:targetOf(start),recipe:opts.recipe||'exploration',maxHops:opts.maxHops??3,seed:opts.seed??0}};
}
export function validateScore(s){
  check(exact(s,['format','title','locale','source','presentation','mode',s?.mode==='auto'?'auto':'steps']),'Champs de Score inattendus.');
  check(s?.format==='koreograph.score/0.1'&&str(s.title,500)&&['fr','en'].includes(s.locale),'Score invalide.');
  check(canonical(s.source)===canonical(sourceOf(s.source,s.source?.lensRef,s.source?.kristalRef)),'Source invalide.');
  const p=s.presentation;
  check(exact(p,['style','durationMs','aspectRatio','density'])&&['minimal','cinematic','didactic'].includes(p.style)&&['16:9','9:16','1:1'].includes(p.aspectRatio)&&Number.isInteger(p.density)&&p.density>=3&&p.density<=10&&(p.durationMs==='auto'||Number.isInteger(p.durationMs)&&p.durationMs>=1000&&p.durationMs<=120000),'Présentation invalide.');
  if(s.mode==='auto'){const a=s.auto;check(exact(a,['start','recipe','maxHops','seed'])&&['exploration','association'].includes(a.recipe)&&Number.isInteger(a.maxHops)&&a.maxHops>=1&&a.maxHops<=6&&Number.isInteger(a.seed)&&a.seed>=0&&a.seed<=4294967295,'Parcours auto invalide.');check(exact(a.start,['focus','groupId']),'Cible invalide.');targetOf(a.start);}
  else {check(['script','capture'].includes(s.mode)&&Array.isArray(s.steps)&&s.steps.length>=1&&s.steps.length<=12&&s.steps[0]?.action==='focus','Partition invalide.');s.steps.forEach((a,i)=>{check(i===0||['follow','hold','reveal'].includes(a.action),'Action non supportée.');if(['focus','follow'].includes(a.action)){check(exact(a,['action','target'])&&exact(a.target,['focus','groupId']),'Cible invalide.');targetOf(a.target);}else if(a.action==='hold')check(exact(a,['action','durationMs'])&&Number.isInteger(a.durationMs)&&a.durationMs>=250&&a.durationMs<=10000,'Pause invalide.');else check(exact(a,['action','limit'])&&Number.isInteger(a.limit)&&a.limit>=3&&a.limit<=10,'Densité invalide.');});}
  return s;
}
function hash(s,seed){let h=2166136261^seed;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
export function chooseNext(projection,seen,recipe,seed) {
  const candidates=projection.satellites.filter(n=>!seen.has(targetKey(n.target)));
  return candidates.sort((a,b)=> (recipe==='association'? Number(b.kind==='entity'||b.kind==='concept')-Number(a.kind==='entity'||a.kind==='concept'):0) || b.score-a.score || hash(targetKey(a.target),seed)-hash(targetKey(b.target),seed)||cmp(targetKey(a.target),targetKey(b.target)))[0]?.target;
}
const viewport=ratio=>ratio==='9:16'?{width:900,height:1600,aspectRatio:ratio}:ratio==='1:1'?{width:1080,height:1080,aspectRatio:ratio}:{width:1600,height:900,aspectRatio:ratio};
// The source target is identity, except ambiguous repeated targets: distinct occurrences are not merged.
function sceneFor(proj,v,id,limit,previous,preferred, warnings){
  const centerKey=targetKey(proj.target), cx=v.width/2,cy=v.height/2;
  const max=v.aspectRatio==='9:16'?6:10;const budget=Math.min(limit,max);
  const unique=new Map(); for(const n of proj.satellites){const key=targetKey(n.target);unique.set(key,(unique.get(key)||0)+1);}
  let nodes=proj.satellites.map((n,i)=>({...n,key:unique.get(targetKey(n.target))===1&&targetKey(n.target)!==centerKey?targetKey(n.target):canonical([id,n.id,i])}));
  const preferredKey=preferred&&targetKey(preferred);
  if(preferredKey&&budget>0){const ix=nodes.findIndex(n=>targetKey(n.target)===preferredKey);if(ix>=budget){const [n]=nodes.splice(ix,1);nodes.splice(budget-1,0,n);}}
  const truncated=proj.truncated||nodes.length>budget;
  if(proj.truncated)warnings.add('SOURCE_TRUNCATED');if(nodes.length>budget)warnings.add('PRESENTATION_TRUNCATED');nodes=nodes.slice(0,budget);
  const slots=layoutConstellation(nodes,v.width,v.height,cx,cy).map(n=>({x:cx+(n.x-cx)*(v.aspectRatio==='9:16'?0.75:1.35),y:cy+(n.y-cy)*(v.aspectRatio==='9:16'?1.75:1.12)}));
  const old=new Map((previous?.objects||[]).map(n=>[n.key,n]));const assigned=new Map();
  // Reserve a slot away from the incoming focus corridor for the outgoing center.
  // Straight paths must not exchange places head-on merely to minimize travel.
  const incoming=old.get(centerKey), outgoing=nodes.find(n=>n.key===previous?.focusKey);
  if(incoming&&outgoing&&previous.focusKey!==centerKey&&slots.length){
    const dx=incoming.x-cx,dy=incoming.y-cy,len=Math.hypot(dx,dy);
    if(len>1){let best=0;const cost=p=>((p.x-cx)*dx+(p.y-cy)*dy)/len;
      for(let i=1;i<slots.length;i++)if(cost(slots[i])<cost(slots[best]))best=i;
      assigned.set(outgoing.key,slots.splice(best,1)[0]);}
  }
  for(const n of nodes.filter(n=>old.has(n.key)&&!assigned.has(n.key))){const p=old.get(n.key);let best=0;for(let i=1;i<slots.length;i++)if((slots[i].x-p.x)**2+(slots[i].y-p.y)**2<(slots[best].x-p.x)**2+(slots[best].y-p.y)**2)best=i;assigned.set(n.key,slots.splice(best,1)[0]);}
  for(const n of nodes)if(!assigned.has(n.key))assigned.set(n.key,slots.shift());
  const center={key:centerKey,...proj.center,role:'center',x:cx,y:cy,radius:48,opacity:1};
  const objects=[center,...nodes.map(n=>({key:n.key,label:n.label,kind:n.kind,role:'satellite',...assigned.get(n.key),radius:29,opacity:1}))];
  const boxes=objects.map(n=>({x:n.x-Math.max(n.radius,Math.min(22,n.label.length)*7.7),y:n.y-n.radius,w:2*Math.max(n.radius,Math.min(22,n.label.length)*7.7),h:2*n.radius+(n.label.length>22?66:37)}));
  const collision=boxes.some((a,i)=>boxes.some((b,j)=>j>i&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h));
  if(collision&&budget>3){warnings.add('PRESENTATION_TRUNCATED');return sceneFor(proj,v,id,budget-1,previous,preferred,warnings);}
  return {id,focusKey:centerKey,objects,links:objects.slice(1).map(n=>({key:canonical([centerKey,n.key].sort()),from:centerKey,to:n.key,kind:'navigation'})),truncated};
}
export async function compileScore(score,resolve,{signal}={}){
  validateScore(score);score=JSON.parse(JSON.stringify(score));const warnings=new Set(), visits=[];const p=score.presentation;const v=viewport(p.aspectRatio);
  const abort=()=>{if(signal?.aborted)throw new Error('Production annulée.');};
  async function read(t){abort();const raw=await resolve(targetOf(t),signal);abort();return normalizeProjection(raw,t,score.source);}
  if(score.mode==='auto'){
    let target=score.auto.start;const seen=new Set();for(let i=0;i<=score.auto.maxHops;i++){const proj=await read(target);seen.add(targetKey(target));visits.push({action:i?'follow':'focus',proj,limit:p.density});if(i===score.auto.maxHops)break;target=chooseNext(proj,seen,score.auto.recipe,score.auto.seed);if(!target){warnings.add('EARLY_STOP');break;}}
  }else{
    let current;for(const step of score.steps){if(step.action==='hold'){visits.push(step);continue;}if(step.action==='reveal'){visits.push({action:'reveal',proj:current,limit:step.limit});continue;}
      if(current&&!current.satellites.some(n=>targetKey(n.target)===targetKey(step.target))){if(score.mode==='capture'){warnings.add('NEUTRAL_FADE');}else throw new Error('Parcours non attesté par la projection précédente.');}
      const neutral=current&&!current.satellites.some(n=>targetKey(n.target)===targetKey(step.target));current=await read(step.target);visits.push({action:neutral?'fade':step.action,proj:current,limit:p.density});}
  }
  const scenes=[],segments=[];let time=0,last;
  const segment=(a,b,ms,primitive)=>{segments.push({fromScene:a.id,toScene:b.id,startMs:time,endMs:time+ms,primitive,easing:primitive==='hold'?'linear':'smoothstep'});time+=ms;};
  for(let i=0;i<visits.length;i++){
    const visit=visits[i];if(visit.action==='hold'){segment(last,last,visit.durationMs,'hold');continue;}
    const next=visits.slice(i+1).find(x=>x.proj&&x.action!=='reveal');const explicitReveal=visits[i+1]?.action==='reveal'&&visit.action!=='reveal';const scene=sceneFor(visit.proj,v,'s'+(scenes.length+1),explicitReveal?0:visit.limit,last,next?.proj.target,warnings);scenes.push(scene);
    const neutral=last&&visit.action!=='reveal'&&(visit.action==='fade'||!last.objects.some(n=>n.key===scene.focusKey));if(neutral)warnings.add('NEUTRAL_FADE');
    const rhythm=p.style==='minimal'?.8:p.style==='didactic'?1.25:1;
    if(last)segment(last,scene,Math.round((visit.action==='reveal'?900:1400)*rhythm),neutral?'fade':visit.action==='reveal'?'reveal':'focus');
    segment(scene,scene,Math.round((last?clamp(1000+45*scene.objects.reduce((n,o)=>n+o.label.split(/\s+/).length,0)+100*scene.objects.length,1200,4200):1200)*rhythm),'hold');last=scene;
  }
  if(p.durationMs!=='auto') {check(p.durationMs>=segments.length*250,'Durée trop courte pour le parcours.');let prev=0;for(let i=0;i<segments.length;i++){const s=segments[i];const end=i===segments.length-1?p.durationMs:Math.round(s.endMs*p.durationMs/time);check(end-prev>=250,'Durée trop courte pour un segment.');s.startMs=prev;s.endMs=end;prev=end;}time=p.durationMs;}
  check(time<=120000&&scenes.length<=24&&segments.length<=48,'Budget de production dépassé.');
  const aliases=new Map();const compact=k=>{if(k.length<=4096)return k;if(!aliases.has(k))aliases.set(k,'kg:long:'+aliases.size);return aliases.get(k);};
  for(const scene of scenes){scene.focusKey=compact(scene.focusKey);for(const n of scene.objects)n.key=compact(n.key);for(const l of scene.links){l.key=compact(l.key);l.from=compact(l.from);l.to=compact(l.to);}}
  return {format:'koreograph.bundle/0.1',title:score.title,locale:score.locale,provenance:{source:score.source,konstellationVersion:'1.0.0-rc.2',compilerVersion:VERSION,adapterVersion:VERSION,derived:true,authoritative:false,publicationAuthorized:false},viewport:v,durationMs:time,scenes,segments,warnings:[...warnings],style:p.style};
}
export function frameAt(bundle,t,{motion='standard'}={}){
  t=clamp(Number.isFinite(t)?t:0,0,bundle.durationMs);const s=bundle.segments.find(x=>t<x.endMs)||bundle.segments.at(-1);const a=bundle.scenes.find(x=>x.id===s.fromScene),b=bundle.scenes.find(x=>x.id===s.toScene);
  const duration=s.endMs-s.startMs, u=clamp((t-s.startMs)/duration,0,1);
  // Anticipation: one small, windowed axial oscillation of the incoming focus.
  // Everyone else waits; no camera motion, rotation, or transverse offset.
  const anticipate=motion!=='reduced'&&s.primitive==='focus'?Math.min(320,duration*.25):0;
  const elapsed=t-s.startMs, prep=anticipate>0&&elapsed<anticipate;
  const travel=clamp((elapsed-anticipate)/(duration-anticipate),0,1);
  const q=motion==='reduced'?(u===1?1:0):s.easing==='smoothstep'?travel*travel*(3-2*travel):travel;
  const mix=(x,y,z=q)=>x+(y-x)*z;const byA=new Map(a.objects.map(n=>[n.key,n])),byB=new Map(b.objects.map(n=>[n.key,n]));const nodes=[];
  for(const key of new Set([...byA.keys(),...byB.keys()])){let x=byA.get(key),y=byB.get(key);if(!x)x={...y,opacity:0};if(!y)y={...x,opacity:0};let z=q;if(s.primitive==='reveal'&&!byA.has(key)&&motion!=='reduced'){const i=b.objects.findIndex(n=>n.key===key);z=clamp((u-i*.035)/.65,0,1);z=z*z*(3-2*z);}const pick=z<.5?x:y;
    const fade=s.primitive==='fade';let alpha=fade?(q<.5?x.opacity*(1-q*2):y.opacity*(q*2-1)):mix(x.opacity,y.opacity,z);
    if(s.primitive==='focus'&&motion!=='reduced'){if(!byA.has(key))alpha=y.opacity*clamp((q-.48)/.52,0,1);else if(!byB.has(key))alpha=x.opacity*clamp(1-q/.48,0,1);}
    // One scalar progress for both coordinates: a straight segment, never an arc.
    let px=fade?pick.x:mix(x.x,y.x,z),py=fade?pick.y:mix(x.y,y.y,z);
    if(prep&&key===b.focusKey&&byA.has(key)&&byB.has(key)){
      const dx=y.x-x.x,dy=y.y-x.y,len=Math.hypot(dx,dy),v=elapsed/anticipate;
      if(len>1){const offset=Math.min(16,len*.06)*Math.sin(2*Math.PI*v)*Math.sin(Math.PI*v)**2;
        px+=dx/len*offset;py+=dy/len*offset;}
    }
    nodes.push({...pick,x:px,y:py,radius:fade?pick.radius:mix(x.radius,y.radius,z),opacity:alpha,focus:mix(byA.has(key)&&x.role==='center'?1:0,byB.has(key)&&y.role==='center'?1:0,z)});}
  if(s.primitive==='focus'&&q>0&&q<1){const active=nodes.filter(n=>n.focus>0.02);for(const n of nodes.filter(n=>n.focus<0.02)){let factor=1;for(const a of active){const dx=Math.abs(n.x-a.x),dy=Math.abs(n.y-a.y);if(dx<230&&dy<145)factor=Math.min(factor,clamp(Math.max(dx/230,dy/145)**2,.05,1));}n.opacity*=factor;}}
  const map=new Map(nodes.map(n=>[n.key,n])),aa=new Map(a.links.map(l=>[l.key,l])),bb=new Map(b.links.map(l=>[l.key,l]));const links=[];
  for(const key of new Set([...aa.keys(),...bb.keys()])){const l=aa.get(key)||bb.get(key),x=map.get(l.from),y=map.get(l.to);links.push({...l,x1:x.x,y1:x.y,x2:y.x,y2:y.y,opacity:Math.min(x.opacity,y.opacity,s.primitive==='fade'?(q<.5?Number(aa.has(key))*(1-2*q):Number(bb.has(key))*(2*q-1)):mix(aa.has(key)?1:0,bb.has(key)?1:0))});}
  return {t,segment:s,scene:q<.5?a:b,nodes,links};
}
