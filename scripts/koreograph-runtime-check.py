#!/usr/bin/env python3
"""Offline browser qualification of a generated SMIL SVG. No arbitrary HTML or network."""
import argparse, json, hashlib, importlib.util, math
from pathlib import Path
from playwright.sync_api import sync_playwright
spec=importlib.util.spec_from_file_location('kgvideo',Path(__file__).with_name('koreograph-video.py'))
video=importlib.util.module_from_spec(spec);spec.loader.exec_module(video)
def qualify(file,chromium=None,browser_name="chromium"):
    if browser_name not in ("chromium","firefox","webkit"): raise ValueError("Navigateur inconnu.")
    if chromium and browser_name!="chromium": raise ValueError("--chromium réservé à Chromium.")
    raw,w,h,duration=video.inspect_svg(file)
    issues=set(); errors=[]; requests=[]; count=0
    with sync_playwright() as p:
        browser=getattr(p,browser_name).launch(headless=True,**({'executable_path':chromium} if chromium else {}))
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.route('**/*',lambda route:(requests.append('blocked'),route.abort()))
        page.on('pageerror',lambda error: errors.append('page-error'))
        page.set_content('<!doctype html><html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style><body>'+raw+'</body></html>')
        page.locator('svg').evaluate('(s)=>s.pauseAnimations()')
        # Text geometry measured in the actual browser after seeking. Sample every 100ms,
        # plus SMIL key times (bounded by the generator). No labels in the report.
        key_times=page.locator('svg').evaluate('''s=>Array.from(new Set(Array.from(s.querySelectorAll('[keyTimes]')).flatMap(a=>a.getAttribute('keyTimes').split(';').map(Number))))''')
        times=sorted(set([0,duration,*range(0,duration,100),*(round(k*duration,5) for k in key_times if math.isfinite(k) and 0<=k<=1)]))
        if len(times)>10000: raise ValueError('Budget de qualification dépassé.')
        for start in range(0,len(times),100):
            results=page.locator('svg').evaluate('''(svg,times)=>times.map(t=>{
              svg.setCurrentTime(t/1000);const box=svg.getBoundingClientRect();const visible=e=>{let o=1;for(let n=e;n&&n!==svg;n=n.parentElement)o*=Number(getComputedStyle(n).opacity);return o>.25;};
              const labels=[...svg.querySelectorAll('text')].filter(visible).map(e=>({e,b:e.getBoundingClientRect()}));let outside=false, overlap=false, invalid=false;
              for(const x of labels){const r=x.b;if(![r.x,r.y,r.width,r.height].every(Number.isFinite))invalid=true;if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)outside=true;}
              // Compare text only; a small tolerance avoids touching glyph boxes.
              for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i].b,b=labels[j].b;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)overlap=true;}
              return {outside,overlap,invalid};})''',times[start:start+100])
            count+=len(results)
            for r in results:
                if r['outside']:issues.add('R-TEXT-OUTSIDE')
                if r['overlap']:issues.add('R-TEXT-OVERLAP')
                if r['invalid']:issues.add('R-NONFINITE')
        browser_version=browser.version;browser.close()
    if errors:issues.add('R-PAGE-ERROR')
    if requests:issues.add('R-NETWORK-ATTEMPT')
    fatal=bool(issues&{'R-NONFINITE','R-PAGE-ERROR','R-NETWORK-ATTEMPT'})
    return {'format':'koreograph.runtime-check/0.1','sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'browser':{'chromium':'Chromium','firefox':'Firefox','webkit':'WebKit'}[browser_name]+' '+browser_version,'durationMs':duration,'samples':count,'state':'fail' if fatal else 'review' if issues else 'pass','diagnostics':sorted(issues),'publicationAuthorized':False,'scope':'sampled SMIL text geometry, JS errors and attempted network; not WCAG or Reader Policy qualification'}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('svg',type=Path);parser.add_argument('--chromium');parser.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium');parser.add_argument('--report',type=Path);args=parser.parse_args()
    report=qualify(args.svg,args.chromium,args.browser);text=json.dumps(report,ensure_ascii=False,indent=2)+'\n'
    if args.report:
        with args.report.open('x',encoding='utf-8') as f:f.write(text)
    print(text,end='');raise SystemExit(1 if report['state']=='fail' else 2 if report['state']=='review' else 0)
