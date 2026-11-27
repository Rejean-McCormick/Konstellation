#!/usr/bin/env node
// Offline, explicitly selected projection DTO, validated by Konstellation's own contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { compileSpecialized,renderSpecialized,specializedHtml } from '../src/lib/koreograph/specialized.mjs';
import { THEMES } from '../src/lib/koreograph/themes.mjs';
import { validate } from '../server/contracts.mjs';
const args=process.argv.slice(2),opts={projection:null,out:null,theme:'signature',ratio:'16:9',motion:'standard'};let privateCopy=false;
for(let i=0;i<args.length;i++){const a=args[i];if(a==='--private-projection'){privateCopy=true;continue;}const k=a.slice(2);if(!a.startsWith('--')||!Object.hasOwn(opts,k)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Option invalide : '+a);opts[k]=args[++i];}
if(!opts.projection||!opts.out||!privateCopy)throw Error('--projection, --private-projection et --out (nouveau dossier local) obligatoires.');
if(!THEMES.some(t=>t.id===opts.theme))throw Error('Thème inconnu.');
const st=await fs.lstat(opts.projection);if(!st.isFile()||st.size>4*1024*1024)throw Error('Projection : fichier régulier <= 4 Mio requis.');
const data=await fs.readFile(opts.projection);if(data.length>4*1024*1024)throw Error('Projection hors budget.');
const projection=JSON.parse(data.toString('utf8'));validate('navigation-projection',projection);
const story=compileSpecialized(projection,{aspectRatio:opts.ratio});const options={themeId:opts.theme,motion:opts.motion};
const outputs={'animation.svg':renderSpecialized(story,options),'animation.html':specializedHtml(story,options),'storyboard.json':JSON.stringify(story,null,2)+'\n'};
const out=path.resolve(opts.out);await fs.mkdir(out);const files=[];
for(const [name,content] of Object.entries(outputs)){const bytes=Buffer.byteLength(content);if(bytes>32*1024*1024)throw Error('Sortie hors budget.');await fs.writeFile(path.join(out,name),content,{flag:'wx'});files.push({file:name,bytes,sha256:createHash('sha256').update(content).digest('hex')});}
const manifest={format:'koreograph.specialized-production/0.1',sourceMode:'explicit-private-projection',publicationAuthorized:false,state:'review',runtimeQualified:false,projectionSha256:story.projectionSha256,projectionKind:story.projectionKind,mode:story.mode,partial:story.partial,omitted:story.omitted,files};await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({state:manifest.state,kind:story.projectionKind,mode:story.mode,pages:story.pages.length,partial:story.partial,out},null,2));
