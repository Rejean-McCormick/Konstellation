#!/usr/bin/env python3
"""K9–K12 private review queue from exactly pinned K8 result archive.

No publication, no changes to code-owned rule registries and no guessed approvals.
All output files are deterministic and immutable unless byte-identical.
"""
from __future__ import annotations
import argparse
from collections import Counter
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import re
import stat
import zipfile

FORMAT='konstellation.k9-final-private-review/1.0'
SOURCE_FORMAT='konstellation.k8-private-review-batch/1.0'
PREFIX='KONSTELLATION_K8_RESULTATS_PRIVES_126_KRISTALS_20261119/'
SLUG=re.compile(r'[a-z0-9][a-z0-9_-]{0,98}\Z')
LIMIT=3*1024*1024

def require(ok, why):
    if not ok: raise ValueError(why)

def digest(data:bytes): return 'sha256:'+sha256(data).hexdigest()

def read_member(z:zipfile.ZipFile,name:str):
    require(name in z.NameToInfo and z.namelist().count(name)==1,'MISSING_OR_DUPLICATE_MEMBER')
    require('\\' not in name and not name.startswith('/') and all(p not in ('','.','..') for p in name.split('/')),'UNSAFE_MEMBER')
    i=z.getinfo(name)
    require(i.file_size<=LIMIT and not stat.S_ISLNK(i.external_attr>>16),'UNSAFE_OR_OVERSIZED_MEMBER')
    data=z.read(i)
    require(len(data)==i.file_size,'TRUNCATED_MEMBER')
    return json.loads(data)

def stable_json(value):return (json.dumps(value,sort_keys=True,indent=2,ensure_ascii=False)+'\n').encode('utf8')

def priority(families,checks,kind):
    if kind=='adapter':return 'ADAPTER_REQUIRED'
    if 'ORDINAL_NOT_SCALAR' in families or 'KEEP_ORDINAL_AS_ORDER_NOT_DISTANCE_OR_SIZE' in checks:return 'NEGATIVE_SCALAR_GUARD'
    if 'REFERENT_GRAPH_CANDIDATE' in families:return 'REVIEW_GRAPH_RELATION'
    return 'REVIEW_DATA_SEMANTICS'

def compile_queue(z:zipfile.ZipFile, archive_sha:str):
    summary=read_member(z,PREFIX+'SUMMARY.json')
    require(summary.get('format')==SOURCE_FORMAT and summary.get('approvedRules')==0,'K8_NOT_UNAPPROVED')
    native=summary.get('native',[]); other=summary.get('heterogeneous',[])
    require(len(native)==84 and len(other)==42,'K8_EXPECTED_84_PLUS_42')
    require(summary.get('assertions')==40333,'K8_ASSERTION_COUNT_MISMATCH')
    slugs=[v.get('slug') for v in native+other]
    require(len(set(slugs))==126 and all(isinstance(v,str) and SLUG.fullmatch(v) for v in slugs),'BAD_SLUG_SET')
    cards=[]; relation_total=0; witness_total=0; queue=[]
    for slug in sorted(slugs):
        d=read_member(z,PREFIX+'revues/'+slug+'.json')
        require(d.get('slug')==slug and d.get('approvedRules')==[] and d.get('qualifiedDiagrams')==0,'REVIEW_NOT_UNAPPROVED:'+slug)
        kind='native' if d.get('format')=='konstellation.k8-private-native-review/1.0' else 'adapter'
        require((slug in [x['slug'] for x in native])==(kind=='native'),'K8_PROFILE_MISMATCH')
        entries=[]
        if kind=='native':
            require(isinstance(d.get('sourceSha256'),str) and re.fullmatch('sha256:[0-9a-f]{64}',d['sourceSha256']) and isinstance(d.get('relations'),list),'NATIVE_CARD_MALFORMED')
            relationIds=set()
            for r in d['relations']:
                rid=r.get('relationId'); samples=r.get('witnessSamples');checks=r.get('reviewChecks'); families=r.get('candidateFamilies')
                require(isinstance(rid,str) and 0<len(rid)<=240 and rid not in relationIds and isinstance(samples,list) and isinstance(checks,list) and isinstance(families,list),'INVALID_K8_RELATION')
                relationIds.add(rid); relation_total+=1
                sampleRefs=[]
                for item in samples:
                    require(item.get('relationId')==rid and isinstance(item.get('assertionRef'),str),'MISMATCHED_K8_WITNESS')
                    sampleRefs.append(item['assertionRef']);witness_total+=1
                require(len(set(sampleRefs))==len(sampleRefs),'DUPLICATE_WITNESS')
                e={'relationId':rid,'assertionCount':r['assertionCount'],'candidateFamilies':families,
                   'requiredChecks':checks,'sampleAssertionRefs':sampleRefs,
                   'priority':priority(families,checks,kind),'decision':'UNREVIEWED',
                   'requiredForActivation':['Exact reader datasetRef','Exact reader readerPolicyRef','Reader-visible assertion witnesses','Reviewed direction, scope, exceptions','Maintainer approval in code-owned registry']}
                entries.append(e)
                queue.append({'slug':slug,'relationId':rid,'priority':e['priority'], 'witnessCount':len(sampleRefs),'decision':'UNREVIEWED'})
            require(len(entries)>0,'NO_NATIVE_RELATIONS')
        else:
            entries=[{'priority':'ADAPTER_REQUIRED','decision':'UNREVIEWED',
                      'requirements':['Adapter vérifié pour le profil non natif','Reader Policy, empreintes et témoins visibles','Revue de la grammaire par relation avant rendu'] }]
            queue.append({'slug':slug,'priority':'ADAPTER_REQUIRED','decision':'UNREVIEWED'})
        cards.append({'format':FORMAT,'slug':slug,'sourceType':kind,
            'sourceSha256':d.get('sourceSha256'), 'status':'PRIVATE_ONLY_REVIEW_REQUIRED',
            'sourceArchiveSha256':archive_sha,'reviewEntries':entries,
            'qualifiedDiagrams':0,'approvedRules':[],
            'publicationAuthorized':False})
    return cards,queue,{'format':FORMAT,'status':'REVIEW_REQUIRED_NO_AUTO_APPROVAL',
      'snapshotProfiles':126,'native':84,'adaptersRequired':42,'assertionsInK8':40333,
      'relationsRequiringReview':relation_total,'sampleWitnesses':witness_total,
      'rulesApproved':0,'qualifiedDiagrams':0,'publicationAuthorized':False,
      'inputArchiveSha256':archive_sha,'priorities':dict(sorted(Counter(x['priority'] for x in queue).items()))}

def safe_output(out:Path,inputs:list[Path]):
    require(not out.is_symlink() and not (hasattr(out,'is_junction') and out.is_junction()),'OUT_REDIRECT')
    out=out.resolve()
    repository=Path(__file__).resolve().parents[2]
    require(not out.is_relative_to(repository),'OUTPUT_INSIDE_CODE_REPOSITORY')
    for i in inputs:
        p=i.resolve(strict=True)
        require(out!=p and not p.is_relative_to(out) and not out.is_relative_to(p),'OUTPUT_OVERLAPS_INPUT')
    return out

def safe_destination(dest:Path):
    # Explicitly reject symlinked existing parent folders; a pre-existing
    # 'dossiers' symlink must not redirect any private evidence outside `out`.
    for parent in [dest,*dest.parents]:
        if parent.is_symlink() or (hasattr(parent,'is_junction') and parent.is_junction()):
            raise ValueError('OUTPUT_REDIRECT:'+str(parent))

def emit(dest:Path,data:bytes):
    safe_destination(dest)
    require(not dest.is_symlink() and not (hasattr(dest,'is_junction') and dest.is_junction()),'OUTPUT_REDIRECT')
    if dest.exists():
        require(dest.is_file() and dest.read_bytes()==data,'OUTPUT_DIVERGED:'+str(dest))
        return False
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(data)
    return True

def workbench(summary,cards):
    lines=['<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Konstellation K9–K12 · Revue privée</title>',
      '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px system-ui,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;color:#223344}table{border-collapse:collapse;width:100%}th,td{padding:.5rem;border:1px solid #c7d2db;text-align:left}tr:nth-child(even){background:#f3f7fa}code{overflow-wrap:anywhere}summary{cursor:pointer}</style></head><body>',
      '<h1>Konstellation K9–K12 : atelier de revue privée</h1>',
      '<p>Observations de sources non filtrées. Aucune approbation ni publication. Les décisions exigent une revue dans le lecteur sous sa politique de lecture.</p>',
      '<p><strong>126 Kristals</strong> · 84 natifs · 42 adaptateurs · <strong>0 diagramme qualifié</strong>.</p>',
      '<table><thead><tr><th>Kristal</th><th>Profil</th><th>Relations</th><th>Action</th></tr></thead><tbody>']
    for c in cards:
      counts=Counter(e.get('priority','') for e in c['reviewEntries'])
      lines.append('<tr><th><code>'+escape(c['slug'])+'</code></th><td>'+escape(c['sourceType'])+'</td><td>'+str(len(c['reviewEntries']))+'</td><td>'+escape(', '.join(f'{key}: {n}' for key,n in sorted(counts.items())))+'</td></tr>')
    lines+=['</tbody></table><p>Source : résultats privés K8 épinglés SHA-256. Ouvrir les JSON dans dossiers/ pour les témoins et le détail. Éviter de copier ces informations vers une interface publique.</p></body></html>']
    return ('\n'.join(lines)+'\n').encode('utf8')

def run(archive:Path,out:Path,expected_sha:str):
    require(archive.is_file() and not archive.is_symlink() and not (hasattr(archive,'is_junction') and archive.is_junction()),'K8_ARCHIVE_NOT_REGULAR')
    raw=archive.read_bytes()
    require(digest(raw)==expected_sha,'K8_ZIP_SHA256_MISMATCH')
    out=safe_output(out,[archive])
    with zipfile.ZipFile(archive) as z:cards,queue,summary=compile_queue(z,expected_sha)
    docs=[(out/'SUMMARY.json',stable_json(summary)),(out/'QUEUE.json',stable_json(queue)),
          (out/'REVIEW_WORKBENCH.html',workbench(summary,cards)),
          (out/'NE_PAS_PUBLIER.txt',('K9–K12 : revue privée seulement. 0 règle approuvée. Ne pas transférer les observations brutes.\n').encode())]
    docs +=[(out/'dossiers'/f'{c["slug"]}.json',stable_json(c)) for c in cards]
    # Preflight every destination before ANY writing.
    for target,data in docs:
        safe_destination(target)
        require(not target.is_symlink() and not (hasattr(target,'is_junction') and target.is_junction()),'OUTPUT_REDIRECT')
        require(not target.exists() or target.is_file() and target.read_bytes()==data,'OUTPUT_DIVERGED:'+str(target))
    written=sum(emit(target,data) for target,data in docs)
    return {'status':'PRIVATE_QUEUE_COMPLETE','profiles':126,'items':len(queue),'written':written,
      'reused':len(docs)-written,'approved':0,'qualified':0,'out':str(out)}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--k8-results',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--sha256',required=True,help='sha256:<64 hex>, exact pinned K8 result ZIP')
    a=ap.parse_args()
    require(re.fullmatch('sha256:[0-9a-f]{64}',a.sha256) is not None,'BAD_SHA256_ARG')
    print(json.dumps(run(a.k8_results,a.out,a.sha256),ensure_ascii=False,indent=2))
if __name__=='__main__':
    try:main()
    except (ValueError,FileNotFoundError,zipfile.BadZipFile) as exc:
        print(json.dumps({'status':'REFUSED','reason':str(exc)},ensure_ascii=False,indent=2))
        raise SystemExit(2)
