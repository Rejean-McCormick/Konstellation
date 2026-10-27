/**
 * Konstellation v11 opt-in local reader.
 * Canonical validation and lexical lookups are owned by the pinned Framework
 * through the trusted Integration Pack. No conversion to a legacy pack.
 * The v11 derived view has NO per-assertion authorization facts. Consequently
 * we only expose an explicitly selected, principal-allowlisted LOCAL dataset.
 * Public/shared/lan deployments refuse the reader until a separate C1/C2
 * publication/ACL pipeline exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fail} from '../errors.mjs';
import {requireKristalV11ReadView} from './kristal-v11-envelope.mjs';

const PINNED_SCRIPT_SHA256='6c94ffd8f8f9619d17afcd0548037d95fda40e93b6ade6bc43e36d1edd27bba1';
const PINNED_FRAMEWORK_PIN_SHA256='cdb7df8e63ea609c3cda368de012e210f7a07e0d4d86c315ac0059ae996a030e';
const OBJECT=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ID=/^[a-z][a-z0-9_-]{0,63}$/;
const LOCALE=/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/;
const sha=b=>createHash('sha256').update(b).digest('hex');
function need(v,msg){if(!v)fail('V11_CONFIG_INVALID',msg,500);}
function checkedFile(value,maxBytes=16_000_000){
  need(typeof value==='string'&&path.isAbsolute(value),'Chemin absolu v11 requis.');
  const target=path.resolve(value);
  let cur=path.parse(target).root;
  for(const item of target.slice(cur.length).split(path.sep).filter(Boolean)){
    cur=path.join(cur,item);
    need(!fs.lstatSync(cur).isSymbolicLink(),'Liens symboliques interdits pour les entrées v11.');
  }
  const stat=fs.statSync(target);
  need(stat.isFile()&&stat.size<=maxBytes,'Document v11 absent ou hors budget.');
  return target;
}
function checkedRoot(value){
  need(typeof value==='string'&&path.isAbsolute(value),'Répertoire v11 absolu requis.');
  const root=path.resolve(value);
  need(fs.statSync(root).isDirectory(),'Répertoire v11 absent.');
  return root;
}
function exactSha(file,expected){need(sha(fs.readFileSync(checkedFile(file)))===expected,'Empreinte du composant v11 non conforme.');}
export function loadV11Config(file, deploymentProfile='local'){
  if(!file)return null;
  need(deploymentProfile==='local','Lecteur v11 désactivé hors profil local.');
  const config=JSON.parse(fs.readFileSync(checkedFile(file,256_000),'utf8'));
  need(OBJECT(config)&&config.profile==='konstellation.v11-local-reader/0.1'&&config.mode==='local-only','Profil du lecteur v11 invalide.');
  need(Array.isArray(config.principals)&&config.principals.length>0&&config.principals.every(x=>typeof x==='string'&&x.length<=128),'Allowlist de principaux v11 requise.');
  need(Array.isArray(config.datasets)&&config.datasets.length>0&&config.datasets.length<=20,'Liste v11 de jeux de données invalide.');
  const packRoot=checkedRoot(config.integration_pack_root),framework=checkedRoot(config.framework_root);
  const script=path.join(packRoot,'tools','v11_integration.py');
  exactSha(script,PINNED_SCRIPT_SHA256);
  exactSha(path.join(packRoot,'contracts','v11-framework-pin.json'),PINNED_FRAMEWORK_PIN_SHA256);
  const pin=JSON.parse(fs.readFileSync(path.join(packRoot,'contracts','v11-framework-pin.json'),'utf8'));
  need(pin.version==='11.0.0-draft.4','Version de référence Framework invalide.');
  for(const [rel,digest] of Object.entries(pin.files)){
    need(!path.isAbsolute(rel)&&!rel.split('/').includes('..'),'Chemin épinglé invalide.');
    exactSha(path.join(framework,rel),digest);
  }
  const seen=new Set();
  const datasets=config.datasets.map(d=>{
    need(OBJECT(d)&&ID.test(d.id)&&!seen.has(d.id),'Identifiant v11 manquant ou dupliqué.');seen.add(d.id);
    need(typeof d.title==='string'&&d.title.length>0&&d.title.length<=140,'Titre v11 invalide.');
    need(Array.isArray(d.locales)&&d.locales.length>0&&d.locales.length<=40&&d.locales.every(l=>typeof l==='string'&&LOCALE.test(l))&&new Set(d.locales).size===d.locales.length,'Locales v11 invalides.');
    const inputs=Object.fromEntries(['registry','graph','crosswalk','catalog'].map(k=>[k,checkedFile(d[k])]));
    return {id:d.id,title:d.title,locales:d.locales,inputs};
  });
  return {framework,script,python:config.python||'python',principals:new Set(config.principals),datasets};
}
function requireLocalAccess(reader,principal,deploymentProfile){
  if(!reader)fail('NOT_FOUND','Lecteur v11 non configuré.',404);
  if(deploymentProfile!=='local')fail('NOT_FOUND','Lecteur v11 indisponible.',404);
  if(!principal||!reader.principals.has(principal.id))fail('ACCESS_DENIED','Accès v11 non autorisé.',403);
}
export function v11Catalog(reader,principal,deploymentProfile){
  requireLocalAccess(reader,principal,deploymentProfile);
  return {profile:'konstellation.v11-local-catalog/0.1',mode:'local-only',publication_authorized:false,canonical:false,
    datasets:reader.datasets.map(({id,title,locales})=>({id,title,locales}))};
}
export function v11View(reader,principal,deploymentProfile,id,locale){
  requireLocalAccess(reader,principal,deploymentProfile);
  const ds=reader.datasets.find(x=>x.id===id);
  if(!ds||!ds.locales.includes(locale))fail('NOT_FOUND','Lecture v11 indisponible.',404);
  // Do not accept client-supplied paths, flags, or Python source. No shell/network.
  const args=[reader.script,'view','--framework',reader.framework,...['registry','graph','crosswalk','catalog'].flatMap(k=>['--'+k,ds.inputs[k]]),'--locale',locale];
  const result=spawnSync(reader.python,args,{shell:false,encoding:'utf8',timeout:45000,maxBuffer:8_000_000,env:{...process.env,PYTHONUTF8:'1'}});
  if(result.error||result.status!==0)fail('V11_VALIDATION_FAILED','Validation v11 indisponible ou refusée.',422);
  let view;
  try{view=requireKristalV11ReadView(JSON.parse(result.stdout));}
  catch{fail('V11_VALIDATION_FAILED','Sortie de lecture v11 invalide.',422);}
  if(view.presentation.length>50_000||view.assertions.length>100_000)fail('V11_BUDGET_EXCEEDED','Vue v11 au-delà du budget.',422);
  return {dataset:id,read_only:true,publication_authorized:false,access_profile:'local-explicit-only',...view};
}
/** Return a scoped, human-readable neighborhood from a fully verified view. */
export function v11Neighborhood(view,semanticId){
  if(!/^KQ[1-9][0-9]*$/.test(semanticId||''))fail('NOT_FOUND','Entité v11 indisponible.',404);
  const entry=view.presentation.find(p=>p.kind==='entity'&&p.semantic_id===semanticId);
  if(!entry)fail('NOT_FOUND','Entité v11 indisponible.',404);
  const label=new Map(view.presentation.map(p=>[p.semantic_id,p]));
  const assertions=view.assertions.filter(a=>a.subject===semanticId||(a.object.kind==='entity'&&a.object.id===semanticId));
  return {profile:'konstellation.v11-neighborhood/0.1',namespace_id:view.source.namespace_id,graph_id:view.source.graph_id,
    framework_version:view.source.framework_version,requested_locale:view.requested_locale,derived_only:true,
    entity:entry,assertions:assertions.map(a=>({ ...a, predicate_presentation:label.get(a.predicate),
      subject_presentation:label.get(a.subject),object_presentation:a.object.kind==='entity'?label.get(a.object.id):null })),
    lexical_status:view.coverage_counts,limits:view.limits};
}
