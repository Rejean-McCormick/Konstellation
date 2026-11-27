#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const opts={list:null,out:null,themes:'signature,paper',formats:'svg,html,vtt'};let accept=false;
const args=process.argv.slice(2);for(let i=0;i<args.length;i++){const a=args[i];if(a==='--private-bundle'){accept=true;continue;}const k=a.slice(2);if(!a.startsWith('--')||!Object.hasOwn(opts,k)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Option invalide.');opts[k]=args[++i];}
if(!accept||!opts.list||!opts.out)throw Error('--list, --out et --private-bundle obligatoires.');
const stat=await fs.lstat(opts.list);if(!stat.isFile()||stat.size>32768)throw Error('Liste hors budget.');
const bytes=await fs.readFile(opts.list);if(bytes.length>32768)throw Error('Liste hors budget.');const list=JSON.parse(bytes.toString('utf8'));
if(!Array.isArray(list)||list.length<1||list.length>12||list.some(x=>typeof x!=='string'||!x.trim()||x.length>4096))throw Error('Liste JSON : 1 à 12 chemins explicites.');
const sources=list.map(x=>path.resolve(path.dirname(path.resolve(opts.list)),x));const keys=sources.map(s=>process.platform==='win32'?s.toLowerCase():s);if(new Set(keys).size!==keys.length)throw Error('Bundle répété.');
const count=opts.themes.split(',').length*opts.formats.split(',').length;if(count>20||count*list.length>120)throw Error('Budget : 20 sorties/Bundle, 120/campagne.');
for(const f of sources){const s=await fs.lstat(f);if(!s.isFile()||s.size>4*1024*1024)throw Error('Bundle régulier hors budget ou lien symbolique.');}
const out=path.resolve(opts.out);await fs.mkdir(out);let cancelled=false,child=null;const cancel=()=>{cancelled=true;child?.kill('SIGTERM');};process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
const manifest={format:'koreograph.multi-batch/0.1',publicationAuthorized:false,runtimeQualified:false,state:'running',jobs:[]};
const save=async()=>{const tmp=path.join(out,'manifest.tmp');await fs.writeFile(tmp,JSON.stringify(manifest,null,2)+'\n');await fs.rename(tmp,path.join(out,'manifest.json'));};
await save();
for(let i=0;i<sources.length;i++){
  const id=`bundle-${String(i+1).padStart(2,'0')}`;const job={id,status:'pending'};manifest.jobs.push(job);
  if(cancelled){job.status='skipped';await save();continue;}
  try{const src=await fs.readFile(sources[i]);if(src.length>4*1024*1024)throw Error('budget');job.inputSha256=createHash('sha256').update(src).digest('hex');
    // Snapshot the exact bytes into a temporary private file; never include the input in outputs.
    const input=path.join(out,`.${id}.input.tmp`);await fs.writeFile(input,src,{flag:'wx',mode:0o600});
    let code;try{code=await new Promise((resolve,reject)=>{child=spawn(process.execPath,[fileURLToPath(new URL('./koreograph-batch.mjs',import.meta.url)),'--bundle',input,'--private-bundle','--optimize','--out',path.join(out,id),'--themes',opts.themes,'--formats',opts.formats],{stdio:'ignore',shell:false});child.once('error',reject);child.once('exit',(c)=>resolve(c));});}finally{child=null;await fs.rm(input,{force:true});}
    const childManifest=await fs.readFile(path.join(out,id,'manifest.json'));job.manifest=`${id}/manifest.json`;job.manifestSha256=createHash('sha256').update(childManifest).digest('hex');const detail=JSON.parse(childManifest);job.outputs=detail.outputs.length;job.successful=detail.outputs.filter(x=>x.status==='success').length;job.status=cancelled?'cancelled':code===0&&detail.state==='review'?'review':'failed';
  }catch{job.status=cancelled?'cancelled':'failed';job.reason='batch-failed';}await save();
}
manifest.state=cancelled?'cancelled':manifest.jobs.every(j=>j.status==='review')?'review':'failed';await save();console.log(JSON.stringify({state:manifest.state,jobs:manifest.jobs.length,successful:manifest.jobs.filter(j=>j.status==='review').length,out},null,2));if(manifest.state!=='review')process.exitCode=1;
