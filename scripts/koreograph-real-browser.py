#!/usr/bin/env python3
"""Private local browser checks for freshly generated Koreograph SVG + HTML only."""
import argparse, hashlib, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec=importlib.util.spec_from_file_location('kgcheck',Path(__file__).with_name('koreograph-runtime-check.py'))
check=importlib.util.module_from_spec(spec);spec.loader.exec_module(check)

def reader(html,kind,browser_name,chromium=None):
    data=html.read_bytes()
    if len(data)>32*1024*1024: raise ValueError('budget')
    markup=data.decode('utf-8');issues=set();tested=[]
    with sync_playwright() as p:
        browser=getattr(p,browser_name).launch(headless=True,**({'executable_path':chromium} if chromium else {}))
        try:
            for reduced in ([False,True] if kind=='specialized' else [False]):
                context=browser.new_context(viewport={'width':1200,'height':900},reduced_motion='reduce' if reduced else 'no-preference',accept_downloads=False,service_workers='block')
                page=context.new_page();page.set_default_timeout(5000)
                page.route('**/*',lambda route:(issues.add('R-HTML-NETWORK'),route.abort()))
                page.on('pageerror',lambda error:issues.add('R-HTML-PAGE-ERROR'))
                try:
                    page.set_content(markup,wait_until='load');svg=page.locator('svg');play=page.locator('#play');seek=page.locator('#seek')
                    if svg.count()!=1 or not svg.is_visible() or not seek.is_visible() or not play.is_visible():raise ValueError('controls')
                    if kind=='specialized':
                        if not svg.evaluate('(s)=>s.animationsPaused()') or play.is_disabled()!=reduced:raise ValueError('preference')
                        if not reduced:
                            play.click();page.wait_for_function("!document.querySelector('svg').animationsPaused()")
                            play.click();page.wait_for_function("document.querySelector('svg').animationsPaused()")
                        if not page.locator('#next').is_visible() or not page.locator('#prev').is_visible():raise ValueError('chapters')
                        page.locator('#next').click();page.locator('#prev').click()
                        page.locator('summary').click()
                        if not page.locator('details').evaluate('(e)=>e.open'):raise ValueError('transcript')
                    else:
                        play.click();page.wait_for_function("document.querySelector('svg').animationsPaused()")
                        page.locator('#restart').click();page.wait_for_function("!document.querySelector('svg').animationsPaused()")
                        play.click();page.wait_for_function("document.querySelector('svg').animationsPaused()")
                    duration=float(seek.get_attribute('max'))/1000
                    seek.focus();seek.press('End');page.wait_for_function('(d)=>document.querySelector("svg").getCurrentTime()>=d-0.05',arg=duration)
                    tested.append('reduced' if reduced else 'standard')
                except Exception:issues.add('R-HTML-CONTROL')
                finally:context.close()
        finally:browser.close()
    return {'sha256':hashlib.sha256(data).hexdigest(),'tested':tested,'diagnostics':sorted(issues),'state':'fail' if issues else 'pass'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('svg',type=Path);parser.add_argument('html',type=Path);parser.add_argument('--browser',required=True,choices=['chromium','firefox','webkit']);parser.add_argument('--kind',required=True,choices=['specialized','orbital']);parser.add_argument('--chromium');args=parser.parse_args()
    # Retry a browser execution exception once; never retry away an observed
    # geometry, network, page or HTML-control failure. Record both attempts.
    execution=[]
    for attempt in range(2):
        phase='svg'
        try:
            report=check.qualify(args.svg,args.chromium,args.browser)
            if report['state']=='fail':break
            phase='html'
            report['html']=reader(args.html,args.kind,args.browser,args.chromium)
            if report['html']['state']!='pass':report['state']='fail'
            break
        except Exception as exc:
            execution.append({'attempt':attempt+1,'phase':phase,'errorType':type(exc).__name__ if type(exc).__name__ in ('TimeoutError','Error','ValueError','OSError','TargetClosedError') else 'Other'})
            report={'sha256':hashlib.sha256(args.svg.read_bytes()).hexdigest(),'browser':args.browser,'state':'fail','diagnostics':['R-REAL-BROWSER-EXECUTION'],'publicationAuthorized':False}
            # Input/budget errors are deterministic, not an interrupted browser.
            if isinstance(exc,ValueError):break
    if execution:report['executionExceptions']=execution
    print(json.dumps(report,ensure_ascii=False));raise SystemExit(0 if report['state']=='pass' else 2 if report['state']=='review' else 1)
