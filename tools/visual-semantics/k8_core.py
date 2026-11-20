"""K8 private evidence-first review batch (K7 -> K8).

This module DOES NOT run a Kristal reader, certify Reader Policy visibility,
approve semantic rules, or publish anything. It consumes exact byte-pinned
K6/K7 reports and source snapshots, and generates strictly PRIVATE dossiers
whose witness triples are copied from the matched native v6 source bytes.
The existing K5 hierarchy compiler remains the ONLY qualification gate.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime
import hashlib
import html
import json
import os
from pathlib import Path
import re
import stat
import zipfile

FORMAT = 'konstellation.k8-input-pins/1.0'
RESULT_FORMAT = 'konstellation.k8-private-review-batch/1.0'
SLUG = re.compile(r'[a-z0-9][a-z0-9_-]{0,98}\Z')
HEX_SHA = re.compile(r'sha256:[a-f0-9]{64}\Z')
MAX_SOURCE_BYTES = 12 * 1024 * 1024
MAX_REPORT_BYTES = 3 * 1024 * 1024
MAX_WITNESSES = 4
MAX_PREVIEW_RELATIONS = 7
ZIP_PREFIXES = {
    'k6': 'KONSTELLATION_K6_RESULTATS_PRIVÉS_84_KRISTALS_20261119/',
    'k7': 'KONSTELLATION_K7_RESULTATS_PRIVES_126_KRISTALS_20261119/',
}


def require(ok: bool, code: str):
    if not ok:
        raise ValueError(code)


def sha(data: bytes) -> str:
    return 'sha256:' + hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda: f.read(2*1024*1024), b''):
            h.update(b)
    return 'sha256:' + h.hexdigest()


def json_bytes(x) -> bytes:
    return (json.dumps(x, indent=2, ensure_ascii=False, sort_keys=True) + '\n').encode('utf-8')


def path_guard(path: Path, name: str) -> Path:
    require(path.is_file() and not path.is_symlink() and
            not (hasattr(path, 'is_junction') and path.is_junction()), name+'_NOT_REGULAR')
    return path.resolve(strict=True)


def read_zip(z: zipfile.ZipFile, name: str, limit: int) -> bytes:
    require(isinstance(name,str) and '\\' not in name and not name.startswith('/') and
            all(p not in ('', '.', '..') for p in name.split('/')), 'BAD_ZIP_MEMBER_PATH')
    require(z.namelist().count(name) == 1, 'MISSING_OR_DUPLICATE_ZIP_MEMBER:'+name)
    entry = z.getinfo(name)
    require(not stat.S_ISLNK(entry.external_attr >> 16), 'ZIPPED_SYMLINK_REFUSED')
    require(0 <= entry.file_size <= limit, 'ZIP_MEMBER_TOO_LARGE:'+name)
    data = z.read(entry)
    require(len(data) == entry.file_size, 'TRUNCATED_ZIP_MEMBER')
    return data


def read_json(z: zipfile.ZipFile, name: str, limit: int = MAX_REPORT_BYTES):
    return json.loads(read_zip(z, name, limit))


def validate_inputs(pins: dict, snapshot: Path, k6: Path, k7: Path,
                    native_pins: dict, profile_pins: dict):
    require(type(pins) is dict and set(pins) == {'format','status','inputs','nativePinsSha256','profilePinsSha256'}, 'BAD_K8_INPUT_PINS')
    require(pins['format'] == FORMAT and pins['status'] == 'PRIVATE_REVIEW_ONLY_NOT_APPROVED', 'BAD_K8_PIN_FORMAT')
    require(type(pins['inputs']) is dict and set(pins['inputs']) == {'snapshot','k6Results','k7Results'}, 'BAD_K8_INPUT_FILES')
    for key, path in [('snapshot',snapshot),('k6Results',k6),('k7Results',k7)]:
        rec = pins['inputs'][key]
        require(type(rec) is dict and set(rec) == {'name','sha256'} and rec['name'] == path.name and
                isinstance(rec['sha256'],str) and HEX_SHA.fullmatch(rec['sha256']), 'BAD_K8_INPUT_PIN:'+key)
        path_guard(path, key.upper())
        require(file_sha(path) == rec['sha256'], 'INPUT_SHA256_MISMATCH:'+key)
    require(isinstance(pins['nativePinsSha256'],str) and HEX_SHA.fullmatch(pins['nativePinsSha256']), 'BAD_NATIVE_PIN_REF')
    require(isinstance(pins['profilePinsSha256'],str) and HEX_SHA.fullmatch(pins['profilePinsSha256']), 'BAD_PROFILE_PIN_REF')
    require(native_pins.get('format') == 'konstellation.k6-source-pins/0.1', 'NOT_K6_SOURCE_PINS')
    require(profile_pins.get('format') == 'konstellation.k7-technical-index-pins/1.0', 'NOT_K7_INDEX_PINS')
    require(native_pins['snapshot']['sha256'] == pins['inputs']['snapshot']['sha256'] == profile_pins['snapshot']['sha256'], 'SNAPSHOT_PINS_DISAGREE')
    require(len(native_pins['entries']) == 126 and len(profile_pins['indexes']) == 42, 'UNEXPECTED_SOURCE_SET')
    require(len([x for x in native_pins['entries'] if x['profile'] == 'native-v6']) == 84, 'EXPECTED_84_NATIVE')
    return True


def check_archives(k6z: zipfile.ZipFile, k7z: zipfile.ZipFile,
                   snapshot_sha: str):
    p6, p7 = ZIP_PREFIXES['k6'], ZIP_PREFIXES['k7']
    six=read_json(k6z,p6+'SUMMARY.json')
    seven=read_json(k7z,p7+'SUMMARY.json')
    require(six.get('format') == 'konstellation.k6-batch-summary/0.1' and
            six.get('snapshot',{}).get('sha256') == snapshot_sha and
            six.get('auditedNativeStates') == 84 and six.get('assertionsAudited') == 40333 and
            six.get('refused') == 0 and six.get('notApproved') is True, 'K6_SUMMARY_NOT_TRUSTED')
    require(seven.get('format') == 'konstellation.k7-private-batch-summary/1.0' and
            seven.get('snapshot',{}).get('sha256') == snapshot_sha and
            seven.get('nativeSecondPassRefinements') == 84 and
            seven.get('profileIndexesAudited') == 42 and
            seven.get('totalFoldersRepresented') == 126 and
            seven.get('semanticDiagramsQualified') == 0 and seven.get('notApproved') is True, 'K7_SUMMARY_NOT_TRUSTED')
    return six,seven


def literal(value):
    if not isinstance(value,dict): return {'kind':'invalid'}
    kind=value.get('kind')
    if kind=='referent':
        id=value.get('id')
        require(isinstance(id,str) and 0<len(id)<300,'BAD_REFERENT_ID')
        return {'kind':kind,'value':id,'truncated':False}
    if kind in ('string','number','integer','boolean','interval'):
        raw=value.get('value')
        s=json.dumps(raw,ensure_ascii=False) if not isinstance(raw,str) else raw
        require(len(s)<=12000, 'LITERAL_OVER_BUDGET')
        return {'kind':kind,'value':s[:180], 'truncated':len(s)>180}
    return {'kind':'other','value':'non typé','truncated':False}


def sample_witness(assertion: dict):
    statement=assertion.get('statement',{})
    require(type(statement) is dict, 'BAD_STATEMENT')
    subject=literal(statement.get('subject'))
    target=literal(statement.get('object'))
    reference=assertion.get('assertion_id')
    relation=statement.get('predicate')
    require(isinstance(reference,str) and 0<len(reference)<=240 and
            isinstance(relation,str) and 0<len(relation)<=240, 'BAD_WITNESS')
    refs=assertion.get('evidence_refs',[])
    require(type(refs) is list,'BAD_EVIDENCE_REFS')
    return {'assertionRef':reference,'relationId':relation,
            'subject':subject,'object':target,
            'assertionStatus':assertion.get('assertion_status','unknown'),
            'evidenceRefs':[x for x in refs[:8] if isinstance(x,str) and len(x)<=240]}


def compile_native_card(slug: str, source_bytes: bytes, expected_sha: str,
                        k6_pass1: dict, k6_pass2: dict, k7_pass2: dict):
    require(sha(source_bytes)==expected_sha, 'K8_SOURCE_PIN_MISMATCH:'+slug)
    state=json.loads(source_bytes)
    require(state.get('schema_version') == '6.0' and type(state.get('assertions')) is list and
            len(state['assertions']) <= 100000,'NOT_NATIVE_V6')
    by_relation={}; ids=set();counts=Counter()
    for assertion in state['assertions']:
        require(type(assertion) is dict and type(assertion.get('statement')) is dict, 'INVALID_V6_ASSERTION')
        ar=assertion.get('assertion_id');pred=assertion['statement'].get('predicate')
        require(isinstance(ar,str) and ar not in ids and isinstance(pred,str), 'DUPLICATE_OR_BAD_ASSERTION')
        ids.add(ar); counts[pred]+=1
        if len(by_relation.setdefault(pred,[]))<MAX_WITNESSES:
            by_relation[pred].append(sample_witness(assertion))
    require(k6_pass1.get('status')=='OBSERVATION_ONLY_NOT_POLICY_FILTERED_NOT_APPROVED' and
            k6_pass1.get('source',{}).get('sha256')==expected_sha and
            k6_pass1.get('assertionCount')==len(ids), 'K6_PASS1_DISAGREES')
    require(k6_pass2.get('slug')==slug and k6_pass2.get('sourceSha256')==expected_sha and
            k6_pass2.get('status')=='PASS_2_REVIEW_REQUIRED_NOT_APPROVED', 'K6_PASS2_DISAGREES')
    require(k7_pass2.get('slug')==slug and k7_pass2.get('sourceSha256')==expected_sha and
            k7_pass2.get('status')=='PASS_2_REFINED_REVIEW_NOT_APPROVED' and
            k7_pass2.get('approvedRules')==[], 'K7_PASS2_DISAGREES')
    require({p['relationId']:p['assertionCount'] for p in k6_pass1['predicates']}==dict(counts), 'RELATION_COUNTS_TAMPERED')
    r7={r['relationId']:r for r in k7_pass2['recommendations']}
    require(set(r7)==set(counts),'K7_RELATION_SET_MISMATCH')
    relations=[]
    for r in sorted(k6_pass2['candidateRelations'],key=lambda x:(-x['assertionCount'],x['relationId'])):
        rid=r['relationId']
        require(rid in counts and counts[rid]==r['assertionCount'] and rid in r7,'K6_RELATION_DISAGREES')
        source_samples=by_relation[rid]
        require(set(r.get('sampleAssertionRefs',[]))<=ids, 'K6_SAMPLE_ASSERTION_MISSING')
        relations.append({'relationId':rid,'assertionCount':counts[rid],
                          'candidateFamilies':r['candidateGroups'],
                          'reviewChecks':r7[rid]['improvements'],
                          'witnessSamples':source_samples,
                          'qualification':'CANDIDATE_NOT_POLICY_FILTERED_NOT_REVIEWED'})
    require(len(relations)==len(counts), 'K6_CANDIDATE_SET_INCOMPLETE')
    return {'format':'konstellation.k8-private-native-review/1.0','slug':slug,
            'status':'AWAITING_OPERATOR_AND_READER_POLICY_REVIEW',
            'sourceSha256':expected_sha,'sourceAssertionCount':len(ids),
            'relations':relations,
            'reviewRequirements':['Vérifier les assertions visibles dans le vrai lecteur et ses ACL',
                                  'Comparer datasetRef et readerPolicyRef calculés par Konstellation',
                                  'Examiner la direction et le sens exacts de chaque relation',
                                  'Documenter scope, exceptions et témoins avant une règle K5/K4',
                                  'Ne jamais traiter ce dossier source brut comme autorisation'],
            'approvedRules':[],'qualifiedDiagrams':0}


def compile_heterogeneous_card(slug: str, pass1: dict, pass2: dict):
    require(pass1.get('slug')==slug and pass2.get('slug')==slug, 'K7_HETEROGENEOUS_SLUG_MISMATCH')
    require(isinstance(pass1.get('canonicalArtifacts'),list) and isinstance(pass2,dict), 'K7_HETEROGENEOUS_SHAPE')
    return {'format':'konstellation.k8-private-adapter-review/1.0','slug':slug,
            'status':'ADAPTER_AND_POLICY_REVIEW_REQUIRED',
            'declaredCanonicalArtifacts':pass1.get('canonicalArtifactCount',0),
            'missingCanonicalArtifacts':pass1.get('missingCanonicalArtifacts',0),
            'largeUnprofiledArtifacts':pass1.get('largeUnprofiledArtifacts',0),
            'recommendations':pass2.get('recommendations',[])[:30],
            'approvedRules':[],'qualifiedDiagrams':0}


def escape(value): return html.escape(str(value),quote=True)


def svg_comparison(card: dict, *, prefer_relation: str|None=None):
    require(card['format']=='konstellation.k8-private-native-review/1.0', 'BAD_COMPARISON_CARD')
    relations=card['relations']
    chosen=next((r for r in relations if r['relationId']==prefer_relation),None) if prefer_relation else None
    if chosen is None:
        chosen=next((r for r in relations if any(w['object']['kind']=='referent' for w in r['witnessSamples'])),None)
    if chosen is None:chosen=relations[0] if relations else None
    rows=chosen['witnessSamples'] if chosen else []
    h=245+max(1,len(rows))*95
    title=chosen['relationId'] if chosen else 'aucune relation'
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="{h}" viewBox="0 0 1240 {h}" role="img" aria-labelledby="t d">',
           f'<title id="t">K8 comparaison de témoins privés : {escape(card["slug"])}</title>',
           '<desc id="d">Gauche : triples d’assertion. Droite : lecture visuelle littérale des mêmes triples. Aucune qualification sémantique, aucune Reader Policy appliquée.</desc>',
           f'<rect width="1240" height="{h}" fill="#f6f8fc"/>',
           '<g font-family="sans-serif" fill="#132a40">',
           f'<text x="25" y="33" font-size="23">K8 · {escape(card["slug"])}</text>',
           '<text x="25" y="63" font-size="14" fill="#8b253a">OBSERVATION PRIVÉE NON FILTRÉE · CANDIDAT · NE PAS PUBLIER</text>',
           f'<text x="25" y="88" font-size="12">Relation observée : {escape(title[:95])}</text>',
           '<text x="25" y="119" font-size="17">AVANT · assertions littérales</text>',
           '<text x="632" y="119" font-size="17">APRÈS · flèches : sujet vers objet</text>',
           '<text x="632" y="143" font-size="12">Positions = mise en page, ni hiérarchie ni poids</text>',
           '<path d="M610 110V' + str(h-56) + '" stroke="#a8b8c9" stroke-dasharray="4 4"/>']
    for i,w in enumerate(rows):
        y=166+i*95
        subject=w['subject']['value'];obj=w['object']['value'];ref=w['assertionRef']
        # No automatic shortening of evidence identity in JSON: SVG is a preview only.
        parts.extend([
          f'<text x="25" y="{y}" font-size="12">{escape(str(subject)[:72])}</text>',
          f'<text x="25" y="{y+18}" font-size="12" fill="#4f6780">{escape(title[:70])} (sujet vers objet)</text>',
          f'<text x="25" y="{y+36}" font-size="12">{escape(str(obj)[:72])}</text>',
          f'<text x="25" y="{y+53}" font-size="10" fill="#6c526d">{escape(ref[:82])}</text>',
          f'<rect x="635" y="{y-17}" width="205" height="44" rx="5" fill="#e5ebf4"/>',
          f'<text x="644" y="{y+8}" font-size="11">{escape(str(subject)[:27])}</text>',
          f'<path d="M840 {y+5}H910" stroke="#3d5977" stroke-width="2"/>',
          f'<path d="M910 {y+5}l-8 -5v10z" fill="#3d5977"/>',
          f'<rect x="914" y="{y-17}" width="280" height="44" rx="5" fill="#dceaf3"/>',
          f'<text x="924" y="{y+8}" font-size="11">{escape(str(obj)[:36])}</text>',
          f'<text x="645" y="{y+49}" font-size="10">Témoin : {escape(ref[:75])}</text>'])
    parts.extend([f'<text x="25" y="{h-35}" font-size="12" fill="#8b253a">Une règle K4/K5 et une Reader Policy sont requises pour produire un vrai diagramme de connaissances.</text>',
                  '</g></svg>'])
    return ('\n'.join(parts)+'\n').encode('utf8')


def workbench(summary):
    cells=[]
    for row in summary['native']:
        slug=row['slug']
        cells.append(f'<tr><td>{escape(slug)}</td><td>{row["assertions"]}</td><td>{row["relations"]}</td>'
                     f'<td><a href="comparaisons/{escape(slug)}.svg">Avant / Après (privé)</a></td>'
                     f'<td><a href="revues/{escape(slug)}.json">Dossier de témoins</a></td></tr>')
    for row in summary['heterogeneous']:
        slug=row['slug']
        cells.append(f'<tr><td>{escape(slug)}</td><td>—</td><td>Adaptateur</td><td>—</td>'
                     f'<td><a href="revues/{escape(slug)}.json">Dossier de revue</a></td></tr>')
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>K8 — atelier de revue privé</title>'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
            '<style>body{font:15px system-ui,sans-serif;max-width:1200px;margin:auto;padding:1.5rem;color:#132a40;line-height:1.5}'
            'table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #dce2ed;padding:.5rem}'
            'th{position:sticky;top:0;background:#eef2f8}a{color:#14547e}strong{color:#962b39}</style>'
            '</head><body><h1>K8 — comparaisons et revue des témoins</h1>'
            '<p><strong>PRIVÉ · SOURCE NON FILTRÉE · AUCUNE RÈGLE QUALIFIÉE · NE PAS PUBLIER</strong></p>'
            f'<p>États v6 : {summary["nativeReviewed"]} · Autres profils : {summary["heterogeneousReviewed"]} · '
            f'Assertions d’inventaire : {summary["assertions"]} · Diagrammes approuvés : 0.</p>'
            '<p>Chaque flèche des SVG signifie seulement « sujet → objet » tel qu’écrit dans un témoin de source. '
            'Les positions, couleurs, espacements et tailles n’affirment aucune connaissance du domaine. '
            'Une interprétation (parenté, causalité, etc.) exige une revue K4/K5 et le lecteur filtré.</p>'
            '<table><thead><tr><th>Kristal</th><th>Assertions</th><th>Relations</th><th>Comparaison</th><th>Revue</th></tr></thead><tbody>'
            + '\n'.join(cells) + '</tbody></table></body></html>\n').encode('utf8')


def verify_output_root(output: Path, protected: list[Path]) -> Path:
    output=output.expanduser().absolute()
    for p in (output,*output.parents):
        if p.exists():require(not p.is_symlink() and not (hasattr(p,'is_junction') and p.is_junction()),'OUTPUT_REDIRECT_REFUSED')
    for p in protected:
        q=p.resolve()
        require(not output.is_relative_to(q) and not q.is_relative_to(output), 'OUTPUT_OVERLAPS_PROTECTED_SOURCE')
    output.mkdir(parents=True,exist_ok=True,mode=0o700)
    return output.resolve(strict=True)


def immutable_write(p: Path, data: bytes) -> bool:
    p.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    require(not p.parent.is_symlink() and p.parent.resolve()==p.parent.absolute(),'OUTPUT_PARENT_REDIRECT_REFUSED')
    require(not p.is_symlink(), 'OUTPUT_SYMLINK_REFUSED')
    try:
        with p.open('xb') as f:f.write(data)
        if os.name!='nt':p.chmod(0o600)
        return True
    except FileExistsError:
        require(p.is_file() and p.read_bytes()==data,'OUTPUT_COLLISION_OR_TAMPERING')
        return False


def run_batch(snapshot: Path, k6_results: Path, k7_results: Path,
              input_pins_file: Path, k6_pins_file: Path, k7_pins_file: Path,
              output: Path, repo_root: Path) -> dict:
    pins=json.loads(input_pins_file.read_bytes())
    native_pins=json.loads(k6_pins_file.read_bytes())
    profile_pins=json.loads(k7_pins_file.read_bytes())
    require(sha(k6_pins_file.read_bytes())==pins['nativePinsSha256'], 'K6_PIN_BYTES_MISMATCH')
    require(sha(k7_pins_file.read_bytes())==pins['profilePinsSha256'], 'K7_PIN_BYTES_MISMATCH')
    validate_inputs(pins,snapshot,k6_results,k7_results,native_pins,profile_pins)
    root=verify_output_root(output,[repo_root,snapshot,k6_results,k7_results])
    runid=sha(json_bytes(pins))[7:27]
    dest=root/'runs'/runid
    dest.mkdir(parents=True,exist_ok=True,mode=0o700)
    summary_native=[];summary_hetero=[];assertion_total=0;reused=0; output_files={}
    def emit(rel: str,data: bytes):
        nonlocal reused
        target=dest/rel
        if not immutable_write(target,data):reused+=1
        output_files[rel]=sha(data)
    with zipfile.ZipFile(snapshot) as source, zipfile.ZipFile(k6_results) as six, zipfile.ZipFile(k7_results) as seven:
        a,b=check_archives(six,seven,pins['inputs']['snapshot']['sha256'])
        p6,p7=ZIP_PREFIXES['k6'],ZIP_PREFIXES['k7']
        # The supplied snapshot contains a duplicate unrelated SMARTDUMP_INDEX.txt.
        # Only pinned native paths must be unique; read_zip enforces that per member.
        native_list=sorted((p for p in native_pins['entries'] if p['profile']=='native-v6'),key=lambda x:x['slug'])
        for entry in native_list:
            slug=entry['slug']
            require(SLUG.fullmatch(slug) is not None and entry['path'].startswith('kristals/'+slug+'/'), 'UNSAFE_K8_NATIVE_SOURCE_PATH')
            raw=read_zip(source,entry['path'],MAX_SOURCE_BYTES)
            card=compile_native_card(slug,raw,entry['sha256'],
                                     read_json(six,p6+'pass1/'+slug+'.json'),
                                     read_json(six,p6+'pass2/'+slug+'.json'),
                                     read_json(seven,p7+'pass2-native/'+slug+'.json'))
            emit('revues/'+slug+'.json',json_bytes(card))
            emit('comparaisons/'+slug+'.svg',svg_comparison(card,prefer_relation='zoology.lineage_child_of' if slug=='zoology' else None))
            summary_native.append({'slug':slug,'assertions':card['sourceAssertionCount'],'relations':len(card['relations']),
                                   'status':card['status'],'qualified':0})
            assertion_total+=card['sourceAssertionCount']
        heterogeneous_set={p['slug'] for p in native_pins['entries'] if p['profile']=='requires-adapter'}
        require(heterogeneous_set=={p['slug'] for p in profile_pins['indexes']},'HETEROGENEOUS_PIN_SET_MISMATCH')
        for slug in sorted(heterogeneous_set):
            require(SLUG.fullmatch(slug) is not None,'BAD_HETEROGENEOUS_SLUG')
            card=compile_heterogeneous_card(slug,
                read_json(seven,p7+'pass1-profiles/'+slug+'.json'),
                read_json(seven,p7+'pass2-profiles/'+slug+'.json'))
            emit('revues/'+slug+'.json',json_bytes(card))
            summary_hetero.append({'slug':slug,'status':card['status'],
                                   'missing':card['missingCanonicalArtifacts'],'qualified':0})
    require(len(summary_native)==84 and len(summary_hetero)==42 and assertion_total==40333,'BATCH_COVERAGE_INCOMPLETE')
    result={'format':RESULT_FORMAT,'status':'PRIVATE_EVIDENCE_COMPARISONS_AWAITING_REVIEW',
            'snapshotSha256':pins['inputs']['snapshot']['sha256'],
            'k6ResultsSha256':pins['inputs']['k6Results']['sha256'],
            'k7ResultsSha256':pins['inputs']['k7Results']['sha256'],
            'nativeReviewed':84,'heterogeneousReviewed':42,
            'assertions':assertion_total,'privateLiteralComparisons':84,
            'privateReviewDossiers':126,
            'approvedRules':0,'semanticallyQualifiedDiagrams':0,
            'notPolicyFiltered':True,'notApproved':True,'notPublishable':True,
            'native':summary_native,'heterogeneous':summary_hetero,
            'limits':['Graphes seulement de triples littéraux non filtrés',
                      'Règles K5/K4 activables exclusivement par revue et Reader Policy du lecteur réel',
                      'Comparaison après n établit ni hiérarchie, ni causalité, ni distance réelle']}
    emit('SUMMARY.json',json_bytes(result))
    emit('REVIEW_WORKBENCH.html',workbench(result))
    content=''.join(f'{digest[7:]}  {rel}\n' for rel,digest in sorted(output_files.items()))
    immutable_write(dest/'SHA256_CONTENU.txt',content.encode('ascii'))
    return {'status':'PRIVATE_REVIEW_BATCH_COMPLETED','runDir':str(dest),
            'native':84,'heterogeneous':42,'assertions':40333,
            'literalComparisons':84,'reviewDossiers':126,'semanticallyQualifiedDiagrams':0,
            'reusedIdenticalFiles':reused}
