// Specialized, derived projection storyboard. Input must have passed the public
// navigation-projection/1.0 schema. No storage access, policy elevation or inference.
import { optionsFor, sha256Portable } from './presentation.mjs';
import { canonical } from './engine.mjs';
import { xml } from './render.mjs';
export const SPECIALIZED_VERSION='0.3.4';
const kinds=['tree','dag','causal-feedback','timeline-lineage','matrix','traceability','flow','multiscale','state-flow','spatial'];
const require=(c,m)=>{if(!c)throw Error('Projection Koreograph : '+m);};
const list=(v,max=2400)=>{require(Array.isArray(v)&&v.length<=max,'tableau absent ou hors budget');return v;};
const str=v=>{require(typeof v==='string'&&v.trim()&&v.length<=2000,'texte invalide');return v;};
const scalar=v=>v===null?'null':['string','number','boolean'].includes(typeof v)&&!(typeof v==='number'&&!Number.isFinite(v))&&String(v).length<=2000?String(v):null;
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const unique=(values,fn)=>{const m=new Map();for(const x of values){const key=str(fn(x));require(!m.has(key),'identifiant répété');m.set(key,x);}return m;};
const titleFor={tree:'Relations hiérarchiques',dag:'Dépendances et convergence','causal-feedback':'Relations et causalité', 'timeline-lineage':'Repères temporels',matrix:'Comparaison de valeurs',traceability:'Traçabilité',flow:'Relations de parcours',multiscale:'Appartenances', 'state-flow':'États observés',spatial:'Repères spatiaux'};
const chunk=(arr,n)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,i*n+n));
const card=(id,label,detail='',kind='entity')=>({id:str(id),label:str(label),detail:String(detail),kind});
const page=(label,cards,links=[],note='',refs=[])=>({label,cards,links,note,refs});
const edge=(from,to,label,ref,directed=true)=>({from,to,label,ref,directed});
export function compileSpecialized(projection,{aspectRatio='16:9',maxPages=12}={}){
  require(projection?.schemaVersion==='1.0'&&projection.derived===true&&kinds.includes(projection.projectionKind)&&typeof projection.truncated==='boolean','en-tête non supporté');
  require(['16:9','1:1','9:16'].includes(aspectRatio)&&Number.isInteger(maxPages)&&maxPages>=1&&maxPages<=12,'options invalides');
  const p=structuredClone(projection),kind=p.projectionKind,pages=[];let omitted=0,partial=p.truncated||Boolean(p.nextCursor),mode=kind;
  const add=x=>pages.push(x);
  if(['tree','dag','causal-feedback','traceability','flow'].includes(kind)){
    const nodes=unique(list(p.nodes),x=>x.id),raw=list(kind==='flow'?p.transitions:p.edges),edges=unique(raw,x=>x.id);
    const n=id=>{const x=nodes.get(id);require(x,'extrémité hors projection');return card(x.id,x.label,'',x.kind==='source'?'source':'entity');};
    for(const e of raw){n(e.source);n(e.target);}
    let relations=raw.map(e=>({...e,refs:[e.id],qualified:false}));
    if(kind==='tree'){
      const h=p.hierarchySemantics;
      if(h?.status==='reviewed-visible-hierarchy'&&h.derived===true&&h.authoritative===false&&['child-to-parent','parent-to-child'].includes(h.direction)){
        const visible=new Set(list(h.nodeIds));const reviewed=list(h.edges);
        // A reviewed parent -> child edge must be backed by visible raw assertions.
        const parents=new Map(),adj=new Map();
        relations=reviewed.map(e=>{require(visible.has(e.source)&&visible.has(e.target)&&e.source!==e.target,'arc hiérarchique invalide');n(e.source);n(e.target);require(!parents.has(e.target),'parents multiples');parents.set(e.target,e.source);const a=adj.get(e.source)||[];a.push(e.target);adj.set(e.source,a);const refs=list(e.assertionRefs,64);require(refs.length>0&&refs.every(r=>{const x=edges.get(r);return x&&x.relationId===e.relationId&&e.relationId===h.relationId&&(h.direction==='child-to-parent'?x.source===e.target&&x.target===e.source:x.source===e.source&&x.target===e.target);}), 'arc sans référence visible concordante');return {...e,id:refs[0],refs,relationLabel:'Parent → enfant',qualified:true};});
        for(const id of visible){n(id);const seen=new Set();let cur=id;while(parents.has(cur)){require(!seen.has(cur),'cycle hiérarchique');seen.add(cur);cur=parents.get(cur);}}
        const roots=list(h.roots);require(roots.length===new Set(roots).size&&roots.every(r=>visible.has(r)&&!parents.has(r))&&[...visible].filter(x=>!parents.has(x)).length===roots.length,'racines incohérentes');
        const depth=id=>{let d=0;while(parents.has(id)){id=parents.get(id);d++;}return d;};relations.sort((a,b)=>depth(a.source)-depth(b.source)||cmp(a.source,b.source)||cmp(a.target,b.target));
        mode='reviewed-hierarchy';partial ||= Boolean(h.truncated)||raw.some(e=>!relations.some(r=>r.refs.includes(e.id)));
      }else mode='unqualified-hierarchy';
    }
    if(kind==='causal-feedback'){
      const v=p.visualSemantics,qualified=v?.status==='explicit-relations'&&v.derived===true&&v.authoritative===false?unique(list(v.causalEdges),x=>x.assertionRef):new Map();
      relations=relations.map(e=>{const q=qualified.get(e.id);if(q){require(q.source===e.source&&q.target===e.target&&q.relationId===e.relationId&&[-1,0,1].includes(q.sign)&&e.sign===q.sign,'qualification causale incohérente');}return {...e,qualified:Boolean(q),sign:q?.sign};});
      require([...qualified.keys()].every(k=>edges.has(k)),'qualification hors projection');
      mode=relations.some(e=>e.qualified)?'qualified-causal':'candidate-relations';
    }
    const grouped=new Map();
    for(const e of relations){const groupKey=mode==='reviewed-hierarchy'?e.source:kind==='dag'?e.target:null;const key=groupKey===null?'edge:'+e.id:'group:'+groupKey;const arr=grouped.get(key)||[];arr.push(e);grouped.set(key,arr);}
    const consumed=new Set();
    for(const group of grouped.values()){
      // A convergence or hierarchy branch stays within a single chapter.
      for(const es of chunk(group,3)){
        const ids=[...new Set(es.flatMap(e=>[e.source,e.target]))];ids.forEach(id=>consumed.add(id));
        const cards=ids.map(n), links=es.map(e=>edge(e.source,e.target,e.relationLabel||e.kind||e.relationId||'Relation visible',e.id,kind==='causal-feedback'?e.qualified:mode!=='unqualified-hierarchy'));
        if(es.some(e=>e.source===e.target)){partial=true;omitted+=es.filter(e=>e.source===e.target).length;}
        const labels=es.map(e=>`${n(e.source).label} — ${e.relationLabel||e.kind||e.relationId||'relation visible'} — ${n(e.target).label}${kind==='causal-feedback'?(e.qualified?` (signe ${e.sign===1?'+':e.sign===-1?'−':'non précisé'})`:' (causalité non qualifiée)'):''}`);
        const heading=mode==='reviewed-hierarchy'?'Branche examinée':mode==='unqualified-hierarchy'?'Relations visibles (sans parenté déduite)':kind==='dag'&&new Set(es.map(e=>e.source)).size>1?'Convergence de relations':kind==='causal-feedback'?(es.every(e=>e.qualified)?'Relation causale qualifiée':'Relation candidate, sans causalité déduite'):kind==='flow'?'Transition décrite, non exécutée':titleFor[kind];
        const note=kind==='flow'&&es.some(e=>e.conditional)?'Conditionnelle · conditions à consulter dans la projection source.':kind==='dag'?'Ordre des relations affichées, pas une preuve.':kind==='causal-feedback'?'Révélation de relations, aucune propagation temporelle simulée.':mode==='unqualified-hierarchy'?'Disposition non sémantique ; aucun ordre de parenté attesté.':'';
        add(page(heading,cards,links,note,es.flatMap(e=>e.refs).map(str)));pages.at(-1).transcript=labels;
      }
    }
    for(const ids of chunk([...nodes.keys()].filter(id=>!consumed.has(id)&&(mode!=='reviewed-hierarchy'||p.hierarchySemantics.nodeIds.includes(id))),3))add(page('Éléments visibles',ids.map(n),[],'Aucune relation supplémentaire déduite.',[]));
  }else if(kind==='timeline-lineage'){
    const items=[...unique(list(p.items),x=>x.id).values()].sort((a,b)=>(a.start??Infinity)-(b.start??Infinity)||cmp(a.id,b.id));
    for(const group of chunk(items,3)){
      const cards=group.map(x=>{require((x.start==null||Number.isSafeInteger(x.start))&&(x.end==null||Number.isSafeInteger(x.end))&&(x.start==null||x.end==null||x.start<=x.end),'intervalle invalide');const date=x.start==null&&x.end==null?(x.temporalLabel||x.label||'Date non précisée'):x.start===x.end?String(x.start):`${x.start??'?'} – ${x.end??'?'}`;return card(x.id,x.entity.label,`${x.relationLabel} · ${date}`,'concept');});
      add(page('Repères ordonnés',cards,[],'Ordre de début connu ; espacements non proportionnels au temps.',group.map(x=>str(x.assertionRef))));
    }if(list(p.links).length){partial=true;omitted+=p.links.length;}
  }else if(kind==='matrix'){
    const rows=unique(list(p.rows,100),x=>x.id),cols=unique(list(p.columns,420),x=>x.id),cells=list(p.cells,2400),groups=new Map();require(rows.size*cols.size<=10000,'matrice hors budget');
    for(const c of cells){require(rows.has(c.entityId)&&cols.has(c.dimensionId),'cellule hors projection');str(c.assertionRef);const value=scalar(c.value);if(value===null){partial=true;omitted++;}const key=JSON.stringify([c.dimensionId,c.entityId]);const g=groups.get(key)||[];g.push({value:value===null?'[valeur structurée non représentée]':value,ref:c.assertionRef});groups.set(key,g);}
    for(const [id,col] of cols){for(const group of chunk([...rows.values()],3)){
      const refs=[],cards=group.map(r=>{const values=groups.get(JSON.stringify([id,r.id]))||[];refs.push(...values.map(v=>v.ref));return card(r.id,r.label,values.length?values.map(v=>v.value).join(' | ')+(col.unit?' '+col.unit:''):'Aucune valeur dans cette projection','value');});
      add(page(`Dimension : ${str(col.label)}`,cards,[],'Valeurs visibles, sans classement ni agrégation.',refs));
    }}
  }else if(kind==='multiscale'){
    const nodes=unique(list(p.nodes),x=>x.id),layers=unique(list(p.layers),x=>x.id),groups=new Map();
    for(const m of list(p.memberships)){require(nodes.has(m.entityId)&&layers.has(m.layerId),'appartenance hors projection');const a=groups.get(m.layerId)||[];a.push(m);groups.set(m.layerId,a);}
    for(const [id,ms] of groups)for(const group of chunk(ms,3))add(page(`Couche : ${str(layers.get(id).label)}`,group.map((m,i)=>card(`${m.entityId}:${i}`,nodes.get(m.entityId).label,'Appartenance visible','entity')),[],'Aucune hiérarchie entre couches déduite.',group.map(m=>str(m.assertionRef))));
    if(list(p.crossLinks).length){partial=true;omitted+=p.crossLinks.length;}
  }else if(kind==='state-flow'){
    for(const r of list(p.records)){const details=list(r.valuations,100).map(v=>`${v.dimension} : ${v.value_state==='known'&&scalar(v.value)!==null?scalar(v.value):v.value_state}`);add(page('État décrit, sans autorité d’action',[card(r.assertionRef,r.entity.label,`${r.relationLabel} · ${r.status??'statut non précisé'}`,'entity'),...details.slice(0,2).map((d,i)=>card(`${r.assertionRef}:${i}`,d,'','value'))],[],'Lecture seule · aucune action exécutée.',[str(r.assertionRef)]));if(details.length>2){partial=true;omitted+=details.length-2;}}
    if(list(p.transitions).length){partial=true;omitted+=p.transitions.length;}
  }else if(kind==='spatial'){
    for(const group of chunk(list(p.points),3)){add(page('Coordonnées visibles',group.map((x,i)=>{require(Number.isFinite(x.lat)&&Math.abs(x.lat)<=90&&Number.isFinite(x.long)&&Math.abs(x.long)<=180,'coordonnées invalides');return card(`${x.entity.id}:${i}`,x.label||x.entity.label,`${x.lat}°, ${x.long}°`,'entity');}),[],'Coordonnées, sans carte ni trajet inféré.',[]));}
    if(list(p.places).length){partial=true;omitted+=p.places.length;}
  }
  if(!pages.length)add(page('Aucun élément représentable',[],[],'Aucune absence dans la connaissance canonique déduite.',[]));
  const totalPages=pages.length;const selected=pages.slice(0,maxPages);partial ||=totalPages>selected.length;omitted+=totalPages-selected.length;
  const duration=selected.reduce((t,p)=>{p.startMs=t;const words=[p.label,p.note,...p.cards.flatMap(c=>[c.label,c.detail]),...p.links.map(e=>e.label)].join(' ').split(/\s+/).length;p.endMs=t+Math.min(9000,Math.max(2800,Math.round(words*280+1000)));return p.endMs;},0);
  return {format:'koreograph.projection-storyboard/0.1',compilerVersion:SPECIALIZED_VERSION,projectionSha256:sha256Portable(canonical(p)),projectionKind:kind,mode,title:titleFor[kind],aspectRatio,derived:true,authoritative:false,publicationAuthorized:false,partial,omitted,totalPages,durationMs:duration,pages:selected};
}

// Fixed card positions within each chapter. No moving camera, no invented arrow,
// no cross-fade between unrelated labels. Text is clipped visually only; the
// complete selected labels/relations are available in the private storyboard.
const dims={'16:9':[1600,900],'1:1':[1080,1080],'9:16':[900,1600]};
const wrap=(s,max,lines=3)=>{const a=Array.from(String(s).replace(/\s+/g,' ').trim()),out=[];while(a.length&&out.length<lines){let n=Math.min(max,a.length);if(n<a.length){const k=a.slice(0,n).lastIndexOf(' ');if(k>max*.55)n=k;}out.push(a.splice(0,n).join('').trim());while(a[0]===' ')a.shift();}if(a.length&&out.length)out[out.length-1]=Array.from(out.at(-1)).slice(0,max-1).join('')+'…';return out;};
export function chapterAt(story,timeMs){
  require(Number.isFinite(timeMs),'temps invalide');
  const t=Math.max(0,Math.min(story.durationMs,timeMs));
  return story.pages.findIndex((p,i)=>t<p.endMs||i===story.pages.length-1);
}
export function renderSpecialized(story,input={}){
  const fixed=input.chapterIndex!==undefined;
  require(!fixed||Number.isInteger(input.chapterIndex)&&input.chapterIndex>=0&&input.chapterIndex<story.pages.length,'chapitre invalide');
  const opts=optionsFor(fixed?{...input,motion:'reduced'}:input),t=opts.theme.tokens,[w,h]=dims[story.aspectRatio],d=story.durationMs;
  const text=(x,y,s,size=25,color=t.foreground,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${xml(s)}</text>`;
  // Firefox 155 on Windows reports line boxes ~1.44 × font size.
  // Keep 1.65 × baseline spacing, independent of browser font metrics.
  const lines=(x,y,s,size,max,count,anchor='start',color=t.foreground)=>wrap(s,max,count).map((l,i)=>text(x,y+i*Math.ceil(size*1.65),l,size,color,anchor)).join('');
  const opacity=(start,end)=>{const times=[0,start,end,d].filter((v,i,a)=>i===0||v!==a[i-1]);const vals=times.map(v=>v===d?(end===d?1:0):v>=start&&v<end?1:0);return `<animate attributeName="opacity" values="${vals.join(';')}" keyTimes="${times.map(v=>(v/d).toFixed(9)).join(';')}" dur="${d}ms" repeatCount="1" fill="freeze" calcMode="discrete"/>`;};
  const content=story.pages.map((p,index)=>{
    if(fixed&&index!==input.chapterIndex)return '';
    const graph=p.links.length>0,vertical=w<h,cs=p.cards;let positions=new Map();
    const hubLayout=graph&&p.links.length>1&&(p.links.every(e=>e.to===p.links[0].to)||p.links.every(e=>e.from===p.links[0].from));
    const boxW=hubLayout?Math.min(350,w/4-24):vertical?Math.min(360,w-140):Math.min(350,w/4-32),boxH=184;
    const reveal=(start,end)=>{if(opts.motion==='reduced'||start<=0||start>=end)return '';const times=[0,start,Math.min(start+250,end),d].filter((v,i,a)=>i===0||v!==a[i-1]);return `<animate attributeName="opacity" values="${times.map((v,i)=>i<=1?0:1).join(';')}" keyTimes="${times.map(v=>(v/d).toFixed(9)).join(';')}" dur="${d}ms" repeatCount="1" fill="freeze"/>`;};
    const node=(c,x,y)=>{positions.set(c.id,{x,y});const col=opts.encoding==='by-kind'?opts.theme.kindColors[c.kind]:t.node;const offset=!graph&&cs.length>1&&opts.motion!=='reduced'?cs.indexOf(c)*420:0;return `<g opacity="${offset?0:1}">${offset?reveal(p.startMs+offset,p.endMs):''}<title>${xml(c.label+' '+c.detail)}</title><rect x="${x-boxW/2}" y="${y-boxH/2}" width="${boxW}" height="${boxH}" rx="15" fill="${t.background}" stroke="${t.nodeStroke}" stroke-width="2"/><circle cx="${x-boxW/2+20}" cy="${y-boxH/2+20}" r="6" fill="${col}" stroke="${t.nodeStroke}"/>${lines(x,y-boxH/2+38,c.label,23,Math.max(10,Math.floor((boxW-32)/19)),2,'middle')}${lines(x,y+28,c.detail,19,Math.max(10,Math.floor((boxW-28)/15)),2,'middle',t.mutedText)}</g>`;};
    let nodes='';
    if(graph){const convergence=p.links.length>1&&p.links.every(e=>e.to===p.links[0].to),branch=p.links.length>1&&p.links.every(e=>e.from===p.links[0].from);const hub=convergence?p.links[0].to:branch?p.links[0].from:null;
      if(hub){const others=cs.filter(c=>c.id!==hub);const top=convergence?0:1;nodes+=node(cs.find(c=>c.id===hub),w/2,top?h*.67:h*.36);others.forEach((c,i)=>{const x=(w/(others.length+1))*(i+1),y=top?h*.36:h*.65;nodes+=node(c,x,y);});}
      else {cs.forEach((c,i)=>{nodes+=node(c,cs.length===1?w/2:vertical?w/2:w*(i===0?.28:.72),cs.length===1?h*.48:vertical?h*(i===0?.34:.60):h*.48);});}
    }else{cs.forEach((c,i)=>{nodes+=node(c,vertical?w/2:w/(cs.length+1)*(i+1),vertical?h*.45+(i-(cs.length-1)/2)*(boxH+35):h*.48);});}
    let links='';for(const [li,e] of p.links.entries()){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b||e.from===e.to)continue;const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(!L)continue;const ux=dx/L,uy=dy/L;const distance=Math.min(boxW/2/Math.max(Math.abs(ux),.0001),boxH/2/Math.max(Math.abs(uy),.0001));const x1=a.x+ux*distance,y1=a.y+uy*distance,x2=b.x-ux*distance,y2=b.y-uy*distance;const start=p.startMs+500+li*400;links+=`<g opacity="${opts.motion==='reduced'?1:0}">${reveal(start,p.endMs)}<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${t.edge}" stroke-width="3"/>`;if(e.directed){const x=x2-ux*15,y=y2-uy*15;links+=`<path d="M ${x+uy*7} ${y-ux*7} L ${x2} ${y2} L ${x-uy*7} ${y+ux*7}" stroke="${t.edge}" stroke-width="3" fill="none"/>`;}links+='</g>';}
    const descriptions=p.transcript||p.links.map(e=>e.label);const cap=descriptions.slice(0,3).map((s,i)=>`<g opacity="${opts.motion==='reduced'?1:0}">${reveal(p.startMs+500+i*400,p.endMs)}${lines(55,h-190+i*34,s,20,Math.floor((w-110)/16),1)}</g>`).join('');
    return `<g opacity="${fixed||index===0?1:0}">${fixed?'':opacity(p.startMs,p.endMs)}${lines(55,174,p.label,32,Math.floor((w-110)/25),2)}${links}${nodes}${cap}${lines(55,h-65,p.note,18,Math.floor((w-110)/14),2,'start',t.mutedText)}${text(w-55,115,`${index+1} / ${story.pages.length}`,20,t.mutedText,'end')}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${xml(story.title)}" font-family="${opts.theme.typography.fontFamily}"><title>${xml(story.title)}</title><desc>Projection dérivée privée. Les relations affichées ne constituent pas une preuve ou une autorisation de publication.</desc><rect width="${w}" height="${h}" fill="${t.background}"/><rect x="42" y="35" width="8" height="38" rx="3" fill="${t.brand}"/>${text(64,65,'KOREOGRAPH · '+story.title,23)}${text(55,105,story.partial?'Vue partielle · aucune autorisation de publication':'Vue dérivée · aucune autorisation de publication',18,t.mutedText)}${content}${fixed?'':`<g opacity="0"><animate attributeName="opacity" values="0;0" keyTimes="0;1" dur="${d}ms" repeatCount="1" fill="freeze"/></g>`}</svg>`;
}
export function specializedHtml(story,opts={}){
  // Explicit start; users who prefer reduced motion get the same discrete chapters.
  const svg=renderSpecialized(story,opts),d=story.durationMs;
  const transcript=story.pages.map(p=>`<li><strong>${xml(p.label)}</strong><ul>${p.cards.map(c=>`<li>${xml(c.label)} — ${xml(c.detail)}</li>`).join('')}${(p.transcript||[]).map(s=>`<li>${xml(s)}</li>`).join('')}</ul>${xml(p.note)}</li>`).join('');
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(story.title)}</title><style>body{font:16px system-ui;background:#f4f7f6;color:#173b38;margin:0}main{max-width:1100px;margin:auto;padding:16px}svg{width:100%;height:auto;max-height:75vh;display:block}section{display:flex;gap:10px;align-items:center;flex-wrap:wrap}input{flex:1;min-width:130px}button{font:inherit;padding:8px;border:1px solid #1E6864;background:white;color:#173b38;border-radius:6px}:focus-visible{outline:3px solid #1E6864;outline-offset:3px}</style><main>${svg}<section><button id="play" type="button">Lire</button><button id="prev" type="button">Précédent</button><button id="next" type="button">Suivant</button><label for="seek">Temps</label><input id="seek" type="range" min="0" max="${d}" value="0"><output id="time">0 s</output></section><details><summary>Transcription des chapitres</summary><ol>${transcript}</ol></details></main><script>(()=>{const s=document.querySelector('svg'),b=document.querySelector('#play'),r=document.querySelector('#seek'),o=document.querySelector('#time'),starts=${JSON.stringify(story.pages.map(p=>p.startMs))},d=${d};const media=matchMedia('(prefers-reduced-motion: reduce)');let paused=true;s.pauseAnimations();s.setCurrentTime(0);function stop(){paused=true;s.pauseAnimations();b.textContent='Lire'}function seek(t){let ms=Math.max(0,Math.min(t*1000,d));if(media.matches){const end=starts.find(x=>x>ms)??d;ms=Math.max(0,end-1);}s.setCurrentTime(ms/1000);}b.onclick=()=>{if(!paused)return stop();if(s.getCurrentTime()*1000>=d)seek(0);paused=false;s.unpauseAnimations();b.textContent='Pause'};r.oninput=()=>{stop();seek(Number(r.value)/1000)};document.querySelector('#prev').onclick=()=>{stop();const t=s.getCurrentTime()*1000,i=starts.findLastIndex(x=>x<=t);seek(starts[Math.max(0,i-1)]/1000)};document.querySelector('#next').onclick=()=>{stop();seek((starts.find(x=>x>s.getCurrentTime()*1000+50)??d)/1000)};function preference(){stop();b.disabled=media.matches;if(media.matches)seek(s.getCurrentTime());}media.addEventListener('change',preference);preference();function tick(){const t=Math.min(d,s.getCurrentTime()*1000);r.value=t;o.value=(t/1000).toFixed(1)+' s';if(t>=d&&!paused)stop();requestAnimationFrame(tick)}requestAnimationFrame(tick);})();</script></html>`;
}


// Capability detection only.
// Does not validate a DTO or authorize publication.
export function supportsProjection(projection) {
  if (typeof projection === 'string') {
    return kinds.includes(projection);
  }

  return Boolean(
    projection &&
    projection.schemaVersion === '1.0' &&
    projection.derived === true &&
    kinds.includes(projection.projectionKind) &&
    typeof projection.truncated === 'boolean'
  );
}
