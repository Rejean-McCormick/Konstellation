#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runK6} from './k6-core.mjs';

export function parseArgs(args) {
  const known=new Set(['--collection-root','--pins','--out','--max']); const options={};
  for(let i=0;i<args.length;i++){
    const key=args[i], val=args[++i];
    if(!known.has(key)||!val||val.startsWith('--')||Object.hasOwn(options,key))throw Error('USAGE: node tools/visual-semantics/k6-batch.mjs --collection-root DIR --pins MANIFEST.json --out PRIVATE_OUTPUT_DIR [--max 1..512]');
    options[key]=val;
  }
  for(const key of ['--collection-root','--pins','--out'])if(!options[key])throw Error('MISSING_ARGUMENT '+key);
  return options;
}
const running=process.argv[1] && fs.realpathSync(path.resolve(process.argv[1]))===fileURLToPath(import.meta.url);
if(running){
  try {
    const a=parseArgs(process.argv.slice(2));
    const repositoryRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
    const r=runK6({repositoryRoot,collectionRoot:a['--collection-root'],pinsPath:a['--pins'],
      outputRoot:a['--out'],maxSources:a['--max']?Number(a['--max']):512});
    console.log(JSON.stringify({status:r.summary.status,runDir:r.runDir,
      audited:r.summary.auditedNativeStates,assertions:r.summary.assertionsAudited,
      needsAdapter:r.summary.missingAdapters,refused:r.summary.refused,cached:r.cachedPass1},null,2));
    if(r.summary.refused || r.summary.unprocessedEntries)process.exitCode=2;
  }catch(err){console.error(JSON.stringify({status:'REFUSED',reason:err.message},null,2));process.exitCode=2;}
}
