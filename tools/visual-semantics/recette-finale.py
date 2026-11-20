#!/usr/bin/env python3
"""Campagne finale Konstellation — contre-audit privé des sources et préparation de recette.

Seuls les fichiers canoniques épinglés sont audités. NE qualifie aucune règle et
NE remplace JAMAIS une projection filtrée par Reader Policy. Aucune connexion réseau.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from datetime import datetime
from hashlib import sha256
from html import escape
import csv
import io
import json
from pathlib import Path
import re
import stat
import sys
import zipfile

FORMAT = 'konstellation.private-final-recipe/1.0'
SHA = re.compile(r'^sha256:[0-9a-f]{64}$')
SLUG = re.compile(r'^[a-z0-9][a-z0-9_-]{0,98}$')
MAX_NATIVE = 16 * 1024 * 1024
MAX_INDEX = 2 * 1024 * 1024
MAX_ARTIFACT = 256 * 1024 * 1024

def fail(message):
    raise ValueError(message)

def require(ok, code):
    if not ok: fail(code)

def hashed(data):
    return 'sha256:' + sha256(data).hexdigest()

def file_sha(path):
    digest = sha256()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(4*1024*1024), b''):
            digest.update(chunk)
    return 'sha256:' + digest.hexdigest()

def stable(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')

def zip_read(z, name, limit):
    require(name in z.NameToInfo and z.namelist().count(name) == 1, 'ZIP_ENTRY_MISSING_OR_DUPLICATE:'+name)
    require('\\' not in name and not name.startswith('/') and all(x not in ('','.','..') for x in name.split('/')), 'UNSAFE_ZIP_PATH')
    info=z.getinfo(name)
    mode=info.external_attr >> 16
    require(not info.is_dir() and not stat.S_ISLNK(mode) and info.file_size <= limit, 'ZIP_ENTRY_UNSAFE_OR_TOO_LARGE:'+name)
    with z.open(info) as f: data=f.read(limit+1)
    require(len(data) == info.file_size, 'ZIP_ENTRY_SIZE_MISMATCH:'+name)
    return data

def stream_sha(z, name, limit):
    require(name in z.NameToInfo and z.namelist().count(name) == 1, 'ARTIFACT_MISSING_OR_DUPLICATE:'+name)
    info=z.getinfo(name)
    require(not info.is_dir() and not stat.S_ISLNK(info.external_attr >> 16) and info.file_size <= limit,'ARTIFACT_UNSAFE_OR_TOO_LARGE:'+name)
    d=sha256(); total=0
    with z.open(info) as f:
        for c in iter(lambda:f.read(2*1024*1024),b''):
            total += len(c)
            require(total<=limit, 'ARTIFACT_LIMIT')
            d.update(c)
    require(total == info.file_size, 'ARTIFACT_TRUNCATED')
    return 'sha256:'+d.hexdigest(),total

def zip_json(z, name, limit):
    return json.loads(zip_read(z,name,limit))

def by_suffix(z, relative):
    names=[n for n in z.namelist() if n.endswith('/'+relative)]
    require(len(names)==1, 'RESULT_MEMBER_MISSING_OR_AMBIGUOUS:'+relative)
    return names[0]

def safe_existing_file(p):
    require(p.is_file() and not p.is_symlink(), 'EXPECTED_REGULAR_FILE:'+str(p))

def check_output(out, input_paths):
    require(not out.exists() or out.is_dir() and not out.is_symlink() and not (hasattr(out,'is_junction') and out.is_junction()), 'OUTPUT_NOT_DIRECTORY')
    resolved=out.resolve()
    repository=Path(__file__).resolve().parents[2]
    require(not resolved.is_relative_to(repository), 'OUTPUT_INSIDE_CODE_REPOSITORY')
    for src in input_paths:
        path=src.resolve()
        require(path != resolved and path not in resolved.parents and resolved not in path.parents,'OUTPUT_OVERLAPS_INPUT')
    for parent in [out,*out.parents]:
        require(not parent.is_symlink() and not (hasattr(parent,'is_junction') and parent.is_junction()), 'OUTPUT_SYMLINK_REFUSED')
    return out

def write_immutable(out, files):
    # Preflight ALL collisions before writing anything, including linked subdirs.
    for rel, payload in files.items():
        require(not rel.startswith('/') and '..' not in Path(rel).parts and '\\' not in rel, 'UNSAFE_OUTPUT_PATH')
        dst=out/rel
        for parent in [dst,*dst.parents]:
            require(not parent.is_symlink() and not (hasattr(parent,'is_junction') and parent.is_junction()),'OUTPUT_REDIRECTION_REFUSED')
        require(not dst.exists() or dst.is_file() and dst.read_bytes() == payload, 'OUTPUT_DIVERGED:'+rel)
    out.mkdir(parents=True,exist_ok=True)
    created=0
    for rel,payload in sorted(files.items()):
        dst=out/rel
        if dst.exists():continue
        dst.parent.mkdir(parents=True,exist_ok=True)
        with dst.open('xb') as h:h.write(payload)
        created += 1
    return created

def source_assertions(src_bytes, slug, expected):
    raw=json.loads(src_bytes)
    require(isinstance(raw,dict) and raw.get('schema_version') == '6.0' and isinstance(raw.get('assertions'),list), 'INVALID_NATIVE_V6:'+slug)
    statements={}; relation_counts=Counter(); scalar=0; ordinal=0
    for a in raw['assertions']:
        aid=a.get('assertion_id'); statement=a.get('statement')
        require(isinstance(aid,str) and aid and aid not in statements and isinstance(statement,dict) and isinstance(statement.get('predicate'),str),'BAD_OR_DUPLICATE_ASSERTION:'+slug)
        rid=statement['predicate']
        statements[aid]=a
        relation_counts[rid]+=1
        for valuation in a.get('valuations') or []:
            if isinstance(valuation,dict):
                if valuation.get('value_semantics')=='scalar' and valuation.get('value_state')=='known':scalar+=1
                if valuation.get('value_semantics')=='ordinal':ordinal+=1
    require(len(statements)==expected, 'NATIVE_ASSERTION_COUNT_MISMATCH:'+slug)
    return statements,relation_counts,scalar,ordinal

def validate_review_card(card,slug,assertions,relation_counts):
    require(card.get('slug')==slug and card.get('sourceType')=='native' and card.get('approvedRules')==[] and card.get('qualifiedDiagrams')==0 and card.get('publicationAuthorized') is False,'BAD_NATIVE_REVIEW_CARD:'+slug)
    entries=card.get('reviewEntries');require(isinstance(entries,list),'BAD_REVIEW_ENTRIES:'+slug)
    require(len(entries)==len(relation_counts),'RELATION_COVERAGE_MISMATCH:'+slug)
    seen=set(); witnessed=0; priorities=Counter()
    for e in entries:
        rid=e.get('relationId'); refs=e.get('sampleAssertionRefs'); count=e.get('assertionCount')
        require(isinstance(rid,str) and rid in relation_counts and rid not in seen,'BAD_OR_DUPLICATE_RELATION:'+slug)
        seen.add(rid)
        require(count==relation_counts[rid] and e.get('decision')=='UNREVIEWED' and isinstance(refs,list) and len(refs)==len(set(refs)) and 0<len(refs)<=24,'BAD_RELATION_COUNT_OR_WITNESSES:'+slug+':'+rid)
        for ref in refs:
            require(ref in assertions and assertions[ref]['statement']['predicate']==rid,'WITNESS_MISMATCH:'+slug+':'+str(ref))
            witnessed+=1
        priorities[e['priority']]+=1
    return witnessed,priorities

def hierarchy_probe(assertions, relation='zoology.lineage_child_of'):
    parents=defaultdict(set); directed=set(); self_edges=0; nonref=0
    for a in assertions.values():
        st=a['statement']
        if st['predicate']!=relation:continue
        s=st.get('subject');o=st.get('object')
        if not (isinstance(s,dict) and isinstance(o,dict) and s.get('kind')=='referent' and o.get('kind')=='referent' and isinstance(s.get('id'),str) and isinstance(o.get('id'),str)):
            nonref+=1;continue
        child=s['id'];parent=o['id']; directed.add((child,parent));parents[child].add(parent)
        if child==parent:self_edges+=1
    nodes=set()
    for a,b in directed: nodes.add(a);nodes.add(b)
    multi=sum(len(v)>1 for v in parents.values())
    edges=defaultdict(list)
    for child,parent in directed:edges[child].append(parent)
    visiting=set();seen=set();cycle=False
    def dfs(v):
        nonlocal cycle
        if v in visiting:cycle=True;return
        if v in seen:return
        visiting.add(v)
        for target in edges.get(v,[]):dfs(target)
        visiting.remove(v);seen.add(v)
    for node in nodes:dfs(node)
    roots=sorted(nodes-set(parents))
    return {'relationId':relation,'referentPairs':len(directed),'nodes':len(nodes),'roots':roots[:30],'rootCount':len(roots),'multipleParentSubjects':multi,'selfParentPairs':self_edges,'cycleDetected':cycle,'nonReferentAssertions':nonref,'classification':'STRUCTURAL_DIAGNOSTIC_ONLY_NOT_READER_POLICY_FILTERED_NOT_APPROVED'}

def zoology_svg(assertions, source_sha):
    """Diagnostic privé : structure brute seulement, jamais un rendu qualifié."""
    relation='zoology.lineage_child_of'
    children=defaultdict(list); witness={}; nodes=set(); parent={}
    for aid,a in assertions.items():
        st=a['statement']
        if st['predicate']!=relation:continue
        child=st['subject']['id']; p=st['object']['id']
        children[p].append(child); parent[child]=p; witness[(p,child)]=aid
        nodes.update([p,child])
    roots=sorted(nodes-set(parent))
    require(len(roots)==1 and all(len(set(items))==len(items) for items in children.values()),'ZOOLOGY_ROOT_OR_CHILD_CONFLICT')
    order=[];depth={}; entered=set()
    def visit(node,level):
        require(node not in entered,'ZOOLOGY_NOT_A_TREE')
        entered.add(node);order.append(node);depth[node]=level
        for ch in sorted(children.get(node,[])):visit(ch,level+1)
    visit(roots[0],0)
    require(len(entered)==len(nodes)==66 and len(witness)==65,'ZOOLOGY_TREE_SHAPE_CHANGED')
    maxlevel=max(depth.values());width=max(1300, 340+maxlevel*185+450);height=190+len(order)*33
    y={node:145+i*33 for i,node in enumerate(order)}
    esc=lambda x:escape(str(x),quote=True)
    lines=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
      '<title id="title">Zoologie : hypothèse de topologie de filiation, non qualifiée</title>',
      '<desc id="desc">65 liens enfant vers parent observés dans un snapshot canonique non filtré. Les niveaux affichés sont un agencement technique, pas une autorisation de signification.</desc>',
      f'<rect width="{width}" height="{height}" fill="#fafbfd"/>',
      '<text x="28" y="37" font-size="21" font-family="sans-serif" fill="#233249">Zoologie — brouillon topologique NON QUALIFIÉ</text>',
      '<text x="28" y="62" font-size="13" font-family="sans-serif" fill="#9b3d1c">Source brute non filtrée • aucun statut de publication • 0 règle approuvée</text>',
      f'<text x="28" y="82" font-size="12" font-family="monospace" fill="#475569">{esc(source_sha)}</text>',
      '<text x="28" y="105" font-size="12" font-family="sans-serif" fill="#475569">Trait vertical = lien brut ; indentation = parcours technique, sans métrique de distance</text>']
    for node in order:
        if node in parent:
            p=parent[node];xx=60+depth[node]*185;px=60+depth[p]*185
            lines.append(f'<path d="M {px+7} {y[p]+3} L {px+7} {y[node]} L {xx-6} {y[node]}" stroke="#9eacbd" stroke-width="1.4" fill="none"/>')
    for node in order:
        xx=60+depth[node]*185
        aid=witness.get((parent[node],node)) if node in parent else None
        lines.append(f'<circle cx="{xx}" cy="{y[node]}" r="5" fill="#526b89"/>')
        lines.append(f'<text x="{xx+13}" y="{y[node]+4}" font-size="12" fill="#203346" font-family="monospace">{esc(node)}</text>')
        if aid:lines.append(f'<title>{esc(node)} — témoin {esc(aid)}</title>')
    lines.append('</svg>')
    return ('\n'.join(lines)+'\n').encode('utf-8')

def make_workbench(summary,profile_rows,priority_rows):
    lines=['<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>Konstellation · Recette finale privée</title><style>body{font:15px system-ui,sans-serif;line-height:1.5;max-width:1150px;margin:2rem auto;padding:0 1rem;color:#172637;background:#fafbfd}h1{font-size:1.65rem}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #c9d5df;padding:.55rem;text-align:left}th{background:#e8eef4}tr:nth-child(even){background:#f3f6fa}code{overflow-wrap:anywhere}.warning{border-left:4px solid #b85b23;padding:1rem;background:#fff4ea}details{margin:.65rem 0}a{color:#16558e}</style></head><body>',
      '<h1>Recette finale — revue privée des 126 Kristals</h1>',
      '<div class="warning"><strong>Non qualifié / non publiable.</strong> Les témoins ci-dessous proviennent de sources canoniques non filtrées. Les empreintes et la cohérence ont été vérifiées; cela ne prouve pas une autorisation de lecture. Aucune règle n’a été approuvée.</div>',
      f'<p><strong>{summary["native"]} états v6</strong> · <strong>{summary["other"]} profils hétérogènes</strong> · {summary["assertionsVerified"]:,} assertions · {summary["relationsVerified"]:,} relations · {summary["witnessRefsVerified"]:,} témoins recoupés.</p>',
      '<h2>Portes de sortie</h2><table><thead><tr><th>Contrôle</th><th>État</th></tr></thead><tbody>']
    for key,value in summary['gates'].items():lines.append(f'<tr><td>{escape(key)}</td><td>{escape(value)}</td></tr>')
    lines += ['</tbody></table><h2>Revue prioritaire (propositions, non décisions)</h2><table><thead><tr><th>Kristal</th><th>Relation</th><th>Assertions</th><th>Témoins (extrait)</th></tr></thead><tbody>']
    for row in priority_rows[:30]:
        lines.append('<tr><td>'+escape(row['slug'])+'</td><td><code>'+escape(row['relationId'])+'</code></td><td>'+str(row['assertionCount'])+'</td><td><code>'+escape('; '.join(row['sampleAssertionRefs'][:2]))+'</code></td></tr>')
    lines += ['</tbody></table><h2>Couverture par Kristal</h2><table><thead><tr><th>Kristal</th><th>Type</th><th>Assertions</th><th>Relations</th><th>Artefacts manquants</th><th>Statut</th></tr></thead><tbody>']
    for r in profile_rows:
        lines.append(f'<tr><td><code>{escape(r["slug"])}</code></td><td>{escape(r["type"])}</td><td>{r["assertions"]}</td><td>{r["relations"]}</td><td>{r["missing"]}</td><td>{escape(r["status"])}</td></tr>')
    lines+=['</tbody></table><p>Fichiers annexes : <code>PROFILE_MATRIX.csv</code>, <code>REVIEW_SHORTLIST.json</code>, <code>PILOTS.json</code> et <code>GATES.json</code>.</p></body></html>']
    return ('\n'.join(lines)+'\n').encode('utf-8')

def csv_bytes(rows,fields):
    s=io.StringIO(newline='');w=csv.DictWriter(s,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows);return s.getvalue().encode('utf-8-sig')

def audit(source,k7,k9,pins_path,out,expected=None):
    inputs=[source,k7,k9,pins_path]
    for p in inputs:safe_existing_file(p)
    check_output(out,inputs)
    pins_bytes=pins_path.read_bytes();pins=json.loads(pins_bytes)
    require(pins.get('format')=='konstellation.k6-source-pins/0.1' and len(pins.get('entries',[]))==126,'BAD_PIN_FORMAT')
    expected=expected or {}
    require(file_sha(source)==pins['snapshot']['sha256'], 'SOURCE_ZIP_SHA256_MISMATCH')
    for key,p in [('k7',k7),('k9',k9)]:
        if key in expected:require(file_sha(p)==expected[key],key.upper()+'_ZIP_SHA256_MISMATCH')
    q=[];profile_rows=[];graph_candidates=[];sums=Counter();pilots={};zoo_assertions=None;blockers=[]
    with zipfile.ZipFile(source) as src,zipfile.ZipFile(k7) as z7,zipfile.ZipFile(k9) as z9:
        s9=zip_json(z9,by_suffix(z9,'SUMMARY.json'),2*1024*1024)
        require(s9.get('rulesApproved')==0 and s9.get('qualifiedDiagrams')==0 and s9.get('publicationAuthorized') is False and s9.get('snapshotProfiles')==126,'K9_SUMMARY_NOT_UNAPPROVED')
        s7=zip_json(z7,by_suffix(z7,'SUMMARY.json'),4*1024*1024)
        require(s7.get('profileIndexesAudited')==42 and s7.get('canonicalArtifactsDeclared')==394,'K7_EXPECTED_PROFILE_COUNTS')
        source_profiles={r['slug']:r for r in pins['entries']}
        require(len(source_profiles)==126,'DUPLICATE_SOURCE_SLUG')
        for slug in sorted(source_profiles):
            pin=source_profiles[slug];require(SLUG.fullmatch(slug) is not None,'BAD_SLUG')
            card=zip_json(z9,by_suffix(z9,'dossiers/'+slug+'.json'),5*1024*1024)
            if pin['profile']=='native-v6':
                src_bytes=zip_read(src,pin['path'],MAX_NATIVE)
                require(hashed(src_bytes)==pin['sha256'] and card.get('sourceSha256')==pin['sha256'],'NATIVE_SHA_MISMATCH:'+slug)
                raw=json.loads(src_bytes)
                statements,counts,scalar,ordinal=source_assertions(src_bytes,slug,len(raw['assertions']))
                witnessed,priorities=validate_review_card(card,slug,statements,counts)
                sums['native']+=1;sums['assertions']+=len(statements);sums['relations']+=len(counts);sums['witnesses']+=witnessed
                q.append({'slug':slug,'sourceSha256':pin['sha256'],'relations':len(counts),'assertions':len(statements),'witnessesVerified':witnessed,'knownScalarValuations':scalar,'ordinalValuations':ordinal,'priorities':dict(sorted(priorities.items())),'status':'RAW_ASSERTIONS_AND_SAMPLES_VERIFIED_NOT_POLICY_FILTERED'})
                profile_rows.append({'slug':slug,'type':'native-v6','assertions':len(statements),'relations':len(counts),'missing':0,'status':'REVIEW_REQUIRED'})
                for r in card['reviewEntries']:
                    if r['priority']=='REVIEW_GRAPH_RELATION':graph_candidates.append({'slug':slug,'relationId':r['relationId'],'assertionCount':r['assertionCount'],'sampleAssertionRefs':r['sampleAssertionRefs'],'sourceSha256':pin['sha256'],'decision':'PENDING_NOT_APPROVED'})
                if slug=='zoology':zoo_assertions=statements;pilots['zoology']={'sourceSha256':pin['sha256'],'sourceAssertionCount':len(statements),'hierarchyCandidate':hierarchy_probe(statements),'readerPolicyScope':'NOT_AVAILABLE','approved':False}
                if slug=='weather':pilots['weather']={'sourceSha256':pin['sha256'],'sourceAssertionCount':len(statements),'knownScalarValuationEntries':scalar,'ordinalValuationEntries':ordinal,'ruleForSizeOrDistance':'NOT_QUALIFIED','approved':False}
            else:
                index_name=f'kristals/{slug}/canon/state.index.json'
                index_bytes=zip_read(src,index_name,MAX_INDEX)
                k7card=zip_json(z7,by_suffix(z7,'pass1-profiles/'+slug+'.json'),6*1024*1024)
                require(k7card.get('slug')==slug and hashed(index_bytes)==k7card.get('indexSha256'),'INDEX_MISMATCH:'+slug)
                require(card.get('sourceType')=='adapter' and card.get('approvedRules')==[] and card.get('qualifiedDiagrams')==0,'BAD_ADAPTER_REVIEW_CARD:'+slug)
                index=json.loads(index_bytes)
                artifacts=index.get('canonical_artifacts')
                require(isinstance(artifacts,list) and len(artifacts)==k7card['canonicalArtifactCount']==len(k7card['canonicalArtifacts']),'ADAPTER_ARTIFACT_COUNT_MISMATCH:'+slug)
                info_by_path={a['path']:a for a in artifacts}
                require(len(info_by_path)==len(artifacts),'DUPLICATE_ARTIFACT_PATH:'+slug)
                missing=0;large=0
                for a in k7card['canonicalArtifacts']:
                    rel=a['relativePath']
                    require(rel in info_by_path and rel.startswith(('canon/','knowledge-base/corpus/','extensions/')) and '..' not in rel.split('/') and '\\' not in rel,'K7_ARTIFACT_INDEX_DISAGREEMENT:'+slug)
                    member=f'kristals/{slug}/{rel}'
                    if a['availability']=='MISSING_FROM_SNAPSHOT':
                        require(member not in src.NameToInfo,'K7_MISSING_ARTIFACT_APPEARED:'+member);missing+=1
                        blockers.append({'slug':slug,'artifact':rel,'kind':'DECLARED_CANONICAL_BYTES_MISSING','status':'NOT_RESOLVED'})
                    else:
                        digest,n=stream_sha(src,member,MAX_ARTIFACT)
                        require(digest==a['byteSha256'] and n==a['byteSize'],'K7_ARTIFACT_HASH_MISMATCH:'+member)
                    if a['profile']['surface']=='LARGE_JSON_NOT_PROFILED':
                        large+=1
                        blockers.append({'slug':slug,'artifact':rel,'kind':'LARGE_JSON_SPECIALIZED_ADAPTER_REQUIRED','bytes':a.get('byteSize'),'status':'NOT_RESOLVED'})
                require(missing==k7card['missingCanonicalArtifacts'] and large==k7card['largeUnprofiledArtifacts'],'K7_CARD_COUNTS_DIVERGED:'+slug)
                sums['other']+=1;sums['artifacts']+=len(artifacts);sums['missing']+=missing;sums['large']+=large
                q.append({'slug':slug,'indexSha256':k7card['indexSha256'],'artifactsDeclared':len(artifacts),'artifactsVerified':len(artifacts)-missing,'missingArtifacts':missing,'largeUnprofiled':large,'status':'INDEX_AND_AVAILABLE_BYTES_VERIFIED_ADAPTER_REQUIRED'})
                profile_rows.append({'slug':slug,'type':'non-native','assertions':0,'relations':0,'missing':missing,'status':'SOURCE_GAPS_AND_ADAPTER_REQUIRED' if missing else 'ADAPTER_REQUIRED'})
    require(sums['native']==84 and sums['other']==42 and sums['assertions']==40333 and sums['relations']==4166 and sums['artifacts']==394 and sums['missing']==7,'GLOBAL_COUNTERS_MISMATCH')
    require(sums['witnesses']==s9['sampleWitnesses'] and len(graph_candidates)==s9['priorities']['REVIEW_GRAPH_RELATION'],'WITNESS_OR_GRAPH_COUNT_MISMATCH')
    focus=sorted(graph_candidates,key=lambda r:(-r['assertionCount'],r['slug'],r['relationId']))
    zoo=next((r for r in focus if r['slug']=='zoology' and r['relationId']=='zoology.lineage_child_of'),None)
    require(zoo is not None,'ZOOLOGY_PILOT_ABSENT')
    focus=[zoo]+[r for r in focus if r != zoo]
    gates={
      'Intégrité du snapshot et des 84 états':'PASS',
      'Témoins des 4 166 relations confrontés aux sources':'PASS',
      'Index et artefacts présents des 42 profils':'PASS',
      'Sept artefacts déclarés absents':'BLOCKED_SOURCE_GAPS',
      'Sept JSON volumineux sans adaptateur spécialisé':'BLOCKED_ADAPTERS',
      'Approbations humaines des règles':'PENDING_0_APPROVED',
      'Projections réelles filtrées par Reader Policy':'NOT_PROVIDED',
      'Recette visuelle en navigateur sur lecteurs réels':'NOT_EXECUTED',
      'Qualification opérationnelle des diagrammes':'0_APPROVED',
      'Publication':'NOT_AUTHORIZED',
    }
    summary={
      'format':FORMAT,'status':'SOURCE_COUNTER_AUDIT_COMPLETE_OPERATIONAL_QUALIFICATION_PENDING',
      'sourceSha256':file_sha(source),'k7ResultsSha256':file_sha(k7),'k9ResultsSha256':file_sha(k9),
      'native':sums['native'],'other':sums['other'],'assertionsVerified':sums['assertions'],
      'relationsVerified':sums['relations'],'witnessRefsVerified':sums['witnesses'],
      'graphCandidates':len(graph_candidates),'canonicalArtifactsDeclared':sums['artifacts'],
      'canonicalArtifactsPresentAndHashed':sums['artifacts']-sums['missing'],
      'missingArtifacts':sums['missing'],'largeJsonUnprofiled':sums['large'],
      'approvedRules':0,'qualifiedDiagrams':0,'publicationAuthorized':False,'readerPolicyValidated':False,
      'gates':gates}
    template={'format':'konstellation.manual-recipe-proposal/1.0','candidateKey':'zoology|zoology.lineage_child_of',
      'decision':'PENDING','reviewer':None,'reviewedOn':None,'datasetRef':None,'readerPolicyRef':None,
      'readerVisibleAssertionRefs':[],'direction':None,'scope':None,'reviewJustification':None,'publicationAuthorized':False}
    gate_md='''# Critères de recette visuelle — à exécuter sur un lecteur privé réel\n\n- [ ] Ouvrir le Kristal via une Reader Policy autorisée et enregistrer `datasetRef` + `readerPolicyRef` exacts.\n- [ ] Comparer au moins trois témoins visibles et leurs sujets/objets avec les assertions sources sous la politique.\n- [ ] Vérifier le même scénario avec une politique restrictive : aucun témoin caché dans le graphique ni dans ses légendes.\n- [ ] Tester un changement de version/empreinte : la qualification doit être refusée.\n- [ ] Vérifier le sens des flèches, les cycles, les multi-parents et les racines (hiérarchies).\n- [ ] Vérifier les unités, l'échelle, les bornes et les états inconnus (tailles et distances).\n- [ ] Vérifier le contraste, le daltonisme, la navigation clavier, la lecture par synthèse vocale et les états vides.\n- [ ] Tester les dix vues adaptatives et les autres renderers selon leur compatibilité effective.\n- [ ] Enregistrer les captures d'écran et les anomalies sans les diffuser.\n- [ ] Reporter les signatures et décisions de la personne responsable dans le registre code-owned; ne pas inventer de revue.\n- [ ] Décider séparément de la publication (elle n'est pas autorisée ici).\n\n**Le rapport de contre-audit de sources ne peut pas cocher les cases concernant les lecteurs, les personnes et les navigateurs.**\n'''
    files={
      'SUMMARY.json':stable(summary),'PROFILE_MATRIX.csv':csv_bytes(profile_rows,['slug','type','assertions','relations','missing','status']),
      'SOURCE_VERIFICATION.json':stable(q),'REVIEW_SHORTLIST.json':stable(focus),'PILOTS.json':stable(pilots),
      'GATES.json':stable(gates),'DECISION_TEMPLATE.json':stable(template),
      'BLOCAGES_DETAIL.json':stable(sorted(blockers,key=lambda x:(x['slug'],x['artifact'],x['kind']))),
      'CHECKLIST_VISUEL.md':gate_md.encode('utf-8'), 'REVIEW_WORKBENCH.html':make_workbench(summary,profile_rows,focus),
      'PILOTE_ZOOLOGIE_NON_QUALIFIE.svg':zoology_svg(zoo_assertions,pilots['zoology']['sourceSha256']),
      'PRIVE_NE_PAS_PUBLIER.txt':'Résultats de sources non filtrées. Ne pas publier, transférer ni confondre avec une Reader Policy.\n'.encode('utf-8')
    }
    # Hash manifest of immutable private outputs.
    files['SHA256_CONTENU.txt']=('\n'.join(f'{hashed(data)}  {name}' for name,data in sorted(files.items()))+'\n').encode('utf-8')
    written=write_immutable(out,files)
    return {'status':summary['status'],'native':84,'other':42,'assertionsVerified':40333,'relationsVerified':4166,'witnessRefsVerified':sums['witnesses'],'artifactsPresentAndHashed':sums['artifacts']-sums['missing'],'missingArtifacts':sums['missing'],'qualifiedDiagrams':0,'filesWritten':written,'filesReused':len(files)-written,'out':str(out)}

def verify_decision(src):
    obj=json.loads(src.read_text(encoding='utf-8'))
    keys={'format','candidateKey','decision','reviewer','reviewedOn','datasetRef','readerPolicyRef','readerVisibleAssertionRefs','direction','scope','reviewJustification','publicationAuthorized'}
    require(isinstance(obj,dict) and set(obj)==keys and obj['format']=='konstellation.manual-recipe-proposal/1.0','BAD_DECISION_FORMAT')
    require(obj['publicationAuthorized'] is False,'PUBLICATION_MUST_REMAIN_FALSE')
    require(obj['decision'] in ('PENDING','REJECT_PROPOSAL','PROPOSE_FOR_RUNTIME_CHECK'),'UNAUTHORIZED_DECISION')
    if obj['decision']=='PROPOSE_FOR_RUNTIME_CHECK':
        require(all(isinstance(obj[k],str) and SHA.fullmatch(obj[k]) for k in ('datasetRef','readerPolicyRef')),'MISSING_PINNED_READER_CONTEXT')
        require(isinstance(obj['reviewer'],str) and len(obj['reviewer'].strip())>=3 and isinstance(obj['reviewedOn'],str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}',obj['reviewedOn']) and isinstance(obj['reviewJustification'],str) and len(obj['reviewJustification'].strip())>=60,'MISSING_ACTUAL_REVIEW')
        require(obj['direction'] in ('child-to-parent','parent-to-child','not-applicable') and isinstance(obj['scope'],str) and len(obj['scope'])>=3,'REVIEW_SCOPE_AND_DIRECTION_REQUIRED')
        require(isinstance(obj['readerVisibleAssertionRefs'],list) and len(obj['readerVisibleAssertionRefs'])>0 and all(isinstance(x,str) and x for x in obj['readerVisibleAssertionRefs']) and len(set(obj['readerVisibleAssertionRefs']))==len(obj['readerVisibleAssertionRefs']),'READER_WITNESSES_REQUIRED')
    return {'status':'PROPOSAL_ONLY_NEEDS_VERIFIED_READER_POLICY_AND_MAINTAINER' if obj['decision']=='PROPOSE_FOR_RUNTIME_CHECK' else 'NOT_APPROVED','publicationAuthorized':False,'qualifiedDiagrams':0}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--source',type=Path)
    ap.add_argument('--k7',type=Path)
    ap.add_argument('--k9',type=Path)
    ap.add_argument('--pins',type=Path)
    ap.add_argument('--out',type=Path)
    ap.add_argument('--expected-k7')
    ap.add_argument('--expected-k9')
    ap.add_argument('--verify-decision',type=Path)
    a=ap.parse_args()
    if a.verify_decision:
        safe_existing_file(a.verify_decision)
        print(json.dumps(verify_decision(a.verify_decision),indent=2,ensure_ascii=False));return
    require(all([a.source,a.k7,a.k9,a.pins,a.out]),'MISSING_AUDIT_INPUTS')
    expected={}
    for key in ('k7','k9'):
        value=getattr(a,'expected_'+key)
        if value:
            require(SHA.fullmatch(value),'BAD_EXPECTED_SHA')
            expected[key]=value
    print(json.dumps(audit(a.source,a.k7,a.k9,a.pins,a.out,expected),indent=2,ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,KeyError,TypeError,json.JSONDecodeError,zipfile.BadZipFile) as error:
        print(json.dumps({'status':'REFUSED','reason':str(error)},ensure_ascii=False,indent=2),file=sys.stderr)
        sys.exit(2)
