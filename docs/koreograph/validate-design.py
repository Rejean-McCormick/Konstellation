"""Contrôles documentaires locaux, non qualification runtime. Dépendance : jsonschema >= 4.18 (referencing)."""
from pathlib import Path
import copy, hashlib, json, xml.etree.ElementTree as ET
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent
load = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8'))
schemas = {p.name.split('.')[0]: load(p.relative_to(ROOT)) for p in (ROOT/'schemas').glob('*.schema.json')}
registry = Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in schemas.values())
for s in schemas.values(): Draft202012Validator.check_schema(s)
validators = {k: Draft202012Validator(s,registry=registry) for k,s in schemas.items()}
examples = [('score','examples/exploration.score.json'),('score','examples/auto.score.json'),('bundle','examples/exploration.bundle.json'),('production-request','examples/signature.production.json'),('presentation-plan','examples/signature.presentation.json')]
for kind,path in examples: validators[kind].validate(load(path))
themes = [load(p.relative_to(ROOT)) for p in sorted((ROOT/'themes').glob('*.json'))]
assert len(themes)==8 and len({t['id'] for t in themes})==8
for t in themes: validators['theme'].validate(t)

def luminance(c):
    vals=[int(c[i:i+2],16)/255 for i in (1,3,5)]
    return sum(w*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for w,v in zip((.2126,.7152,.0722),vals))
def contrast(a,b):
    a,b=sorted((luminance(a),luminance(b)))
    return (b+.05)/(a+.05)
contrasts=[]
for t in themes:
    tokens=t['tokens']; assert tokens['brand']=='#1E6864'
    for key,threshold in [('foreground',4.5),('mutedText',4.5),('edge',3),('nodeStroke',3),('focus',3),('context',3)]:
        ratio=contrast(tokens[key],tokens['background']); assert ratio>=threshold,(t['id'],key,ratio)
        contrasts.append((t['id'],key,ratio))

bundle=load('examples/exploration.bundle.json'); plan=load('examples/signature.presentation.json'); request=load('examples/signature.production.json'); score=load('examples/exploration.score.json')
def check_bundle(b):
    scenes={s['id']:s for s in b['scenes']}; assert len(scenes)==len(b['scenes'])
    W,H=b['viewport']['width'],b['viewport']['height']; a,c=map(int,b['viewport']['aspectRatio'].split(':')); assert W*c==H*a
    for s in scenes.values():
        objs={o['key']:o for o in s['objects']}; assert len(objs)==len(s['objects'])
        assert sum(o['role']=='center' for o in objs.values())==1 and objs[s['focusKey']]['role']=='center'
        assert len({l['key'] for l in s['links']})==len(s['links'])
        for l in s['links']: assert l['from'] in objs and l['to'] in objs
        for o in objs.values(): assert 0<=o['x']<=W and 0<=o['y']<=H
    end=0; prev=None
    for s in b['segments']:
        assert s['startMs']==end<s['endMs']
        a,c=scenes[s['fromScene']],scenes[s['toScene']]
        if prev is not None: assert prev==a['id']
        if s['primitive']=='hold': assert a['id']==c['id']
        if s['primitive']=='focus': assert c['focusKey'] in {o['key'] for o in a['objects']}
        if s['primitive']=='reveal': assert a['focusKey']==c['focusKey']
        prev=c['id']; end=s['endMs']
    assert end==b['durationMs']

def check_request(r):
    a,c=map(int,r['score']['presentation']['aspectRatio'].split(':')); assert r['resolution']['width']*c==r['resolution']['height']*a

def check_plan(p,b):
    assert p['bundleSha256']==hashlib.sha256((ROOT/'examples/exploration.bundle.json').read_bytes()).hexdigest()
    assert p['themeSha256']==hashlib.sha256(json.dumps(p['theme'],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    assert p['durationMs']==b['durationMs'] and len(p['camera'])==len(b['segments'])
    W,H=b['viewport']['width'],b['viewport']['height']; prev=None
    for shot,seg in zip(p['camera'],b['segments']):
        assert (shot['startMs'],shot['endMs'])==(seg['startMs'],seg['endMs'])
        if prev is not None: assert shot['from']==prev
        prev=shot['to']
        if p['cameraMode']=='fixed': assert shot['from']==shot['to']=={'cx':W/2,'cy':H/2,'zoom':1}
    if p['motion']=='reduced': assert p['cameraMode']=='fixed'
    if p['narrationMode']=='off': assert not p['captions']
    end=0; scenes={s['id']:s for s in b['scenes']}
    for cap in p['captions']:
        assert end<=cap['startMs']<cap['endMs']<=p['durationMs']; end=cap['endMs']
        for ref in cap['refs']:
            assert ref['sceneId'] in scenes and ref['objectKey'] in {o['key'] for o in scenes[ref['sceneId']]['objects']}
            assert any(ref['sceneId'] in (s['fromScene'],s['toScene']) and s['startMs']<cap['endMs'] and cap['startMs']<s['endMs'] for s in b['segments']) or cap['act']=='summarize'
    # check the three explicit example captions against labels, not a general template engine
    assert [c['text'] for c in p['captions']]==['Explorer : Conscience','Conscience → Identité : navigation','Explorer : Identité']
check_bundle(bundle); check_request(request); check_plan(plan,bundle)

negative=[]
def reject(kind,base,edit,name):
    x=copy.deepcopy(base); edit(x); assert not validators[kind].is_valid(x),name; negative.append(name)
reject('theme',themes[0],lambda x:x['tokens'].__setitem__('brand','#000000'),'brand')
reject('theme',themes[0],lambda x:x['tokens'].__setitem__('node','url(https://example.org)'),'color-url')
reject('theme',themes[0],lambda x:x.__setitem__('css','body{}'),'css')
reject('theme',themes[0],lambda x:x['typography'].__setitem__('fontFamily','remote'),'font')
reject('theme',themes[0],lambda x:x['effects'].__setitem__('haloOpacity',1),'halo')
reject('theme',themes[0],lambda x:x['kindShapes'].__setitem__('entity','script'),'shape')
reject('production-request',request,lambda x:x.__setitem__('encoding','by-relation'),'relation-mode')
reject('production-request',request,lambda x:x.__setitem__('out','../../private'),'path')
reject('production-request',request,lambda x:x['outputs'].append(x['outputs'][0]),'duplicate-output')
reject('production-request',request,lambda x:x['score'].__setitem__('token','x'),'nested-token')
reject('production-request',request,lambda x:x.__setitem__('fps',120),'fps')
reject('presentation-plan',plan,lambda x:x.__setitem__('bundleSha256','not-hash'),'hash-format')
reject('presentation-plan',plan,lambda x:x['camera'][0]['to'].__setitem__('zoom',5),'zoom')
reject('presentation-plan',plan,lambda x:x['captions'][0].__setitem__('act','causal'),'causal')
reject('presentation-plan',plan,lambda x:x['qa'].__setitem__('publicationAuthorized',True),'publication')
reject('score',score,lambda x:x.__setitem__('token','x'),'score-token')
reject('score',score,lambda x:x.__setitem__('format','koreograph.score/99'),'score-version')
reject('score',score,lambda x:x['steps'][0].__setitem__('action','follow'),'initial-follow')
reject('bundle',bundle,lambda x:x['scenes'][0]['links'][0].__setitem__('kind','causal'),'bundle-causal')
reject('bundle',bundle,lambda x:x['provenance'].__setitem__('publicationAuthorized',True),'bundle-publish')
reject('bundle',bundle,lambda x:x['scenes'][0]['objects'][0].__setitem__('opacity',2),'bundle-opacity')

def cross_reject(base,edit,check,name):
    x=copy.deepcopy(base); edit(x)
    try: check(x)
    except (AssertionError,KeyError): negative.append(name); return
    raise AssertionError(name)
cross_reject(request,lambda x:x['resolution'].__setitem__('width',1000),check_request,'wrong-aspect')
cross_reject(plan,lambda x:x.__setitem__('bundleSha256','0'*64),lambda x:check_plan(x,bundle),'wrong-digest')
cross_reject(plan,lambda x:x['camera'][1].__setitem__('startMs',1300),lambda x:check_plan(x,bundle),'shot-gap')
cross_reject(plan,lambda x:x['captions'][0]['refs'][0].__setitem__('objectKey','unknown'),lambda x:check_plan(x,bundle),'unknown-caption-object')
cross_reject(plan,lambda x:x['captions'][0].__setitem__('text','Nouvelle assertion'),lambda x:check_plan(x,bundle),'caption-invention')
svg=ET.parse(ROOT/'examples/koreograph-focus-demo.svg').getroot(); assert svg.tag.endswith('}svg')
for el in svg.iter():
    assert el.tag.split('}')[-1] not in ('script','foreignObject')
    assert not any(k.lower().startswith('on') or k.endswith('href') for k in el.attrib)
assert any(el.tag.endswith('}animate') for el in svg.iter())
print(json.dumps({'schemas':len(schemas),'positiveExamples':len(examples),'themes':len(themes),'negativeCases':len(negative),'contrastChecks':len(contrasts),'minTextContrast':round(min(r for _,k,r in contrasts if k in ('foreground','mutedText')),2),'minGraphicContrast':round(min(r for _,k,r in contrasts if k not in ('foreground','mutedText')),2),'svgXml':'valid','crossChecks':'passed'},indent=2))
