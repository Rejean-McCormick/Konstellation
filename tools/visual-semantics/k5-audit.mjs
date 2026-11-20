#!/usr/bin/env node
/**
 * Private, read-only inspection of an operator-selected native v6 source.
 * No policy is inferred and NOTHING is approved or made publishable here.
 * Always require a raw byte SHA pin and write report outside the code repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

const ROOT=path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname),'..','..');
const ID=/^[A-Za-z0-9][A-Za-z0-9_:./-]{0,199}$/;
const SHA=/^(?:sha256:)?[a-f0-9]{64}$/;
const fail = (message) => { throw Error(message); };
const hash=(bytes)=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);

export function auditNativeV6(data,sourceSha,stateRef='') {
  if (!obj(data) || data.schema_version!=='6.0' || !Array.isArray(data.assertions) ||
      data.assertions.length>100000 || !SHA.test(sourceSha) ||
      (stateRef && !ID.test(stateRef))) fail('UNSUPPORTED_OR_INVALID_SOURCE');
  const grouped=new Map(),ids=new Set();
  for(const a of data.assertions){
    const relationId=a?.statement?.predicate, ref=a?.assertion_id;
    if(typeof relationId!=='string'||!ID.test(relationId)||typeof ref!=='string'||!ID.test(ref)||ids.has(ref)) fail('INVALID_ASSERTION_SHAPE');
    ids.add(ref);
    const group=grouped.get(relationId)||{relationId,assertionCount:0,objectKinds:{},valuations:{},sampleAssertionRefs:[],sampleSourceRefs:[]};
    group.assertionCount++;
    const kind=a.statement?.object?.kind;
    const key=['referent','string','number','integer','boolean','interval'].includes(kind)?kind:'other';
    group.objectKinds[key]=(group.objectKinds[key]||0)+1;
    if(group.sampleAssertionRefs.length<5)group.sampleAssertionRefs.push(ref);
    for(const src of a.evidence_refs||[]){
      if(typeof src==='string'&&ID.test(src)&&!group.sampleSourceRefs.includes(src)&&group.sampleSourceRefs.length<5)
        group.sampleSourceRefs.push(src);
    }
    for(const v of a.valuations||[]){
      if(!obj(v)||typeof v.dimension!=='string'||!ID.test(v.dimension))continue;
      const type=typeof v.value_semantics==='string'&&ID.test(v.value_semantics)?v.value_semantics:'unknown';
      const st=typeof v.value_state==='string'&&ID.test(v.value_state)?v.value_state:'unknown';
      const unit=typeof v.unit==='string'&&ID.test(v.unit)?v.unit:null;
      const vkey=JSON.stringify([v.dimension,type,st,unit]);
      const old=group.valuations[vkey]||{dimension:v.dimension,valueSemantics:type,valueState:st,unit,count:0};
      old.count++;group.valuations[vkey]=old;
    }
    grouped.set(relationId,group);
  }
  const predicates=[...grouped.values()].sort((a,b)=>a.relationId.localeCompare(b.relationId)).map(row=>({
    ...row,objectKinds:Object.fromEntries(Object.entries(row.objectKinds).sort()),
    valuations:Object.values(row.valuations).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
    sampleAssertionRefs:row.sampleAssertionRefs.sort(),sampleSourceRefs:row.sampleSourceRefs.sort(),
  }));
  const scalar=predicates.reduce((n,p)=>n+p.valuations.filter(v=>v.valueSemantics==='scalar'&&v.valueState==='known').reduce((sum,v)=>sum+v.count,0),0);
  const result={
    format:'konstellation.private-k5-source-audit/0.1',
    status:'OBSERVATION_ONLY_NOT_POLICY_FILTERED_NOT_APPROVED',
    source:{sha256:sourceSha,declaredStateRef:stateRef||null,schemaVersion:'6.0',artifactType:data.artifact_type||null},
    assertionCount:data.assertions.length,predicateCount:predicates.length,knownScalarValuationCount:scalar,predicates,
    limitations:[
      'Analyse hors lecteur : la Reader Policy n est PAS appliquee ici. Garder ce fichier prive.',
      'Un nom de relation et des comptages ne prouvent ni direction, ni causalite, ni geometrie.',
      'La grammaire de qualification K5 exige ensuite datasetRef + readerPolicyRef du vrai lecteur et une revue humaine.',
      'Aucun C1, C2, C3, C4 ni autorisation de publier n est produit par cet audit.',
    ],
  };
  return result;
}

function parseArgs(argv) {
  const parsed={};
  for(let i=0;i<argv.length;i++){
    const flag=argv[i];
    if(!['--source','--sha256','--out','--state-ref'].includes(flag)||!argv[i+1]||argv[i+1].startsWith('--')||parsed[flag])fail('USAGE: node tools/visual-semantics/k5-audit.mjs --source FILE --sha256 64HEXDIGITS --out PRIVATE_OUTPUT_FILE [--state-ref ID]');
    parsed[flag]=argv[++i];
  }
  for(const key of ['--source','--sha256','--out'])if(!parsed[key])fail('MISSING_ARGUMENT: '+key);
  return parsed;
}
function isInside(child,parent){return child===parent||child.startsWith(parent+path.sep);}
export function runAudit({source,expectedSha,out,stateRef=''}) {
  if(!SHA.test(expectedSha))fail('INVALID_SHA256_PIN');
  const realSource=fs.realpathSync(source);
  const srcInfo=fs.lstatSync(source);
  if(srcInfo.isSymbolicLink()||!fs.statSync(realSource).isFile())fail('SOURCE_MUST_BE_REGULAR_FILE');
  if(fs.statSync(realSource).size>12*1024*1024)fail('SOURCE_TOO_LARGE');
  const bytes=fs.readFileSync(realSource);const digest=hash(bytes);
  if(digest!==(expectedSha.startsWith('sha256:')?expectedSha:'sha256:'+expectedSha))fail('SOURCE_SHA256_MISMATCH');
  const final=path.resolve(out),folder=path.dirname(final),realFolder=fs.realpathSync(folder);
  const repo=fs.realpathSync(ROOT);
  if(isInside(realFolder,repo)||isInside(final,repo))fail('OUTPUT_MUST_BE_OUTSIDE_CODE_REPOSITORY');
  if(fs.existsSync(final))fail('OUTPUT_ALREADY_EXISTS_REFUSED');
  if(!path.basename(final).endsWith('.json'))fail('OUTPUT_MUST_BE_JSON');
  const report=auditNativeV6(JSON.parse(bytes.toString('utf8')),digest,stateRef);
  fs.writeFileSync(final,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  return {status:'PRIVATE_REPORT_WRITTEN',sourceSha256:digest,assertions:report.assertionCount,
    predicates:report.predicateCount,scalarValuations:report.knownScalarValuationCount,
    report:final,approved:false,published:false};
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(new URL(import.meta.url))){
  try{
    const a=parseArgs(process.argv.slice(2));
    console.log(JSON.stringify(runAudit({source:a['--source'],expectedSha:a['--sha256'],out:a['--out'],stateRef:a['--state-ref']||''}),null,2));
  }catch(error){console.error(JSON.stringify({status:'REFUSED',reason:error.message}));process.exitCode=2;}
}
