// Offline production boundary: only previously exported, explicitly selected Bundles.
// Validation proves shape and internal consistency, never a Reader Policy or authenticity.
import { sourceOf, canonical } from './engine.mjs';
const ok=(condition,message)=>{if(!condition)throw Error('Bundle : '+message);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const str=(x,n)=>typeof x==='string'&&x.trim().length>0&&x.length<=n;
const range=(x,a,b,int=false)=>Number.isFinite(x)&&x>=a&&x<=b&&(!int||Number.isInteger(x));
const arr=(x,a,b)=>Array.isArray(x)&&x.length>=a&&x.length<=b;
const ratios={'16:9':[1600,900],'1:1':[1080,1080],'9:16':[900,1600]};
export function validateExportedBundle(b){
  ok(exact(b,['format','title','locale','provenance','viewport','durationMs','scenes','segments','warnings','style']),'champs inattendus');
  ok(b.format==='koreograph.bundle/0.1'&&str(b.title,500)&&['fr','en'].includes(b.locale)&&['minimal','cinematic','didactic'].includes(b.style),'en-tête invalide');
  const p=b.provenance,v=b.viewport;
  ok(exact(p,['source','konstellationVersion','compilerVersion','adapterVersion','derived','authoritative','publicationAuthorized'])&&p.derived===true&&p.authoritative===false&&p.publicationAuthorized===false&&['konstellationVersion','compilerVersion','adapterVersion'].every(k=>str(p[k],100)),'provenance invalide');
  ok(canonical(p.source)===canonical(sourceOf(p.source,p.source?.lensRef,p.source?.kristalRef)),'source invalide');
  ok(exact(v,['width','height','aspectRatio'])&&Object.hasOwn(ratios,v.aspectRatio)&&v.width===ratios[v.aspectRatio][0]&&v.height===ratios[v.aspectRatio][1]&&range(b.durationMs,1,120000,true),'viewport ou durée invalide');
  ok(arr(b.scenes,1,24)&&arr(b.segments,1,48)&&arr(b.warnings,0,12)&&b.warnings.every(x=>['SOURCE_TRUNCATED','PRESENTATION_TRUNCATED','EARLY_STOP','NEUTRAL_FADE'].includes(x)),'budget ou avertissements invalides');
  const scenes=new Map(),edgeIdentities=new Map();
  for(const s of b.scenes){
    ok(exact(s,['id','focusKey','objects','links','truncated'])&&str(s.id,100)&&!scenes.has(s.id)&&str(s.focusKey,4096)&&typeof s.truncated==='boolean'&&arr(s.objects,1,11)&&arr(s.links,0,10),'scène invalide');
    const nodes=new Map();for(const n of s.objects){
      ok(exact(n,['key','label','kind','role','x','y','radius','opacity'])&&str(n.key,4096)&&!nodes.has(n.key)&&str(n.label,500)&&['entity','concept','source','value','group'].includes(n.kind)&&['center','satellite'].includes(n.role)&&range(n.x,0,v.width)&&range(n.y,0,v.height)&&range(n.radius,1,500)&&range(n.opacity,0,1),'objet invalide');
      nodes.set(n.key,n);
    }
    ok(nodes.get(s.focusKey)?.role==='center'&&s.objects.filter(n=>n.role==='center').length===1,'focus incohérent');
    const edges=new Set(),neighbors=new Set();for(const l of s.links){
      ok(exact(l,['key','from','to','kind'])&&str(l.key,4096)&&!edges.has(l.key)&&l.kind==='navigation'&&l.from===s.focusKey&&nodes.has(l.to)&&l.to!==l.from&&!neighbors.has(l.to),'lien invalide');const identity=canonical([l.from,l.to].sort());ok(!edgeIdentities.has(l.key)||edgeIdentities.get(l.key)===identity,'identité de lien réutilisée');edgeIdentities.set(l.key,identity);edges.add(l.key);neighbors.add(l.to);
    }
    ok(neighbors.size===nodes.size-1,'voisinage incomplet');scenes.set(s.id,s);
  }
  let end=0,last=b.scenes[0].id;const seen=new Set([last]);
  for(const s of b.segments){
    ok(exact(s,['fromScene','toScene','startMs','endMs','primitive','easing'])&&s.fromScene===last&&scenes.has(s.toScene)&&s.startMs===end&&range(s.endMs,end+1,b.durationMs,true)&&['focus','reveal','hold','fade'].includes(s.primitive)&&['linear','smoothstep'].includes(s.easing),'timeline incohérente');
    const a=scenes.get(s.fromScene),z=scenes.get(s.toScene);
    ok(s.primitive==='hold'?a===z:s.primitive==='reveal'?a!==z&&a.focusKey===z.focusKey:s.primitive==='focus'?a!==z&&a.objects.some(n=>n.key===z.focusKey):a!==z,'transition incohérente');
    if(a!==z){ok(!seen.has(z.id)&&b.scenes[seen.size]?.id===z.id,'ordre des scènes invalide');seen.add(z.id);}
    last=s.toScene;end=s.endMs;
  }
  ok(end===b.durationMs&&seen.size===scenes.size,'timeline incomplète');return b;
}
