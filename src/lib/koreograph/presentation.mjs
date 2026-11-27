import { canonical, frameAt, VERSION } from './engine.mjs';
import { THEMES } from './themes.mjs';
const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function optionsFor(opts={}) {
  const theme=THEMES.find(t=>t.id===(opts.themeId||'signature'));check(theme,'Thème inconnu.');
  const result={theme,encoding:opts.encoding||theme.defaults.encoding,geometry:opts.geometry||theme.defaults.geometry,motion:opts.motion||'standard',cameraMode:opts.cameraMode||'auto',narrationMode:opts.narrationMode||'captions'};
  for(const [k,values] of Object.entries({encoding:['mono','by-kind','by-focus'],geometry:['uniform','by-kind'],motion:['standard','reduced'],cameraMode:['fixed','auto'],narrationMode:['off','captions']}))check(values.includes(result[k]),'Option invalide : '+k);
  if(result.motion==='reduced')result.cameraMode='fixed';return result;
}
export const serializeBundle=bundle=>JSON.stringify(bundle,null,2)+'\n';
// WebCrypto where available; portable SHA-256 for local HTTP/file contexts. Digests are integrity identifiers, not authorization.
export function sha256Portable(s){
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const input=new TextEncoder().encode(s),len=input.length;const data=new Uint8Array(Math.ceil((len+9)/64)*64);data.set(input);data[len]=128;const dv=new DataView(data.buffer);dv.setUint32(data.length-8,Math.floor(len*8/2**32));dv.setUint32(data.length-4,len*8);const w=new Int32Array(64),r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let offset=0;offset<data.length;offset+=64){for(let i=0;i<16;i++)w[i]=dv.getInt32(offset+4*i);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))|0;}let [a,b,c,d,e,f,g,j]=h;for(let i=0;i<64;i++){const t1=(j+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0;const t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))|0;j=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}[a,b,c,d,e,f,g,j].forEach((v,i)=>{h[i]=(h[i]+v)|0;});}return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function sha(s){if(!globalThis.crypto?.subtle)return sha256Portable(s);const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');}
export function labelLines(value,max=22){const words=String(value).trim().split(/\s+/);let a='',b='';for(const w of words){if(!b&&(!a||a.length+w.length+1<=max)){a+=(a?' ':'')+w;}else b+=(b?' ':'')+w;}const cut=s=>Array.from(s).length>max?Array.from(s).slice(0,max-1).join('')+'…':s;return [cut(a),cut(b)].filter(Boolean);}
function bounds(frame,typ){return frame.nodes.filter(n=>n.opacity>.25).map(n=>{const lines=labelLines(n.label);const width=Math.max(n.radius*2,Math.max(...lines.map(s=>s.length),0)*typ.labelPx*.57);return {key:n.key,x:n.x-width/2,y:n.y-n.radius,w:width,h:n.radius*2+lines.length*typ.labelPx*1.15+12};});}
export function inspectProduction(bundle,opts){
  const {width:w,height:h}=bundle.viewport;const diagnostics=[];let samples=0;const codes=new Set();
  let previous=0;const ids=new Set(bundle.scenes.map(s=>s.id));const semanticOk=ids.size===bundle.scenes.length&&bundle.scenes.every(s=>{const keys=new Set(s.objects.map(n=>n.key));return keys.size===s.objects.length&&keys.has(s.focusKey)&&s.links.every(l=>l.kind==='navigation'&&keys.has(l.from)&&keys.has(l.to));})&&bundle.segments.every(s=>{const ok=s.startMs===previous&&s.endMs>s.startMs&&ids.has(s.fromScene)&&ids.has(s.toScene);previous=s.endMs;return ok;})&&previous===bundle.durationMs;
  if(!semanticOk)return {state:'fail',samples:0,passes:0,diagnostics:[{code:'Q-SEM',severity:'fatal',segmentIndex:null}]};
  const sampleTimes=[...new Set([0,bundle.durationMs,...bundle.segments.flatMap(s=>[s.startMs,s.endMs]),...Array.from({length:Math.ceil(bundle.durationMs/50)},(_,i)=>i*50)])].sort((a,b)=>a-b).slice(0,2401);
  for(const time of sampleTimes){const f=frameAt(bundle,time,opts);samples++;const bs=bounds(f,opts.theme.typography);for(let a=0;a<bs.length;a++){const x=bs[a];if(x.x<24||x.x+x.w>w-24||x.y<95||x.y+x.h>h-95)codes.add('Q-BOUNDS');for(let b=a+1;b<bs.length;b++){const y=bs[b];if(x.x<y.x+y.w&&y.x<x.x+x.w&&x.y<y.y+y.h&&y.y<x.y+x.h)codes.add('Q-LABEL');}}}
  for(const code of codes)diagnostics.push({code,severity:'warning',segmentIndex:null});
  diagnostics.push({code:'Q-NOT-RUNTIME-TESTED',severity:'warning',segmentIndex:null});return {state:'review',samples,passes:1,diagnostics};
}
export async function compilePresentation(bundle,input={}){
  const opts=optionsFor(input),{width:w,height:h}=bundle.viewport;const fixed={cx:w/2,cy:h/2,zoom:1};const camera=[],captions=[];
  let pose=fixed;const isFr=bundle.locale==='fr';
  for(let i=0;i<bundle.segments.length;i++){const s=bundle.segments[i],a=bundle.scenes.find(x=>x.id===s.fromScene),b=bundle.scenes.find(x=>x.id===s.toScene);const center=x=>x.objects.find(n=>n.key===x.focusKey);const x=center(a),y=center(b);
    let to=fixed;if(opts.cameraMode==='auto'&&s.primitive==='hold'){const boxes=bounds(frameAt(bundle,s.endMs-0.001,opts),opts.theme.typography);const extent=Math.max(...boxes.flatMap(r=>[Math.abs(r.x-w/2)/(w/2-55),Math.abs(r.x+r.w-w/2)/(w/2-55),Math.abs(r.y-h/2)/(h/2-115),Math.abs(r.y+r.h-h/2)/(h/2-115)]));to={...fixed,zoom:clamp(1/Math.max(.01,extent),1,1.12)};}
    camera.push({startMs:s.startMs,endMs:s.endMs,kind:to.zoom>pose.zoom?'focus':to.zoom<pose.zoom?'pullback':'overview',from:pose,to});pose=to;
    if(opts.narrationMode==='captions'){
      const move=a.id!==b.id&&s.primitive==='focus';const reveal=s.primitive==='reveal';const narrated=s.primitive==='fade'?x:y;const text=move?`${x.label} → ${y.label}${isFr?' : navigation':' : navigation'}`:reveal?(isFr?'Voisinage visible : ':'Visible neighborhood: ')+y.label:(isFr?'Explorer : ':'Explore: ')+narrated.label;
      captions.push({startMs:s.startMs,endMs:s.endMs,act:move?'associate':reveal?'reveal':i===0?'introduce':'deepen',templateId:move?'associate.navigation':reveal?'reveal.neighbors':i===0?'introduce.focus':'deepen.focus',text:text.slice(0,1000),refs:move?[{sceneId:a.id,objectKey:x.key},{sceneId:b.id,objectKey:y.key}]:[{sceneId:s.primitive==='fade'?a.id:b.id,objectKey:narrated.key}]});
    }
  }
  return {format:'koreograph.presentation-plan/0.1',bundleSha256:await sha(serializeBundle(bundle)),themeSha256:await sha(canonical(opts.theme)),...opts,durationMs:bundle.durationMs,compilerVersion:VERSION,camera,captions,qa:inspectProduction(bundle,opts)};
}
export function frameAtPresentation(bundle,plan,t){const f=frameAt(bundle,t,plan),i=bundle.segments.indexOf(f.segment),s=plan.camera[i];const u=clamp((f.t-s.startMs)/(s.endMs-s.startMs),0,1),q=u*u*(3-2*u);const mix=(a,b)=>a+(b-a)*q;return {...f,camera:{cx:mix(s.from.cx,s.to.cx),cy:mix(s.from.cy,s.to.cy),zoom:mix(s.from.zoom,s.to.zoom)},caption:plan.captions.find(c=>f.t>=c.startMs&&(f.t<c.endMs||f.t===bundle.durationMs&&c.endMs===f.t))?.text||''};}
