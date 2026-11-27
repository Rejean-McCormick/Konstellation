#!/usr/bin/env node
// Sequential local batch, no network, no credential input, no overwrite.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { makeScore,compileScore,VERSION } from '../src/lib/koreograph/engine.mjs';
import { DEMO_SOURCE,DEMO_START,demoResolve } from '../src/lib/koreograph/demo-data.mjs';
import { compilePresentation,compileOptimizedPresentation,serializeBundle,validateTheme } from '../src/lib/koreograph/presentation.mjs';
import { renderSvg,renderAnimatedSvg,standaloneHtml } from '../src/lib/koreograph/render.mjs';
import { validateExportedBundle } from '../src/lib/koreograph/production.mjs';
import { THEMES } from '../src/lib/koreograph/themes.mjs';
const opts={out:null,bundle:null,themes:'signature,paper,spectrum',formats:'svg,html',custom:null,ratio:'16:9'};
let accept=false,optimize=false;const args=process.argv.slice(2);for(let i=0;i<args.length;i++){const a=args[i];if(a==='--optimize'){optimize=true;continue;}if(a==='--private-bundle'){accept=true;continue;}const k=a.slice(2);if(!a.startsWith('--')||!Object.hasOwn(opts,k)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Option invalide : '+a);opts[k]=args[++i];}
const readJson=async(file,limit)=>{const s=await fs.stat(file);if(!s.isFile()||s.size>limit)throw Error('Fichier JSON hors budget.');const data=await fs.readFile(file);if(data.length>limit)throw Error('Fichier JSON hors budget.');return JSON.parse(data.toString('utf8'));};
if(!opts.out)throw Error('--out obligatoire : nouveau dossier local.');if(opts.bundle&&!accept)throw Error('Bundle exporté : --private-bundle obligatoire (pas une permission de publication).');
const ids=opts.themes.split(',');const formats=opts.formats.split(',');if(!ids.length||ids.length>8||new Set(ids).size!==ids.length||ids.some(x=>!THEMES.some(t=>t.id===x)))throw Error('Thèmes invalides.');
if(!formats.length||new Set(formats).size!==formats.length||formats.some(x=>!['svg','html','poster','plan','vtt'].includes(x)))throw Error('Formats : svg, html, poster, plan, vtt.');
const themes=THEMES.filter(t=>ids.includes(t.id));if(opts.custom)themes.push(validateTheme(await readJson(opts.custom,32768)));if(themes.length>8||themes.length*formats.length>20||new Set(themes.map(t=>t.id)).size!==themes.length)throw Error('Budget maximum : 8 thèmes, 20 sorties, identifiants uniques.');
const bundle=validateExportedBundle(opts.bundle?await readJson(opts.bundle,4*1024*1024):await compileScore(makeScore(DEMO_SOURCE,DEMO_START,{aspectRatio:opts.ratio}),demoResolve));
const out=path.resolve(opts.out);await fs.mkdir(out); // existing folder = reject, even if empty
const digest=x=>createHash('sha256').update(x).digest('hex');
const manifest={format:'koreograph.local-batch/0.1',compilerVersion:VERSION,sourceMode:opts.bundle?'explicit-private-export':'synthetic',publicationAuthorized:false,bundleSha256:digest(serializeBundle(bundle)),runtimeQualified:false,outputs:[],state:'running'};
let cancelled=false;process.on('SIGINT',()=>{cancelled=true;});process.on('SIGTERM',()=>{cancelled=true;});
const save=async()=>{const tmp=path.join(out,'manifest.tmp');await fs.writeFile(tmp,JSON.stringify(manifest,null,2)+'\n');await fs.rename(tmp,path.join(out,'manifest.json'));};
const ts=ms=>`${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
const vtt=p=>'WEBVTT\n\n'+p.captions.map(c=>`${ts(c.startMs)} --> ${ts(c.endMs)}\n${c.text.replace(/[\r\n\u0000-\u001f]/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}\n`).join('\n');
await save();
for(const theme of themes){let plan,adjustments=[];try{if(!cancelled){if(optimize)({plan,adjustments}=await compileOptimizedPresentation(bundle,{customTheme:theme}));else plan=await compilePresentation(bundle,{customTheme:theme});}}catch{}for(const format of formats){const filename=theme.id+({svg:'.animated.svg',html:'.html',poster:'.poster.svg',plan:'.plan.json',vtt:'.vtt'}[format]);const entry={theme:theme.id,format,file:filename,status:'skipped'};manifest.outputs.push(entry);if(cancelled)entry.reason='cancelled';else if(!plan||plan.qa.state==='fail'){entry.status='failed';entry.reason='presentation-invalid';}else {try{const content=({svg:()=>renderAnimatedSvg(bundle,plan),html:()=>standaloneHtml(bundle,plan),poster:()=>renderSvg(bundle,plan,0),plan:()=>JSON.stringify(plan,null,2)+'\n',vtt:()=>vtt(plan)})[format]();const bytes=Buffer.byteLength(content);if(bytes>32*1024*1024)throw Error('output-budget');const tmp=path.join(out,filename+'.tmp');try{await fs.writeFile(tmp,content,{flag:'wx'});await fs.rename(tmp,path.join(out,filename));}finally{await fs.rm(tmp,{force:true});}Object.assign(entry,{status:'success',bytes,sha256:digest(content),qa:plan.qa.state,effectiveThemeSha256:plan.themeSha256,adjustments,diagnostics:plan.qa.diagnostics.map(x=>x.code)});}catch{entry.status='failed';entry.reason='render-or-write-failed';}}await save();}}
manifest.state=cancelled?'cancelled':manifest.outputs.some(x=>x.status!=='success')?'failed':'review';await save();console.log(JSON.stringify({state:manifest.state,outputs:manifest.outputs.length,successful:manifest.outputs.filter(x=>x.status==='success').length,manifest:path.join(out,'manifest.json')},null,2));if(cancelled||manifest.state==='failed')process.exitCode=1;
