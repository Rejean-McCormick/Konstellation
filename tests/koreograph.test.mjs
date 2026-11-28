import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { canonical,makeScore,compileScore,frameAt,targetKey,validateScore,normalizeProjection } from '../src/lib/koreograph/engine.mjs';
import { DEMO_SOURCE,DEMO_START,demoResolve } from '../src/lib/koreograph/demo-data.mjs';
import { compilePresentation,frameAtPresentation,serializeBundle,sha256Portable } from '../src/lib/koreograph/presentation.mjs';
import { renderSvg,renderAnimatedSvg,standaloneHtml } from '../src/lib/koreograph/render.mjs';
import { THEMES } from '../src/lib/koreograph/themes.mjs';
const target=id=>({focus:{kind:'entity',id:'demo:'+id},groupId:null});
const auto=opts=>makeScore(DEMO_SOURCE,DEMO_START,opts);
const compile=opts=>compileScore(auto(opts),demoResolve);
test('auto determinism, no cycles, route membership and exact segments',async()=>{const a=await compile({maxHops:6,seed:42}),b=await compile({maxHops:6,seed:42});assert.deepEqual(a,b);assert.ok(a.scenes.length<=7);assert.equal(new Set(a.scenes.map(s=>s.focusKey)).size,a.scenes.length);assert.equal(a.segments[0].startMs,0);assert.equal(a.segments.at(-1).endMs,a.durationMs);for(let i=1;i<a.segments.length;i++)assert.equal(a.segments[i-1].endMs,a.segments[i].startMs);assert.equal(a.provenance.publicationAuthorized,false);});
test('center identity preserved and links anchored through movement',async()=>{const b=await compile({maxHops:1});const s=b.segments.find(x=>x.primitive==='focus');const before=b.scenes[0],after=b.scenes[1];assert.ok(before.objects.some(n=>n.key===after.focusKey));const f=frameAt(b,(s.startMs+s.endMs)/2);assert.equal(f.nodes.filter(n=>n.key===after.focusKey).length,1);const map=new Map(f.nodes.map(n=>[n.key,n]));for(const l of f.links){assert.equal(l.x1,map.get(l.from).x);assert.equal(l.y2,map.get(l.to).y);assert.ok(l.opacity<=Math.min(map.get(l.from).opacity,map.get(l.to).opacity));}assert.deepEqual(frameAt(b,b.durationMs).scene,after);});
test('group and qualifier targets retain semantic identity',()=>{assert.notEqual(targetKey(DEMO_START),targetKey({...DEMO_START,groupId:'group-a'}));assert.notEqual(targetKey({focus:{kind:'qualifier',predicate:'a',key:'x'},groupId:null}),targetKey({focus:{kind:'qualifier',predicate:'b',key:'x'},groupId:null}));});
test('script refuses non-neighbor; capture uses explicit neutral fade',async()=>{const steps=[{action:'focus',target:DEMO_START},{action:'follow',target:target('memoire')}];await assert.rejects(compileScore(auto({steps}),demoResolve),/non attesté/);const b=await compileScore(auto({steps,mode:'capture'}),demoResolve);assert.ok(b.warnings.includes('NEUTRAL_FADE'));assert.ok(b.segments.some(s=>s.primitive==='fade'));});
test('reveal and holds and explicit duration',async()=>{const score=auto({steps:[{action:'focus',target:DEMO_START},{action:'reveal',limit:3},{action:'hold',durationMs:1800},{action:'follow',target:target('identite')}],durationMs:15000});const b=await compileScore(score,demoResolve);assert.equal(b.durationMs,15000);assert.ok(b.segments.some(s=>s.primitive==='reveal'));await assert.rejects(compileScore({...score,presentation:{...score.presentation,durationMs:1000}},demoResolve),/Durée trop courte/);});
test('context and target mismatch fail; no hidden source resolution',async()=>{await assert.rejects(compileScore(auto(),async t=>({...await demoResolve(t),context:{...DEMO_SOURCE,datasetRef:'bad'}})),/hors contexte/);await assert.rejects(compileScore(auto(),async t=>({...await demoResolve(t),focus:target('memoire').focus})),/hors cible/);});
test('cancel prevents further commits',async()=>{const c=new AbortController();let reads=0;await assert.rejects(compileScore(auto(),async t=>{reads++;c.abort();return demoResolve(t)},{signal:c.signal}),/annulée/);assert.equal(reads,1);});
test('strict import rejects extra data and token fields',()=>{assert.throws(()=>validateScore({...auto(),authToken:'secret'}),/inattendus/);const s=auto();s.auto.start.focus.token='secret';assert.throws(()=>validateScore(s),/inattendus/);});
test('all themes match documented catalog and preserve Bundle digest',async()=>{const b=await compile();for(const theme of THEMES){const disk=JSON.parse(await fs.readFile(new URL(`../docs/koreograph/themes/${theme.id}.json`,import.meta.url),'utf8'));assert.deepEqual(theme,disk);assert.equal(theme.tokens.brand,'#1E6864');const p=await compilePresentation(b,{themeId:theme.id});assert.equal(p.bundleSha256,createHash('sha256').update(serializeBundle(b)).digest('hex'));assert.equal(p.themeSha256,createHash('sha256').update(canonical(theme)).digest('hex'));assert.ok(renderSvg(b,p,100).includes(theme.tokens.background));}assert.equal(THEMES.length,8);});
test('reduced motion and fixed camera at seek boundaries',async()=>{const b=await compile({maxHops:1});const p=await compilePresentation(b,{motion:'reduced',cameraMode:'auto'});assert.equal(p.cameraMode,'fixed');const s=b.segments.find(x=>x.primitive==='focus');const f=frameAtPresentation(b,p,(s.startMs+s.endMs)/2);assert.equal(f.scene.id,s.fromScene);assert.equal(f.camera.zoom,1);assert.equal(frameAtPresentation(b,p,s.endMs).scene.id,s.toScene);});
test('layouts recompiled for all ratios and bounds finite',async()=>{for(const aspectRatio of ['16:9','1:1','9:16']){const b=await compile({aspectRatio,density:10});assert.equal(b.viewport.aspectRatio,aspectRatio);for(const s of b.scenes)for(const n of s.objects){assert.ok(Number.isFinite(n.x)&&n.x>=0&&n.x<=b.viewport.width);assert.ok(Number.isFinite(n.y)&&n.y>=0&&n.y<=b.viewport.height);}}});
test('safe SVG, no markup injection; autonomous SVG contains SMIL only',async()=>{const b=await compileScore({...auto({maxHops:1}),title:'<script>alert(1)</script>'},async t=>{const p=await demoResolve(t);p.center.label='<img onerror="alert(1)">';return p;});const p=await compilePresentation(b);const svg=renderSvg(b,p,0),animated=renderAnimatedSvg(b,p);assert.ok(svg.includes('&lt;script&gt;'));assert.ok(svg.includes('&lt;img'));assert.ok(!svg.includes('<script'));assert.ok(!animated.includes('<script'));assert.ok(!animated.includes('<foreignObject'));assert.ok(animated.includes('<animateTransform'));assert.ok(standaloneHtml(b,p).includes('setCurrentTime'));});
test('portable digest matches node crypto including Unicode',()=>{for(const s of ['', 'abc', 'Conscience 🍀', 'x'.repeat(10000)])assert.equal(sha256Portable(s),createHash('sha256').update(s).digest('hex'));});
test('projection normalization ignores unrelated evidence and rejects invalid kinds',async()=>{const p=await demoResolve(DEMO_START);p.secret='must-not-export';const n=normalizeProjection(p,DEMO_START,DEMO_SOURCE);assert.ok(!JSON.stringify(n).includes('must-not-export'));p.center.kind='unrecognized';assert.throws(()=>normalizeProjection(p,DEMO_START,DEMO_SOURCE),/invalide/);});

test('axial anticipation returns to origin; travel is straight and monotonic; camera stable',async()=>{
  for(const aspectRatio of ['16:9','1:1','9:16']){
    const b=await compile({aspectRatio,maxHops:3});const p=await compilePresentation(b);
    for(const s of b.segments.filter(s=>s.primitive==='focus')){
      const a=b.scenes.find(x=>x.id===s.fromScene),z=b.scenes.find(x=>x.id===s.toScene),key=z.focusKey;
      const x=a.objects.find(n=>n.key===key),y=z.objects.find(n=>n.key===key);assert.ok(x&&y);
      const dx=y.x-x.x,dy=y.y-x.y,len=Math.hypot(dx,dy),dt=s.endMs-s.startMs,prep=Math.min(320,dt*.25);
      const node=t=>frameAt(b,s.startMs+t).nodes.find(n=>n.key===key);
      const axial=n=>((n.x-x.x)*dx+(n.y-x.y)*dy)/len;
      const perpendicular=n=>((n.x-x.x)*dy-(n.y-x.y)*dx)/len;
      assert.ok(axial(node(prep*.25))>0);assert.ok(axial(node(prep*.75))<0);
      assert.ok(Math.abs(axial(node(prep)))<1e-8);
      for(let i=0;i<=20;i++){const f=frameAt(b,s.startMs+prep*i/20),n=f.nodes.find(n=>n.key===key);assert.ok(Math.abs(perpendicular(n))<1e-8);assert.ok(Math.abs(axial(n))<=16);for(const old of a.objects.filter(n=>n.key!==key)){const v=f.nodes.find(n=>n.key===old.key);assert.equal(v.x,old.x);assert.equal(v.y,old.y);}}
      let prev=0;for(let i=0;i<=100;i++){const t=prep+(dt-prep)*i/100,n=node(t),d=axial(n);assert.ok(Math.abs(perpendicular(n))<1e-8);assert.ok(d>=prev-1e-8&&d<=len+1e-8);prev=d;assert.deepEqual(frameAtPresentation(b,p,s.startMs+t).camera,p.camera[0].from);}
      assert.ok(Math.abs(prev-len)<1e-8);
      assert.equal(frameAt(b,s.startMs+prep*.25,{motion:'reduced'}).nodes.find(n=>n.key===key).x,x.x);
    }
  }
});

// Production hardening: imported themes, offline batch boundary, cancellation and pathological graphs.
import { validateTheme } from '../src/lib/koreograph/presentation.mjs';
import { validateExportedBundle } from '../src/lib/koreograph/production.mjs';
test('custom theme strict allowlist, contrast and snapshot isolation',async()=>{
 const th=structuredClone(THEMES[0]);th.id='custom-safe';th.name='Personnalisé';const b=await compile();const p=await compilePresentation(b,{customTheme:th});assert.equal(p.theme.id,th.id);th.tokens.background='url(https://invalid.test)';assert.notEqual(p.theme.tokens.background,th.tokens.background);assert.throws(()=>validateTheme(th),/Palette/);
 for(const mutate of [x=>x.tokens.brand='#000000',x=>x.tokens.foreground=x.tokens.background,x=>x.typography.fontFamily='url(x)',x=>x.kindShapes.entity='script',x=>x.effects.grid='yes',x=>x.token='secret']){const bad=structuredClone(THEMES[0]);mutate(bad);assert.throws(()=>validateTheme(bad));}
});
test('offline Bundle rejects extra fields, altered authority, missing neighbor, malformed timeline',async()=>{
 const b=await compile();assert.equal(validateExportedBundle(b),b);
 for(const mutate of [x=>x.provenance.publicationAuthorized=true,x=>x.scenes[0].objects[0].secret='x',x=>x.scenes[0].links[0].to='missing',x=>x.scenes[0].objects[0].x=Infinity,x=>x.segments[1].startMs++,x=>x.scenes[1].focusKey='missing',x=>x.viewport.width=2000,x=>x.scenes.push(x.scenes[0])]){const bad=structuredClone(b);mutate(bad);assert.throws(()=>validateExportedBundle(bad),/Bundle/);}
});
test('score cannot be mutated during async projection resolution',async()=>{const score=auto();const b=await compileScore(score,async t=>{score.title='changed';score.source.datasetRef='changed';return demoResolve(t)});assert.notEqual(b.title,score.title);assert.equal(b.provenance.source.datasetRef,DEMO_SOURCE.datasetRef);});
test('isolated focus, duplicate neighbors, dense long Unicode labels, all aspect ratios',async()=>{
 for(const ratio of ['16:9','1:1','9:16'])for(const kind of ['isolated','duplicates','dense']){
  const resolver=async t=>{const p=await demoResolve(t);if(kind==='isolated')p.satellites=[];if(kind==='duplicates')p.satellites=[...p.satellites,p.satellites[0]];if(kind==='dense'){p.satellites=Array.from({length:25},(_,i)=>({...p.satellites[i%p.satellites.length],id:'occurrence-'+i,label:'Une très longue étiquette Ω 🌿 '+i}));p.truncated=true;}return p;};
  const b=await compileScore(auto({aspectRatio:ratio,density:10,maxHops:3}),resolver);validateExportedBundle(b);const p=await compilePresentation(b);assert.notEqual(p.qa.state,'fail');if(kind==='isolated')assert.equal(b.scenes.length,1);if(kind==='dense')assert.ok(b.warnings.includes('SOURCE_TRUNCATED'));for(const s of b.segments){const f=frameAt(b,(s.startMs+s.endMs)/2);assert.ok(f.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.opacity>=0&&n.opacity<=1));}
 }
});
test('neutral fade does not show outgoing links on the incoming half',async()=>{const b=await compileScore(auto({mode:'capture',steps:[{action:'focus',target:DEMO_START},{action:'follow',target:target('memoire')}]}),demoResolve);const seg=b.segments.find(x=>x.primitive==='fade');const f=frameAt(b,seg.startMs+(seg.endMs-seg.startMs)*.9);const dest=b.scenes.find(s=>s.id===seg.toScene);assert.ok(f.links.filter(l=>l.opacity>0).every(l=>dest.links.some(x=>x.key===l.key)));});

test('auto framing of square demo fits the stable safe area without animated camera',async()=>{const b=await compile({aspectRatio:'1:1'});const p=await compilePresentation(b);assert.ok(p.camera[0].from.zoom<1);assert.ok(p.camera.every(s=>s.from.zoom===s.to.zoom&&s.from.zoom===p.camera[0].from.zoom));assert.ok(!p.qa.diagnostics.some(d=>d.code==='Q-BOUNDS'));});
test('isolated static focus still exports an explicit SMIL duration',async()=>{const b=await compileScore(auto(),async t=>({...await demoResolve(t),satellites:[]}));const p=await compilePresentation(b,{narrationMode:'off'});assert.ok(renderAnimatedSvg(b,p).includes(`dur="${b.durationMs}ms"`));});

// v0.3: typed projection storyboards, correction and private multi-production.
import { compileSpecialized,renderSpecialized,specializedHtml } from '../src/lib/koreograph/specialized.mjs';
import { compileOptimizedPresentation } from '../src/lib/koreograph/presentation.mjs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const specializedFixture=async name=>JSON.parse(await fs.readFile(new URL(`../docs/koreograph/examples/specialized/${name}.json`,import.meta.url),'utf8'));
const contractFixture=async name=>JSON.parse(await fs.readFile(new URL(`../examples/projections/${name}.json`,import.meta.url),'utf8'));
test('typed projections: all ten existing contract fixture families render deterministically, never authorize publication',async()=>{
  for(const kind of ['tree','dag','causal-feedback','timeline-lineage','matrix','traceability','flow','multiscale','state-flow','spatial']){
    const projection=await contractFixture(kind);const s=compileSpecialized(projection);assert.deepEqual(s,compileSpecialized(projection));assert.equal(s.publicationAuthorized,false);assert.equal(s.authoritative,false);assert.equal(s.pages[0].startMs,0);assert.equal(s.pages.at(-1).endMs,s.durationMs);for(let i=1;i<s.pages.length;i++)assert.equal(s.pages[i-1].endMs,s.pages[i].startMs);
    assert.ok(renderSpecialized(s).includes('<animate'));assert.ok(!renderSpecialized(s).includes('<script'));assert.ok(specializedHtml(s).includes('Transcription'));
  }
});
test('reviewed hierarchy requires matching visible references; raw tree never encodes parenthood',async()=>{
 const p=await specializedFixture('hierarchy'),s=compileSpecialized(p);assert.equal(s.mode,'reviewed-hierarchy');assert.equal(s.pages[0].links.length,3);assert.ok(s.pages[0].links.every(e=>e.directed));
 const raw=structuredClone(p);delete raw.hierarchySemantics;const r=compileSpecialized(raw);assert.equal(r.mode,'unqualified-hierarchy');assert.ok(r.pages.flatMap(x=>x.links).every(e=>!e.directed));
 const bad=structuredClone(p);bad.hierarchySemantics.edges[0].assertionRefs=['absent'];assert.throws(()=>compileSpecialized(bad),/référence/);
 const mismatch=structuredClone(p);mismatch.hierarchySemantics.edges[0].source='d';assert.throws(()=>compileSpecialized(mismatch));
});
test('causal sign is rendered only from a concordant qualified edge, not from raw sign or cycle',async()=>{
 const p=await specializedFixture('causal');const q=compileSpecialized(p);assert.equal(q.mode,'qualified-causal');assert.ok(q.pages.some(x=>x.transcript?.some(t=>t.includes('signe −'))));
 const raw=structuredClone(p);delete raw.visualSemantics;const s=compileSpecialized(raw);assert.equal(s.mode,'candidate-relations');assert.ok(s.pages.flatMap(x=>x.links).every(e=>!e.directed));assert.ok(s.pages.every(x=>x.transcript?.every(t=>!t.includes('signe '))));
 const bad=structuredClone(p);bad.visualSemantics.causalEdges[0].sign=-1;assert.throws(()=>compileSpecialized(bad),/incohérente/);
});
test('convergence only groups actual shared targets; timelines use supplied dates; matrix keeps missing and complex values distinct',async()=>{
 const d=await specializedFixture('convergence'),s=compileSpecialized(d);assert.equal(s.pages[0].links.length,3);assert.equal(new Set(s.pages[0].links.map(e=>e.to)).size,1);assert.deepEqual(s.pages[0].refs,d.edges.map(e=>e.id));
 const t=await specializedFixture('timeline');t.items.reverse();assert.equal(compileSpecialized(t).pages[0].cards[0].label,'Premier dessin');
 const m=await specializedFixture('comparison');m.cells[0].value={x:1};const z=compileSpecialized(m);assert.equal(z.partial,true);assert.ok(z.pages[0].cards[0].detail.includes('non représentée'));assert.ok(z.pages[1].cards[2].detail.includes('Aucune valeur dans cette projection'));
});
test('projection boundaries, budgets, escaped SVG and reduced motion',async()=>{
 const p=await specializedFixture('hierarchy');p.nodes[0].label='<script>fake</script>';const s=compileSpecialized(p,{maxPages:1,aspectRatio:'9:16'});assert.ok(s.partial);assert.equal(s.pages.length,1);const svg=renderSpecialized(s,{motion:'reduced'});assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script'));assert.ok(!svg.includes('<animateTransform'));assert.equal(specializedHtml(s).includes('<script>fake'),false);
 const bad=structuredClone(p);bad.edges[0].target='absent';assert.throws(()=>compileSpecialized(bad),/extrémité/);
 assert.throws(()=>compileSpecialized({...p,derived:false}));assert.throws(()=>compileSpecialized(p,{maxPages:13}));
});
test('bounded automatic correction preserves Bundle and saved theme; never promotes review',async()=>{
 const b=await compile({density:10,aspectRatio:'1:1'});const baseline=serializeBundle(b),theme=structuredClone(THEMES[0]);theme.typography.labelPx=48;const old=JSON.stringify(theme);const initial=await compilePresentation(b,{customTheme:theme});const {plan,adjustments}=await compileOptimizedPresentation(b,{customTheme:theme});assert.equal(serializeBundle(b),baseline);assert.equal(JSON.stringify(theme),old);assert.equal(plan.bundleSha256,initial.bundleSha256);assert.equal(plan.qa.state,'review');assert.ok(plan.qa.passes<=3);assert.ok(plan.qa.diagnostics.some(d=>d.code==='Q-NOT-RUNTIME-TESTED'));assert.ok(plan.theme.typography.labelPx>=16);assert.ok(plan.qa.diagnostics.length<=initial.qa.diagnostics.length);assert.ok(Array.isArray(adjustments));
});
test('multi-Bundle batch creates independent private manifests and reports invalid inputs without claiming success',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'kg-batch-'));try{
  const a=await compile({maxHops:1}),b=await compile({maxHops:2});await fs.writeFile(path.join(tmp,'a.json'),serializeBundle(a));await fs.writeFile(path.join(tmp,'b.json'),serializeBundle(b));await fs.writeFile(path.join(tmp,'bad.json'),'{}');
  const files=['a.json','bad.json','b.json'];const list=path.join(tmp,'list.json');await fs.writeFile(list,JSON.stringify(files));const out=path.join(tmp,'out');const cli=new URL('../scripts/koreograph-multi-batch.mjs',import.meta.url);const {fileURLToPath}=await import('node:url');
  const run=spawnSync(process.execPath,[fileURLToPath(cli),'--list',list,'--out',out,'--private-bundle','--themes','signature','--formats','svg'],{encoding:'utf8',timeout:30000});assert.equal(run.status,1,run.stderr);const manifest=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));assert.equal(manifest.publicationAuthorized,false);assert.deepEqual(manifest.jobs.map(x=>x.status),['review','failed','review']);assert.equal(manifest.state,'failed');assert.ok(!JSON.stringify(manifest).includes(tmp));for(const j of manifest.jobs.filter(x=>x.status==='review')){const data=await fs.readFile(path.join(out,j.manifest));assert.equal(j.manifestSha256,createHash('sha256').update(data).digest('hex'));}assert.ok((await fs.readdir(out)).every(x=>!x.endsWith('.tmp')));
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});

// v0.3.2: all Svelte named imports must correspond to the actual module contract.
// Static check (not a substitute for the Svelte/Astro build).
test('all Svelte Koreograph named imports match declared module exports',async()=>{
  const root=new URL('../src/components/',import.meta.url);
  let checked=0;
  for(const entry of await fs.readdir(root,{recursive:true,withFileTypes:true})){
    if(!entry.isFile()||!entry.name.endsWith('.svelte'))continue;
    // On Windows use pathToFileURL rather than constructing a file URL.
    const {pathToFileURL}=await import('node:url');
    const path=await import('node:path');
    const component=pathToFileURL(path.join(entry.parentPath||entry.path,entry.name));
    const text=await fs.readFile(component,'utf8');
    for(const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+\/koreograph\/[^'"]+\.mjs)['"]/g)){
      const module=await fs.readFile(new URL(m[2],component),'utf8');
      const names=new Set([...module.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g)].map(x=>x[1]));
      for(const imported of m[1].split(',').map(x=>x.trim()).filter(Boolean)){
        const name=imported.split(/\s+as\s+/)[0];
        assert.ok(names.has(name),`${entry.name} imports missing ${name} from ${m[2]}`);checked++;
      }
    }
  }
  assert.ok(checked>=10,'integration imports were not examined');
});

test('specialized integration uses the storyboard, not the legacy Bundle player',async()=>{
  const {supportsProjection,chapterAt}=await import('../src/lib/koreograph/specialized.mjs');
  const fixture=await specializedFixture('hierarchy');
  assert.equal(supportsProjection(fixture),true);
  assert.equal(supportsProjection({...fixture,derived:false}),false);
  assert.equal(supportsProjection({...fixture,projectionKind:'unsupported'}),false);
  const story=compileSpecialized(fixture);
  for(const [index,page] of story.pages.entries()){
    assert.equal(chapterAt(story,page.startMs),index);
    assert.equal(chapterAt(story,page.endMs-1),index);
    const fixed=renderSpecialized(story,{themeId:'paper',chapterIndex:index});
    assert.ok(!fixed.includes('<animate'));
    assert.ok(fixed.includes(`${index+1} / ${story.pages.length}`));
    assert.ok(fixed.includes('aucune autorisation de publication'));
  }
  assert.equal(chapterAt(story,story.durationMs),story.pages.length-1);
  assert.throws(()=>chapterAt(story,NaN));
  assert.throws(()=>renderSpecialized(story,{chapterIndex:story.pages.length}));
  const explorer=await fs.readFile(new URL('../src/components/Explorer.svelte',import.meta.url),'utf8');
  const adaptive=await fs.readFile(new URL('../src/components/AdaptiveProjectionView.svelte',import.meta.url),'utf8');
  const component=await fs.readFile(new URL('../src/components/KoreographProjection.svelte',import.meta.url),'utf8');
  assert.match(explorer,/<AdaptiveProjectionView[\s\S]*?koreographEnabled=\{boot\?\.koreographAvailable === true && !fleetView && !technicalView && !switchingKristal\}/);
  assert.match(adaptive,/!busy && loadedKey === requestKey && supportsProjection\(data\)/);
  assert.match(adaptive,/koreographRevision: _revision/);
  assert.match(component,/compileSpecialized\(data,/);
  assert.doesNotMatch(component,/prepareProjection|KoreographPlayer|KoreographExports/);
});

// v0.3.4: Windows Firefox 155 measured ~33.04 px for 23 px labels.
// Keep a conservative baseline gap and separate label/detail bands in every ratio.
test('specialized cards reserve cross-browser multiline spacing without shrinking text',async()=>{
  const fixture=await specializedFixture('comparison');
  fixture.rows[0].label='Éléments de comparaison très détaillés';
  fixture.cells[0].value='Valeur descriptive suffisamment longue pour deux lignes';
  for(const aspectRatio of ['16:9','1:1','9:16']){
    const story=compileSpecialized(fixture,{aspectRatio});
    const before=canonical(story);
    for(const options of [{},{motion:'reduced'},{chapterIndex:0}]){
      const svg=renderSpecialized(story,options);
      const card=[...svg.matchAll(/<title>[^<]*<\/title><rect\b[^>]*height="(\d+)"[^>]*\/>[\s\S]*?<\/g>/g)][0];
      assert.ok(card,aspectRatio);assert.equal(Number(card[1]),184);
      const rectY=Number(card[0].match(/<rect\b[^>]*\by="([\d.]+)"/)[1]);
      const texts=[...card[0].matchAll(/<text x="[^"]+" y="([\d.]+)" font-size="(\d+)"/g)].map(m=>({y:Number(m[1]),size:Number(m[2])}));
      assert.deepEqual(texts.map(t=>t.size),[23,23,19,19]);
      for(let i=1;i<texts.length;i++)assert.ok(texts[i].y-texts[i-1].y>=Math.ceil(Math.max(texts[i].size,texts[i-1].size)*1.65),`${aspectRatio} baseline gap`);
      assert.ok(texts[0].y-rectY>=38);assert.ok(rectY+184-texts.at(-1).y>=30);
    }
    assert.equal(canonical(story),before);
  }
});

// Real campaign: orbital multiline labels and captions need the same spacing
// contract as specialized cards, with static/SMIL parity.
test('orbital multiline labels and captions use cross-browser baseline spacing',async()=>{
 const {lineStep}=await import('../src/lib/koreograph/presentation.mjs');
 const b=await compileScore(auto({aspectRatio:'1:1',maxHops:1}),async t=>{const p=await demoResolve(t);p.center.label='Étiquette multilignes pour vérifier';return p;});
 const p=await compilePresentation(b);const size=p.theme.typography.labelPx;assert.equal(lineStep(size),Math.ceil(size*1.65));
 const labels=svg=>[...svg.matchAll(/<text x="0" y="([0-9.]+)" font-size="([0-9]+)"[^>]*>/g)].map(m=>Number(m[1]));
 for(const svg of [renderSvg(b,p,0),renderAnimatedSvg(b,p)]){const ys=labels(svg);assert.ok(ys.some((y,i)=>i>0&&Math.abs(y-ys[i-1]-lineStep(size))<.01));}
 const cap=p.theme.typography.captionPx;const y=b.viewport.height;const expected=Math.min(y-87,y-52-lineStep(cap));
 const long=structuredClone(p);long.captions=long.captions.map(c=>({...c,text:'Une légende longue '.repeat(8)}));
 for(const svg of [renderSvg(b,long,0),renderAnimatedSvg(b,long)]){assert.ok(svg.includes(`y="${expected}" font-size="${cap}"`));assert.ok(svg.includes(`y="${expected+lineStep(cap)}" font-size="${cap}"`));}
});
