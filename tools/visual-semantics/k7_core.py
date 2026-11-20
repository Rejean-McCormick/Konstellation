"""K7 PRIVATE heterogeneous technical inventory and review refinement.

Only the SHA-pinned ZIP and explicit canonical index are read. No semantic
normalization, no unfiltered facts exposed as approved interpretations.
No mutations to the source repository, published sites or canonical Kristals.
"""
from __future__ import annotations

import hashlib
import html
import json
import os
from pathlib import Path
import re
import stat
import zipfile
from collections import Counter

FORMAT = 'konstellation.k7-technical-index-pins/1.0'
VERSION = 'k7-two-pass/1.0'
SHA = re.compile(r'sha256:[a-f0-9]{64}\Z')
SLUG = re.compile(r'[a-z0-9][a-z0-9_-]{0,98}\Z')
MAX_INDEX_BYTES = 512 * 1024
MAX_ARTIFACT_BYTES = 30 * 1024 * 1024
MAX_JSON_PROFILE_BYTES = 4 * 1024 * 1024
MAX_ARTIFACTS_PER_INDEX = 256
MAX_OUTPUT_ROWS = 300


def sha256(data: bytes) -> str:
    return 'sha256:' + hashlib.sha256(data).hexdigest()


def digest_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as file:
        for part in iter(lambda: file.read(4 * 1024 * 1024), b''):
            h.update(part)
    return 'sha256:' + h.hexdigest()


def require(test: bool, code: str):
    if not test:
        raise ValueError(code)


def canonical_json(obj: object) -> bytes:
    return (json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True) + '\n').encode('utf-8')


def safe_member(path: str, slug: str) -> bool:
    if not isinstance(path, str) or not path or len(path) > 512 or '\\' in path or ':' in path:
        return False
    if not all(re.fullmatch(r'[A-Za-z0-9_.-]+', x) for x in path.split('/')):
        return False
    if any(x in ('.', '..') for x in path.split('/')) or path.startswith('/'):
        return False
    return path.startswith(('canon/', 'knowledge-base/corpus/', 'extensions/')) and not path.endswith('/') and path.endswith('.json')


def validate_pins(pins: object, k6_pins: object):
    require(type(pins) is dict and set(pins) == {'format', 'status', 'snapshot', 'k6PinsSha256', 'indexes'}, 'BAD_K7_PINS')
    require(pins['format'] == FORMAT and pins['status'] == 'PRIVATE_TECHNICAL_INVENTORY_NOT_QUALIFIED', 'BAD_K7_FORMAT')
    require(type(pins['snapshot']) is dict and set(pins['snapshot']) == {'name', 'sha256'}, 'BAD_SNAPSHOT_METADATA')
    require(pins['snapshot']['name'] == 'kristal-public_Code_snapshot.zip', 'SNAPSHOT_NAME_MISMATCH')
    require(isinstance(pins['snapshot']['sha256'], str) and SHA.fullmatch(pins['snapshot']['sha256']), 'BAD_SNAPSHOT_SHA')
    require(isinstance(pins['k6PinsSha256'], str) and SHA.fullmatch(pins['k6PinsSha256']), 'BAD_K6_PIN_HASH')
    require(type(k6_pins) is dict and k6_pins.get('format') == 'konstellation.k6-source-pins/0.1', 'BAD_K6_PINS')
    require(k6_pins.get('snapshot', {}).get('sha256') == pins['snapshot']['sha256'], 'K6_K7_SNAPSHOT_DISAGREEMENT')
    require(type(pins['indexes']) is list and len(pins['indexes']) == 42, 'EXPECTED_42_INDEX_PINS')
    expected = {e['slug'] for e in k6_pins['entries'] if e['profile'] == 'requires-adapter'}
    actual = set()
    for row in pins['indexes']:
        require(type(row) is dict and set(row) == {'slug', 'indexSha256'}, 'BAD_INDEX_PIN_ROW')
        slug = row['slug']
        require(isinstance(slug,str) and SLUG.fullmatch(slug) and slug not in actual and
                isinstance(row['indexSha256'],str) and SHA.fullmatch(row['indexSha256']), 'BAD_INDEX_PIN')
        actual.add(slug)
    require(actual == expected and len(expected) == 42, 'K6_K7_PROFILE_SET_DIFFERS')
    return True


def read_member(z: zipfile.ZipFile, filename: str, max_bytes: int) -> bytes | None:
    try:
        info = z.getinfo(filename)
    except KeyError:
        return None
    mode = (info.external_attr >> 16) & 0o170000
    require(not info.is_dir() and mode != stat.S_IFLNK, 'ZIP_LINK_OR_DIRECTORY_REFUSED')
    require(0 <= info.file_size <= max_bytes, 'SOURCE_MEMBER_SIZE_REFUSED')
    # zipfile verifies CRC32 while reading; archive SHA256 separately authenticates the complete ZIP.
    data = z.read(info)
    require(len(data) == info.file_size, 'MEMBER_LENGTH_MISMATCH')
    return data


def validate_index(index: object, slug: str):
    require(type(index) is dict and index.get('format') == 'kristal.authoring-state-index/2.0.0', 'UNKNOWN_STATE_INDEX_FORMAT')
    artifacts = index.get('canonical_artifacts')
    require(type(artifacts) is list and 1 <= len(artifacts) <= MAX_ARTIFACTS_PER_INDEX, 'BAD_CANONICAL_ARTIFACTS')
    seen_id = set()
    seen_path = set()
    for a in artifacts:
        require(type(a) is dict, 'BAD_CANONICAL_ENTRY')
        aid = a.get('artifact_id'); rel = a.get('path'); contract = a.get('logical_contract')
        require(isinstance(aid,str) and 1 <= len(aid) <= 250 and aid not in seen_id, 'DUPLICATE_OR_BAD_ARTIFACT_ID')
        require(safe_member(rel,slug) and rel not in seen_path, 'DUPLICATE_OR_UNSAFE_ARTIFACT_PATH')
        require(type(contract) is dict and isinstance(contract.get('id'),str) and 0 < len(contract['id']) <= 180,
                'BAD_LOGICAL_CONTRACT')
        commitment = a.get('commitment')
        require(type(commitment) is dict and commitment.get('mode') in ('precomputed','compute-json-jcs'), 'UNEXPECTED_COMMITMENT_MODE')
        seen_id.add(aid); seen_path.add(rel)
    return artifacts


def profile_artifact(data: bytes, contract: str, path: str) -> dict:
    if len(data) > MAX_JSON_PROFILE_BYTES:
        return {'surface':'LARGE_JSON_NOT_PROFILED','topLevelArrays':{},'topLevelKeys':[]}
    try:
        content=json.loads(data)
    except (ValueError,UnicodeDecodeError):
        return {'surface':'UNPARSEABLE_JSON_NEEDS_REVIEW','topLevelArrays':{},'topLevelKeys':[]}
    if isinstance(content, list):
        return {'surface':'TOP_LEVEL_ARRAY','topLevelArrays':{'$root':len(content)},'topLevelKeys':[]}
    if not isinstance(content, dict):
        return {'surface':'NON_OBJECT_JSON','topLevelArrays':{},'topLevelKeys':[]}
    keys=sorted(k for k in content if isinstance(k,str))
    arrays={k:len(content[k]) for k in keys if type(content[k]) is list}
    if {'artifact_type','logical_contract','payload'} <= set(keys): kind='LOGICAL_ARTIFACT_WRAPPER'
    elif {'portable_contract','content_hash','assertion_count'} <= set(keys): kind='STATE_REFERENCE_ONLY'
    elif {'model','component'} <= set(keys): kind='COMPONENT_MODEL'
    elif {'assertions','entities'} <= set(keys): kind='GRAPH_STRUCTURAL_SURFACE'
    elif 'semantic_model' in keys: kind='DOMAIN_STRUCTURAL_SURFACE'
    else: kind='HETEROGENEOUS_CANONICAL_JSON'
    return {'surface':kind, 'topLevelArrays':arrays, 'topLevelKeys':keys[:32]}


def classify_issue(row: dict) -> list[str]:
    issues=[]
    if row['availability']=='MISSING_FROM_SNAPSHOT':
        issues.append('RESOLVE_ABSENT_DECLARED_CANONICAL_BYTES')
    elif row['profile']['surface']=='LARGE_JSON_NOT_PROFILED':
        issues.append('ADD_BOUNDED_STREAMING_ADAPTER')
    elif row['profile']['surface']=='UNPARSEABLE_JSON_NEEDS_REVIEW':
        issues.append('REVIEW_INVALID_JSON_SHAPE')
    elif row['profile']['surface']=='STATE_REFERENCE_ONLY':
        issues.append('RESOLVE_EXTERNAL_OR_PORTABLE_STATE_WITH_INTEGRITY')
    elif row['profile']['surface']=='GRAPH_STRUCTURAL_SURFACE':
        issues.append('CHECK_GRAPH_SCHEMA_AND_READER_POLICY')
    elif row['profile']['surface']=='LOGICAL_ARTIFACT_WRAPPER':
        issues.append('VALIDATE_LOGICAL_CONTRACT_AND_COMMITMENT')
    else:
        issues.append('DESIGN_EXPLICIT_FORMAT_ADAPTER')
    if row['commitmentMode']=='precomputed':
        issues.append('CHECK_LOGICAL_COMMITMENT_WITH_AUTHORING_KIT')
    # JSON source SHA256 is a BYTE hash, never equivalent to logical JCS digest.
    issues.append('REQUIRE_AUTHORIZED_READER_PROJECTION_BEFORE_SEMANTIC_DIAGRAM')
    return issues


def audit_index(z: zipfile.ZipFile, pin: dict) -> dict:
    slug=pin['slug']
    index_name=f'kristals/{slug}/canon/state.index.json'
    index_bytes=read_member(z,index_name,MAX_INDEX_BYTES)
    require(index_bytes is not None and sha256(index_bytes)==pin['indexSha256'], 'INDEX_BYTE_SHA_MISMATCH:'+slug)
    artifacts=validate_index(json.loads(index_bytes),slug)
    rows=[]
    for a in artifacts:
        rel=a['path']; full=f'kristals/{slug}/{rel}'
        data=read_member(z,full,MAX_ARTIFACT_BYTES)
        available=data is not None
        contract=a['logical_contract']['id']
        row={'artifactId':a['artifact_id'],'relativePath':rel,
             'logicalContract':contract,'contractVersion':str(a['logical_contract'].get('version','UNDECLARED')),
             'commitmentMode':a['commitment']['mode'],
             'availability':'AVAILABLE_PINNED_SNAPSHOT' if available else 'MISSING_FROM_SNAPSHOT',
             'byteSha256':sha256(data) if available else None,
             'byteSize':len(data) if available else None,
             'profile':profile_artifact(data,contract,rel) if available else {'surface':'NOT_AVAILABLE','topLevelKeys':[],'topLevelArrays':{}}}
        row['reviewTasks']=classify_issue(row)
        rows.append(row)
    missing=sum(r['availability']=='MISSING_FROM_SNAPSHOT' for r in rows)
    large=sum(r['profile']['surface']=='LARGE_JSON_NOT_PROFILED' for r in rows)
    return {'format':'konstellation.k7-private-technical-audit/1.0','slug':slug,
      'status':'SOURCE_GAPS_REVIEW_REQUIRED' if missing else 'TECHNICALLY_INVENTORIED_NOT_QUALIFIED',
      'indexSha256':pin['indexSha256'],'canonicalArtifactCount':len(rows),
      'artifactBytesAvailable':len(rows)-missing,'missingCanonicalArtifacts':missing,
      'largeUnprofiledArtifacts':large,'notPolicyFiltered':True,'notApproved':True,
      'canonicalArtifacts':rows}


def review_profile(audit: dict) -> dict:
    issues=Counter(task for row in audit['canonicalArtifacts'] for task in row['reviewTasks'])
    return {'format':'konstellation.k7-review-queue/1.0','slug':audit['slug'],
      'status':'PASS_2_REVIEW_REQUIRED_NOT_APPROVED',
      'sourceIndexSha256':audit['indexSha256'],
      'priority':'BLOCKED_SOURCE_GAPS' if audit['missingCanonicalArtifacts'] else 'TECHNICAL_ADAPTER_REVIEW',
      'reviewTaskCounts':dict(sorted(issues.items())),
      'reviewSequence':['Verify exact canonical index and missing bytes',
           'Validate source schema and logical commitment with authoritative tooling',
           'Obtain an exact datasetRef and Reader Policy filtered projection',
           'Review semantic direction, units, witnesses and scopes',
           'Only then choose K4/K5 meaningful visual channels'],
      'approvedRules':[], 'publishable':False}


def review_native_k6(k6_pass2: dict) -> dict:
    require(type(k6_pass2) is dict and k6_pass2.get('format')=='konstellation.k6-review-queue/0.1' and
            k6_pass2.get('status')=='PASS_2_REVIEW_REQUIRED_NOT_APPROVED', 'K6_REVIEW_UNTRUSTED')
    slug=k6_pass2.get('slug')
    require(isinstance(slug,str) and SLUG.fullmatch(slug),'K6_SLUG_INVALID')
    candidates=k6_pass2.get('candidateRelations')
    require(type(candidates) is list and len(candidates)<=512,'K6_RELATIONS_INVALID')
    permitted={'REFERENT_GRAPH_CANDIDATE','SCALAR_ENCODING_CANDIDATE','ORDINAL_NOT_SCALAR','INTERVAL_LAYOUT_CANDIDATE','GENERIC_RELATION_CANDIDATE'}
    rows=[]
    aggregate=Counter()
    for row in candidates:
        require(type(row) is dict and isinstance(row.get('relationId'),str) and len(row['relationId'])<=240 and
                type(row.get('assertionCount')) is int and row['assertionCount']>=0 and
                type(row.get('candidateGroups')) is list and set(row['candidateGroups'])<=permitted, 'K6_CANDIDATE_INVALID')
        groups=row['candidateGroups']
        measures=[]
        if 'REFERENT_GRAPH_CANDIDATE' in groups: measures.append('CHECK_GRAPH_DIRECTION_CYCLES_AND_SCOPES')
        if 'SCALAR_ENCODING_CANDIDATE' in groups: measures.append('CHECK_NUMERIC_UNIT_SCALE_AND_CONFLICTS')
        if 'ORDINAL_NOT_SCALAR' in groups: measures.append('KEEP_ORDINAL_AS_ORDER_NOT_DISTANCE_OR_SIZE')
        if 'INTERVAL_LAYOUT_CANDIDATE' in groups: measures.append('CHECK_TIME_INTERVALS_AND_UNCERTAINTY')
        if 'GENERIC_RELATION_CANDIDATE' in groups: measures.append('USE_NEUTRAL_RELATION_COUNTS_PENDING_REVIEW')
        for m in measures: aggregate[m]+=1
        rows.append({'relationId':row['relationId'],'assertionCount':row['assertionCount'],
          'shapeCandidates':groups,'improvements':measures,
          'priority':'HIGH_REVIEW_VOLUME' if row['assertionCount']>=100 else 'STANDARD_REVIEW',
          'qualified':False})
    rows.sort(key=lambda x:(-x['assertionCount'],x['relationId']))
    return {'format':'konstellation.k7-native-improvement-queue/1.0','slug':slug,
      'status':'PASS_2_REFINED_REVIEW_NOT_APPROVED','sourceSha256':k6_pass2['sourceSha256'],
      'relationCount':len(rows),'improvementCounts':dict(sorted(aggregate.items())),
      'recommendations':rows,'approvedRules':[],
      'note':'Reclassement de profils de données non filtrés : pas de hiérarchie ni causalité déduite.'}


def svg_bars(slug: str, title: str, values: list[tuple[str,int]], warning: str) -> str:
    # Only technical counts, never domain values or semantic placements.
    require(SLUG.fullmatch(slug) is not None,'UNSAFE_SVG_SLUG')
    values=sorted(values,key=lambda v:(-v[1],v[0]))[:20]
    h=185+len(values)*30
    mx=max([1]+[n for _,n in values]);rows=[]
    for i,(label,n) in enumerate(values):
        require(type(n) is int and 0<=n<=10**8,'BAD_BAR_COUNT')
        y=120+i*30; w=round(n/mx*420)
        rows.append(f'<text x="24" y="{y+17}" font-size="12">{html.escape(str(label)[:48])}</text>'
                    f'<rect x="430" y="{y+3}" width="{w}" height="18" fill="#345873"/>'
                    f'<text x="{min(900,448+w)}" y="{y+17}" font-size="12">{n}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="940" height="{h}" viewBox="0 0 940 {h}" role="img" aria-labelledby="t d">\n'
         f'<title id="t">{html.escape(title)} : {slug}</title>\n'
         f'<desc id="d">Comptages d’inventaire technique seulement. Source non filtrée, interprétation non autorisée.</desc>\n'
         f'<rect width="940" height="{h}" fill="#f7f9fc"/>\n'
         f'<g font-family="sans-serif" fill="#16263d"><text x="24" y="37" font-size="21">{html.escape(title)} · {slug}</text>\n'
         f'<text x="24" y="64" font-size="13" fill="#8b253a">{html.escape(warning)}</text>\n'
         f'<text x="24" y="93" font-size="12">Longueurs = nombres d’éléments, pas importance ni vérité.</text>\n'
         + '\n'.join(rows) + f'<text x="24" y="{h-32}" font-size="12" fill="#8b253a">PRIVÉ · NON FILTRÉ · NON APPROUVÉ · NE PAS PUBLIER</text></g></svg>\n')


def private_workbench(summary: dict) -> str:
    def row(item,folder,kind):
        slug=item['slug']
        status=item['status']
        return (f'<tr><td>{html.escape(slug)}</td><td>{html.escape(kind)}</td><td>{html.escape(status)}</td>'
          f'<td><a href="{folder}/{slug}.json">Audit</a></td>'
          f'<td><a href="private-diagrams/{slug}.svg">Graphique de comptages</a></td></tr>')
    parts=[row(x,'pass1-profiles','Index canonique') for x in summary['profiles']]
    parts += [row(x,'pass2-native','V6 · deuxième passe') for x in summary['nativeImprovements']]
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">'
      '<title>Konstellation K7 · Revue privée</title><style>body{font:15px system-ui;margin:2rem;max-width:1100px}'
      'table{border-collapse:collapse;width:100%}th,td{padding:.5rem;border-bottom:1px solid #ccc;text-align:left}'
      'th{background:#f1f4f8}a{color:#225b86}</style></head><body><h1>K7 · Atelier de revue privé</h1>'
      '<p><strong>Source brute non filtrée. Aucune permission ni qualification sémantique accordée.</strong></p>'
      '<p>Les graphiques montrent uniquement des comptages techniques; les mêmes identifiants de relation peuvent nécessiter un examen.</p>'
      '<table><thead><tr><th>Kristal</th><th>Profil</th><th>Statut</th><th>Rapport</th><th>Diagnostic</th></tr></thead><tbody>'
      + ''.join(parts) + '</tbody></table></body></html>\n')


def ensure_private_output(folder: Path, forbidden: list[Path]):
    folder=folder.expanduser().absolute()
    for p in [folder,*forbidden]:
        require(not p.is_symlink(),'OUTPUT_OR_INPUT_SYMLINK_REFUSED')
    for p in forbidden:
        p=p.expanduser().resolve()
        require(folder!=p and p not in folder.parents and folder not in p.parents,'OUTPUT_OVERLAPS_SOURCE_OR_REPO')
    cur=folder
    while not cur.exists():
        cur=cur.parent
    require(not cur.is_symlink(),'OUTPUT_PARENT_SYMLINK_REFUSED')
    folder.mkdir(parents=True,exist_ok=True,mode=0o700)
    require(folder.resolve()==folder,'OUTPUT_REDIRECTED')
    return folder


def write_immutable(path: Path, data: bytes) -> bool:
    # Reject all redirects, including an existing symlink/junction in subdirectories.
    cur=path.parent
    while not cur.exists() and not cur.is_symlink():
        cur=cur.parent
    require(not cur.is_symlink() and not (hasattr(cur,'is_junction') and cur.is_junction()),'OUTPUT_PARENT_REDIRECT_REFUSED')
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    require(path.parent.resolve()==path.parent.absolute(),'OUTPUT_PARENT_REDIRECT_REFUSED')
    require(not path.is_symlink() and not (hasattr(path,'is_junction') and path.is_junction()),'OUTPUT_SYMLINK_REFUSED')
    try:
        with path.open('xb') as file:file.write(data)
        if os.name!='nt':path.chmod(0o600)
        return True
    except FileExistsError:
        require(path.is_file() and path.read_bytes()==data,'IMMUTABLE_OUTPUT_COLLISION')
        return False


def validate_k6_archive_root(k6root: Path, snapshot_sha: str, expected_slugs: set[str]) -> tuple[list[dict],str]:
    """Require complete byte-integrity manifest; never trust arbitrary sidecars."""
    require(not k6root.is_symlink() and not (hasattr(k6root,'is_junction') and k6root.is_junction()),'BAD_K6_RESULT_ROOT')
    root=k6root.expanduser().resolve(strict=True)
    require(root.is_dir(),'BAD_K6_RESULT_ROOT')
    checks=(root/'SHA256_CONTENU.txt').read_text('utf8').splitlines()
    filenames=set();expected={}
    for line in checks:
        match=re.fullmatch(r'([a-f0-9]{64})  ([\w.\-/]+)',line)
        require(match is not None,'BAD_K6_CHECKSUM_ROW')
        digest,rel=match.groups()
        parts=rel.split('/')
        require(all(x not in ('','.','..') for x in parts) and rel not in filenames,'BAD_K6_RESULT_PATH')
        filenames.add(rel);expected[rel]=digest
    for rel,digest in expected.items():
        target=root.joinpath(*rel.split('/'))
        require(target.resolve().is_relative_to(root) and target.is_file() and not target.is_symlink(), 'K6_RESULT_MISSING_OR_REDIRECTED')
        require(digest_file(target)=='sha256:'+digest,'K6_RESULT_CHECKSUM_MISMATCH:'+rel)
    summary=json.loads((root/'SUMMARY.json').read_text('utf8'))
    require(summary.get('format')=='konstellation.k6-batch-summary/0.1' and
            summary.get('snapshot',{}).get('sha256')==snapshot_sha and
            summary.get('auditedNativeStates')==84 and summary.get('refused')==0,
            'K6_SUMMARY_INCOMPATIBLE')
    native=[x['slug'] for x in summary['items'] if x['status']=='REVIEW_REQUIRED']
    require(len(native)==84 and len(set(native))==84 and all(SLUG.fullmatch(x) for x in native) and
            not set(native)&expected_slugs,'K6_NATIVE_SET_MISMATCH')
    for slug in native:
        require(f'pass2/{slug}.json' in expected, 'MISSING_PINNED_K6_REVIEW')
    rows=[]
    for slug in sorted(native):
        data=json.loads((root/'pass2'/f'{slug}.json').read_text('utf8'))
        require(data.get('slug')==slug,'K6_REVIEW_SLUG_MISMATCH')
        rows.append(review_native_k6(data))
    return rows,digest_file(root/'SUMMARY.json')


def run_k7(snapshot: Path,pins_path: Path,k6_pins_path: Path,output: Path,
           repo_root: Path,k6_results: Path | None=None) -> dict:
    pins_bytes=pins_path.read_bytes()
    pins=json.loads(pins_bytes)
    k6_bytes=k6_pins_path.read_bytes()
    k6=json.loads(k6_bytes)
    require(sha256(k6_bytes)==pins.get('k6PinsSha256'),'K6_PINS_BYTES_CHANGED')
    validate_pins(pins,k6)
    require(snapshot.is_file() and not snapshot.is_symlink(), 'SOURCE_ZIP_NOT_FOUND_OR_LINK')
    require(digest_file(snapshot)==pins['snapshot']['sha256'],'SNAPSHOT_ZIP_SHA256_MISMATCH')
    profiles=[]
    with zipfile.ZipFile(snapshot) as z:
        names=z.namelist()
        relevant=[n for n in names if n.startswith('kristals/') and '/canon/' in n]
        require(len(relevant)==len(set(relevant)),'DUPLICATE_CANONICAL_ZIP_ENTRIES')
        for pin in pins['indexes']:
            profiles.append(audit_index(z,pin))
    native=[]; k6summary=None
    if k6_results is not None:
        native,k6summary=validate_k6_archive_root(k6_results,pins['snapshot']['sha256'],{x['slug'] for x in pins['indexes']})
    run_seed=canonical_json({'version':VERSION,'pinBytes':sha256(pins_bytes),'k6Summary':k6summary})
    run_id=hashlib.sha256(run_seed).hexdigest()[:20]
    out=ensure_private_output(output,[repo_root,snapshot,*( [k6_results] if k6_results else [])])
    run=out/'runs'/run_id
    run.mkdir(parents=True,exist_ok=True,mode=0o700)
    require(run.resolve()==run,'RUN_OUTPUT_REDIRECT_REFUSED')
    listed=[]
    count=0;missing=0;large=0
    for a in profiles:
        slug=a['slug'];count+=a['canonicalArtifactCount'];missing+=a['missingCanonicalArtifacts'];large+=a['largeUnprofiledArtifacts']
        write_immutable(run/'pass1-profiles'/f'{slug}.json',canonical_json(a))
        write_immutable(run/'pass2-profiles'/f'{slug}.json',canonical_json(review_profile(a)))
        counts=Counter(row['profile']['surface'] for row in a['canonicalArtifacts'])
        write_immutable(run/'private-diagrams'/f'{slug}.svg',svg_bars(slug,'Profil technique des artefacts',list(counts.items()),
                        'SOURCE CANONIQUE NON FILTRÉE · INVENTAIRE TECHNIQUE SEULEMENT').encode('utf8'))
        listed.append({'slug':slug,'status':a['status'],'canonicalArtifacts':a['canonicalArtifactCount'],
                       'missing':a['missingCanonicalArtifacts']})
    natives=[]
    for a in native:
        slug=a['slug'];write_immutable(run/'pass2-native'/f'{slug}.json',canonical_json(a))
        vals=list(a['improvementCounts'].items())
        write_immutable(run/'private-diagrams'/f'{slug}.svg',svg_bars(slug,'Pistes de revue visuelle',vals,
                        'PROFIL V6 NON FILTRÉ · CONSEILS D’EXAMEN, PAS INTERPRÉTATIONS').encode('utf8'))
        natives.append({'slug':slug,'status':a['status'],'relations':a['relationCount']})
    summary={'format':'konstellation.k7-private-batch-summary/1.0','version':VERSION,'runId':run_id,
      'status':'TECHNICAL_BATCH_REVIEW_ONLY_NOT_QUALIFIED',
      'snapshot':pins['snapshot'],'indexPinsSha256':sha256(pins_bytes),'k6SummarySha256':k6summary,
      'profileIndexesAudited':len(profiles),'canonicalArtifactsDeclared':count,
      'canonicalArtifactBytesAvailable':count-missing,'missingDeclaredCanonicalArtifacts':missing,
      'largeJsonNotProfiled':large,'profilesWithAbsentArtifacts':sum(x['missing']>0 for x in listed),
      'nativeSecondPassRefinements':len(native),'totalFoldersRepresented':len(profiles)+len(native),
      'notPolicyFiltered':True,'notApproved':True,'notPublishable':True,
      'approvedRules':0,'semanticDiagramsQualified':0,
      'profiles':listed,'nativeImprovements':natives,
      'disclaimer':'Les résultats techniques des sources canoniques ne sont pas des projections filtrées. Les 84 SVG natifs classent des pistes de revue, pas des faits sémantiques. Manques explicites, sans inventions.'}
    write_immutable(run/'SUMMARY.json',canonical_json(summary))
    write_immutable(run/'REVIEW_WORKBENCH.html',private_workbench(summary).encode('utf8'))
    return {'status':'BATCH_COMPLETED_TECHNICAL_REVIEW_ONLY','runDir':str(run),
      'profiles':len(profiles),'declaredArtifacts':count,'missingArtifacts':missing,
      'nativeSecondPass':len(native),'qualifiedDiagrams':0}
