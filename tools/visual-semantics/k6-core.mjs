/**
 * K6-a PRIVATE batch of exact pinned raw native v6 sources.
 * This is an inventory of UNFILTERED SOURCE, not a Reader Policy projection.
 * It MUST NOT claim world semantics, qualified views, C1–C4 or publication.
 * Pass 1: verified source -> reproducible K5 evidence audit.
 * Pass 2: candidate family analysis, private diagnostic count diagram, review queue.
 * All output resides outside both the repository and source collection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { auditNativeV6 } from './k5-audit.mjs';

export const K6_FORMAT = 'konstellation.k6-source-pins/0.1';
export const K6_VERSION = 'k6-batch/0.1';
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,98}$/;
const sha = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const sorted = a => [...a].sort((a,b)=>String(a).localeCompare(String(b),'en'));
const fail = s => { throw new Error(s); };
const only = (x, keys) => Object.keys(x).every(k=>keys.includes(k));
const json = x => JSON.stringify(x, null, 2) + '\n';
const inside = (child,parent) => child === parent || child.startsWith(parent + path.sep);
const escapeXml = s => String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const reportVersion = {engine:K6_VERSION, audit:'konstellation.private-k5-source-audit/0.1'};

export function validatePins(v) {
  if (!obj(v) || !only(v,['format','status','snapshot','entries']) || v.format !== K6_FORMAT ||
      v.status !== 'PRIVATE_CANDIDATE_INVENTORY_NOT_AUTHORIZED' || !obj(v.snapshot) ||
      !only(v.snapshot,['name','sha256']) || typeof v.snapshot.name !== 'string' || v.snapshot.name.length > 160 ||
      !DIGEST.test(v.snapshot.sha256 || '') || !Array.isArray(v.entries) ||
      v.entries.length < 1 || v.entries.length > 512) fail('INVALID_K6_PINS');
  const seen = new Set(), paths = new Set();
  for (const r of v.entries) {
    if (!obj(r) || !only(r,['slug','profile','path','sha256']) || !SLUG.test(r.slug || '') ||
        seen.has(r.slug) || !['native-v6','requires-adapter'].includes(r.profile)) fail('INVALID_K6_ENTRY');
    seen.add(r.slug);
    if (r.profile === 'native-v6') {
      const expected = `kristals/${r.slug}/canon/domain/`;
      if (typeof r.path !== 'string' || !r.path.startsWith(expected) ||
          !/^kristals\/[a-z0-9_-]+\/canon\/domain\/[A-Za-z0-9_.-]+\.json$/.test(r.path) ||
          r.path.includes('..') || paths.has(r.path) || !DIGEST.test(r.sha256 || '')) fail('INVALID_NATIVE_PIN');
      paths.add(r.path);
    } else if (r.path !== null || r.sha256 !== null) fail('UNSUPPORTED_PIN_HAS_SOURCE');
  }
  return v;
}

// No traversal through symlink or Windows junction/reparse shortcuts.
function safePath(root,rel) {
  let cur = root;
  for (const part of rel.split('/')) {
    cur = path.join(cur,part);
    if (fs.existsSync(cur)) {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink()) fail('SYMLINK_SOURCE_REFUSED');
      if (process.platform === 'win32') {
        const rp = fs.realpathSync.native(cur);
        if (!inside(rp,root)) fail('REPARSE_REDIRECT_REFUSED');
      }
    }
  }
  const dest = path.resolve(cur);
  if (!inside(dest,root)) fail('SOURCE_PATH_ESCAPE');
  return dest;
}
function sourceBytes(root,entry) {
  const src=safePath(root,entry.path);
  if (!fs.existsSync(src)) fail('SOURCE_NOT_PRESENT');
  const st=fs.statSync(src);
  if (!st.isFile() || st.size > 12*1024*1024 || st.size < 2) fail('SOURCE_NOT_REGULAR_OR_TOO_LARGE');
  const bytes=fs.readFileSync(src);
  if (sha(bytes)!==entry.sha256) fail('SOURCE_PIN_SHA256_MISMATCH');
  return bytes;
}
function assertPrivateOutput(outDir,repo,collection) {
  const resolveMaybe=p=>path.resolve(p);
  const dir=resolveMaybe(outDir);
  if (inside(dir,repo) || inside(dir,collection) || inside(repo,dir) || inside(collection,dir)) fail('OUTPUT_MUST_BE_SEPARATE_PRIVATE_DIRECTORY');
  // Reject redirected parent path, not only the final path.
  let ancestor=dir;
  while (!fs.existsSync(ancestor)) ancestor=path.dirname(ancestor);
  if (fs.lstatSync(ancestor).isSymbolicLink()) fail('OUTPUT_SYMLINK_REFUSED');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const real=fs.realpathSync.native(dir);
  if (real!==dir || inside(real,repo) || inside(real,collection)) fail('OUTPUT_REDIRECTION_REFUSED');
  return dir;
}
function writeImmutable(filename,body) {
  fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  const bytes=Buffer.from(body,'utf8');
  try { fs.writeFileSync(filename,bytes,{flag:'wx',mode:0o600});return 'written'; }
  catch (err) {
    if (err.code!=='EEXIST') throw err;
    const st=fs.lstatSync(filename);
    if (!st.isFile() || st.isSymbolicLink() || !fs.readFileSync(filename).equals(bytes)) fail('IMMUTABLE_OUTPUT_COLLISION');
    return 'cached';
  }
}

export function rankCandidates(audit) {
  // The *only* classification is evidence shape. Predicate names are not used
  // to assert taxonomy, causality, opposition or any domain interpretation.
  const records=[];
  for (const row of audit.predicates) {
    const referents=row.objectKinds.referent || 0;
    const knownScalar=row.valuations.filter(v=>v.valueSemantics==='scalar' && v.valueState==='known')
      .reduce((n,v)=>n+v.count,0);
    const ordinal=row.valuations.filter(v=>v.valueSemantics==='ordinal').reduce((n,v)=>n+v.count,0);
    const temporal=(row.objectKinds.interval||0);
    const groups=[];
    if(referents) groups.push('REFERENT_GRAPH_CANDIDATE');
    if(knownScalar) groups.push('SCALAR_ENCODING_CANDIDATE');
    if(ordinal) groups.push('ORDINAL_NOT_SCALAR');
    if(temporal) groups.push('INTERVAL_LAYOUT_CANDIDATE');
    if(!groups.length) groups.push('GENERIC_RELATION_CANDIDATE');
    records.push({relationId:row.relationId,assertionCount:row.assertionCount,
      candidateGroups:groups,referentCount:referents,knownScalarValuations:knownScalar,
      ordinalValuations:ordinal,intervalCount:temporal,
      sampleAssertionRefs:row.sampleAssertionRefs,
      qualification:'NOT_REVIEWED_NOT_POLICY_FILTERED',
      needs:['readerPolicyRef','datasetRef','visibleWitnesses','semanticReview','scope']});
  }
  return records.sort((a,b)=>b.assertionCount-a.assertionCount || a.relationId.localeCompare(b.relationId,'en'));
}
export function makeSecondPass(audit,slug) {
  const candidates=rankCandidates(audit);
  const knownScalars=candidates.reduce((n,r)=>n+r.knownScalarValuations,0);
  return {
    format:'konstellation.k6-review-queue/0.1',slug,
    status:'PASS_2_REVIEW_REQUIRED_NOT_APPROVED',
    sourceSha256:audit.source.sha256,
    counts:{assertions:audit.assertionCount,predicates:audit.predicateCount,candidateRelations:candidates.length,
      scalarValuationCandidates:knownScalars},
    candidateRelations:candidates,
    reviewChecks:[
      'Obtenir le contexte du lecteur Konstellation filtré par Reader Policy, pas seulement ce rapport natif.',
      'Vérifier la direction exacte, les unités, le domaine, les contradictions et les sources pour chaque relation.',
      'Comparer datasetRef et readerPolicyRef réels avec les règles de K4/K5 avant activation.',
      'Les graphes de lecture réels nécessitent des projections du lecteur autorisé, non cette source brute.',
      'Aucune validation C1/C2/C3/C4, aucune publication et aucune canonisation ne sont déduites.'
    ],
  };
}
export function renderPrivateDiagnosticSvg(audit,slug) {
  const values=rankCandidates(audit).slice(0,18);
  const w=960,header=150,rowHeight=33,foot=85,h=header+values.length*rowHeight+foot;
  const max=Math.max(1,...values.map(x=>x.assertionCount));
  const rows=values.map((v,i)=>{
    const y=header+i*rowHeight; const val=v.assertionCount; const width=Math.max(1,Math.round((val/max)*490));
    return `<text x="24" y="${y+18}" font-size="13" fill="#152136">${escapeXml(v.relationId.slice(0,45))}</text>`+
      `<rect x="400" y="${y+3}" width="${width}" height="19" fill="#466b8d"/>`+
      `<text x="${Math.min(920,415+width)}" y="${y+18}" font-size="12" fill="#152136">${val}</text>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`+
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">`+
  `<title id="t">Diagnostic privé de comptages : ${escapeXml(slug)}</title>`+
  `<desc id="d">Inventaire des nombres d'assertions de la source native non filtrée. Ce n'est PAS un diagramme de faits, ni une qualification.</desc>`+
  `<rect width="${w}" height="${h}" fill="#f7f9fc"/>`+
  `<text x="24" y="36" font-size="22" font-family="sans-serif" fill="#152136">Inventaire privé · ${escapeXml(slug)}</text>`+
  `<text x="24" y="66" font-size="14" font-family="sans-serif" fill="#8b253a">SOURCE NON FILTRÉE · NON QUALIFIÉE · NE PAS PUBLIER</text>`+
  `<text x="24" y="94" font-size="13" font-family="sans-serif">${audit.assertionCount} assertions · ${audit.predicateCount} relations · barres = comptages uniquement</text>`+
  `<text x="24" y="123" font-size="12" font-family="sans-serif">La longueur des barres ne mesure ni importance, ni vérité, ni quantité du domaine.</text>`+
  `<g font-family="sans-serif">${rows}</g>`+
  `<text x="24" y="${h-38}" font-size="12" font-family="sans-serif" fill="#8b253a">Aucune Reader Policy appliquée. À conserver hors dépôt et hors web.</text>`+
  `</svg>\n`;
}

export function renderPrivateWorkbench(summary) {
  const entries=[...summary.items].sort((a,b)=> (b.assertions||0)-(a.assertions||0) || a.slug.localeCompare(b.slug,'en'));
  const rows=entries.map(item=>{
    const ref=item.privateDiagnostic
      ? `<a href="${escapeXml(item.privateDiagnostic)}">Diagramme diagnostic</a>`
      : 'Adaptateur requis / refus';
    return `<tr><td>${escapeXml(item.slug)}</td><td>${escapeXml(item.status)}</td><td>${Number(item.assertions)||0}</td><td>${Number(item.predicates)||0}</td><td>${ref}</td></tr>`;
  }).join('\n');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Atelier privé K6</title>`+
  `<meta name="viewport" content="width=device-width,initial-scale=1"/>`+
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"/>`+
  `<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:auto;padding:1.5rem;color:#152136}table{width:100%;border-collapse:collapse}td,th{padding:.55rem;border-bottom:1px solid #d5dfe9;text-align:left}thead{background:#eef3fa}a{color:#155181}mark{background:#ffe7cb}p{line-height:1.5}</style>`+
  `</head><body><h1>Konstellation K6 — atelier privé</h1>`+
  `<p><strong>Observation NON filtrée, NON approuvée. Ne pas publier ni utiliser comme graphe de savoir.</strong></p>`+
  `<p>États natifs audités : ${summary.auditedNativeStates}; assertions de fichiers : ${summary.assertionsAudited}; adaptateurs requis : ${summary.missingAdapters}; refus : ${summary.refused}.</p>`+
  `<p>Les SVG montrent UNIQUEMENT des nombres d’assertions par relation. Une nouvelle représentation sémantique exige Reader Policy et une revue K4/K5.</p>`+
  `<table><thead><tr><th>Kristal</th><th>Statut</th><th>Assertions</th><th>Relations</th><th>Échantillon de comptages</th></tr></thead><tbody>${rows}</tbody></table></body></html>\n`;
}

export function runK6({repositoryRoot,collectionRoot,pinsPath,outputRoot,maxSources=512}) {
  if (!Number.isSafeInteger(maxSources) || maxSources<1 || maxSources>512) fail('INVALID_BATCH_LIMIT');
  const repo=fs.realpathSync.native(repositoryRoot),collection=fs.realpathSync.native(collectionRoot);
  if (!fs.statSync(collection).isDirectory()) fail('COLLECTION_NOT_DIRECTORY');
  const pinBytes=fs.readFileSync(pinsPath);
  const pins=validatePins(JSON.parse(pinBytes.toString('utf8')));
  const out=assertPrivateOutput(outputRoot,repo,collection);
  const runId=sha(Buffer.from(K6_VERSION+'|'+sha(pinBytes)+'|entries='+Math.min(maxSources,pins.entries.length))).slice(7,23);
  const runRoot=path.join(out,'runs',runId);
  const statuses=[];
  const grouped=new Map();let audits=0,cached=0,uncertainties=0,assertionTotal=0;
  const entries=pins.entries.slice(0,maxSources);
  for(const entry of entries) {
    if (entry.profile!=='native-v6') {
      statuses.push({slug:entry.slug,status:'NEEDS_ADAPTER',reason:'NO_EXACT_NATIVE_V6_SOURCE_PIN'});
      continue;
    }
    let raw;
    try {raw=sourceBytes(collection,entry);}
    catch(err) {statuses.push({slug:entry.slug,status:'REFUSED',reason:err.message});uncertainties++;continue;}
    try {
      const report=auditNativeV6(JSON.parse(raw.toString('utf8')),entry.sha256);
      const p1=path.join(runRoot,'pass1',entry.slug+'.json');
      const p2=path.join(runRoot,'pass2',entry.slug+'.json');
      const svg=path.join(runRoot,'private-diagrams',entry.slug+'.svg');
      cached += writeImmutable(p1,json(report))==='cached'?1:0;
      writeImmutable(p2,json(makeSecondPass(report,entry.slug)));
      writeImmutable(svg,renderPrivateDiagnosticSvg(report,entry.slug));
      statuses.push({slug:entry.slug,status:'REVIEW_REQUIRED',sourceSha256:entry.sha256,
        assertions:report.assertionCount,predicates:report.predicateCount,
        privateDiagnostic:'private-diagrams/'+entry.slug+'.svg'});
      audits++; assertionTotal+=report.assertionCount;
      for(const rel of rankCandidates(report))for(const group of rel.candidateGroups) {
        grouped.set(group,(grouped.get(group)||0)+1);
      }
    } catch(err) {statuses.push({slug:entry.slug,status:'REFUSED',reason:err.message});uncertainties++;}
  }
  const summary={format:'konstellation.k6-batch-summary/0.1',runId,
    status:uncertainties?'PARTIAL_REFUSED_INPUTS':entries.length < pins.entries.length ? 'PARTIAL_LIMITED_BATCH' : 'PASSED_NATIVE_PASSES_ADAPTERS_PENDING',
    notPolicyFiltered:true,notApproved:true,notPublishable:true,
    snapshot:pins.snapshot,pinManifestSha256:sha(pinBytes),
    processedEntries:entries.length,unprocessedEntries:pins.entries.length-entries.length,
    auditedNativeStates:audits,assertionsAudited:assertionTotal,
    missingAdapters:statuses.filter(x=>x.status==='NEEDS_ADAPTER').length,
    fullSemanticCoverage:false,
    refused:uncertainties,
    candidateGroups:Object.fromEntries(sorted(grouped.keys()).map(k=>[k,grouped.get(k)])),
    items:statuses,
    reviewWorkbench:'REVIEW_WORKBENCH.html',
    note:'Ce lot donne des graphiques DIAGNOSTIQUES de comptage non filtré, pas des diagrammes sémantiques autorisés. K4/K5 exigent des règles revues et des Reader Policies exactes.',
    resume:'Relancer les mêmes sources épinglées et le même manifest réutilise les fichiers identiques; toute divergence est refusée. Une nouvelle révision nécessite un nouveau manifeste de pins.'};
  // Immutable historical summaries plus a refreshable CURRENT SUMMARY. A resumed
  // batch can improve from missing input to complete without erasing its history.
  writeImmutable(path.join(runRoot,'REVIEW_WORKBENCH.html'),renderPrivateWorkbench(summary));
  const summaryBytes=json(summary);
  writeImmutable(path.join(runRoot,'summary-history',sha(Buffer.from(summaryBytes)).slice(7)+'.json'),summaryBytes);
  const current=path.join(runRoot,'SUMMARY.json');
  if (fs.existsSync(current) && (fs.lstatSync(current).isSymbolicLink() || !fs.lstatSync(current).isFile())) fail('SUMMARY_REDIRECT_REFUSED');
  const tmp=current+'.new-'+process.pid;
  try {fs.writeFileSync(tmp,summaryBytes,{flag:'wx',mode:0o600});fs.renameSync(tmp,current);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  return {runDir:runRoot,summary,cachedPass1:cached};
}
