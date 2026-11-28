#!/usr/bin/env python3
"""Bounded live UI smoke on the already running local Konstellation instance.
No traces, screenshots, private output bytes, label text or identifiers in the report.
Downloads are exercised in an isolated temporary browser context and deleted.
"""
import argparse, hashlib, json, re
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

FAMILIES={'timeline-lineage','tree','dag-proof','flow-path','causal-feedback','matrix-profile','state-flow','traceability','multiscale-layer','spatial'}

def run(base, browser_name, maximum):
    report={'format':'koreograph.real-ui-smoke/0.1','browser':browser_name,'state':'review','publicationAuthorized':False,'checks':{},'sourcesAttempted':0,'diagnostics':[]}
    if not re.fullmatch(r'http://127\.0\.0\.1:[1-9][0-9]{0,4}',base) or not 1<=urlsplit(base).port<=65535:raise ValueError('loopback required')
    def passed(name):report['checks'][name]='pass'
    def step(name):report['checks'][name]='running'
    with sync_playwright() as p:
        browser=getattr(p,browser_name).launch(headless=True)
        report['browserVersion']=browser.version
        context=browser.new_context(viewport={'width':1440,'height':1000},locale='fr-CA',reduced_motion='no-preference',accept_downloads=True,service_workers='block')
        # Record revocation in memory, without relaxing connect-src or fetching blob URLs.
        context.add_init_script("""(()=>{const revoked=new Set();const original=URL.revokeObjectURL;URL.revokeObjectURL=function(url){const result=original.call(URL,url);revoked.add(String(url));return result};Object.defineProperty(window,'__kgTestRevoked',{value:u=>revoked.has(String(u))});})();""")
        page=context.new_page();page.set_default_timeout(12000);plans=[];errors=[];external=[]
        def guard(route):
            if urlsplit(route.request.url).scheme in ('data','blob','about') or route.request.url.startswith(base+'/'):route.continue_()
            else:external.append(True);route.abort()
        def on_response(response):
            if response.ok and urlsplit(response.url).path=='/api/navigation/plan':
                try:plans.append({'data':response.json(),'request':response.request.post_data_json,'kristal':response.request.headers.get('x-konstellation-kristal','')})
                except Exception:errors.append('UI-PLAN-RESPONSE')
        page.route('**/*',guard);page.on('pageerror',lambda _:errors.append('UI-PAGE-ERROR'));page.on('response',on_response)
        try:
            step('catalogue')
            cat=context.request.get(base+'/api/kristals',max_redirects=0,timeout=20000)
            if cat.status in (401,403):report['checks']['catalogue']='not-tested';report['diagnostics'].append('UI-AUTH-REQUIRED');return report
            if not cat.ok:raise ValueError('catalogue')
            cat=cat.json();items=[x for x in cat.get('items',[]) if x.get('available') is True]
            if not cat.get('selectable') or not items:raise ValueError('no local catalogue')
            # Prefer an explicitly configured domain graph over alphabetic technical inventory.
            items.sort(key=lambda x: (x.get('label','').casefold()!='catho', x.get('label','').casefold()))
            # Do not start from a remembered exploration. Fresh browser context.
            page.goto(base+'/',wait_until='domcontentloaded');page.wait_for_function('''()=>[...document.querySelectorAll('.fleet-card,select[aria-label=Kristal]')].some(e=>e.getClientRects().length>0)''',timeout=25000)
            passed('catalogue')
            select=page.get_by_label('Kristal',exact=True)
            policy=page.get_by_label('Politique de lecture',exact=True)
            buttons=page.locator('.view-switch.adaptive-switch button')
            def read_plan(k,expected_policy=None):
                # The actual app must have completed a matching navigation request.
                for _ in range(80):
                    for q in reversed(plans):
                        ref=q['request'].get('query',{}).get('context',{}).get('readerPolicyRef')
                        if q['kristal']==k and (expected_policy is None or ref==expected_policy):
                            if select.is_visible() and select.input_value()==k and buttons.count()==len(q['data'].get('views',[])) and buttons.count()>0 and page.locator('.results-body[aria-busy=false]').count()>0:
                                return q['data']
                    page.wait_for_timeout(250)
                raise ValueError('no plan')
            def open_item(item):
                k=item['id']
                if select.is_visible() and select.input_value()==k and any(q['kristal']==k for q in plans):
                    return {'views': []} if page.locator('[data-technical-view=true]').is_visible() else read_plan(k)
                plans.clear()
                if select.is_visible():
                    if select.input_value()!=k:select.select_option(k)
                    else:
                        # Existing default selection: reload with a fresh plan.
                        page.reload(wait_until='domcontentloaded')
                else:
                    card=page.get_by_role('button',name='Choisir '+item['label'],exact=True)
                    card.wait_for();card.click();page.get_by_role('button',name=re.compile('Ouvrir dans l.explorateur')).click()
                expect(select).to_be_visible();expect(select).to_have_value(k);expect(select).to_be_enabled(timeout=60000)
                if page.locator('[data-technical-view=true]').is_visible():
                    return {'views': []}
                return read_plan(k)
            chosen=None;panel=None
            for item in items[:maximum]:
                report['sourcesAttempted']+=1
                step('navigation');plan=open_item(item)
                found=next(((i,v) for i,v in enumerate(plan.get('views',[])) if v.get('rendererId') in FAMILIES),None)
                if not found:continue
                i,recipe=found;buttons.nth(i).click()
                projection=page.locator('.adaptive-projection');expect(projection).to_have_attribute('data-recipe',recipe['id']);expect(projection).to_have_attribute('aria-busy','false')
                panel=page.locator('.kg-specialized');expect(panel).to_be_visible();chosen=item;report['renderer']=recipe['rendererId'];break
            if chosen is None:report['checks']['navigation']='not-tested';report['diagnostics'].append('UI-NO-SPECIALIZED-RECIPE-IN-SAMPLE');return report
            passed('navigation');step('reader');report['readerStep']='open';panel.get_by_role('button',name='Koreograph',exact=True).click();svg=panel.locator('.kg-stage svg');expect(svg).to_be_visible()
            report['readerStep']='play-pause'
            play=panel.get_by_role('button',name='Lecture',exact=True);play.click();expect(panel.get_by_role('button',name='Pause',exact=True)).to_be_visible();panel.get_by_role('button',name='Pause',exact=True).click()
            report['readerStep']='chapters'
            next_button=panel.get_by_role('button',name='Chapitre suivant',exact=True)
            if next_button.is_enabled():
                next_button.click();expect(panel.get_by_role('button',name='Chapitre précédent',exact=True)).to_be_enabled();panel.get_by_role('button',name='Chapitre précédent',exact=True).click()
            report['readerStep']='seek'
            panel.get_by_role('slider').focus();panel.get_by_role('slider').press('End')
            report['readerStep']='themes'
            for theme in ['signature','paper','graphite','ink','spectrum','atlas','blueprint','editorial']:
                panel.get_by_label(re.compile(r'^Thème\b')).select_option(theme);expect(svg).to_be_visible()
            report['readerStep']='ratios'
            for ratio in ['1:1','9:16','16:9']:
                panel.get_by_label(re.compile(r'^Format\b')).select_option(ratio);expect(svg).to_have_attribute('viewBox',{'1:1':'0 0 1080 1080','9:16':'0 0 900 1600','16:9':'0 0 1600 900'}[ratio])
            report['readerStep']='reduced-motion'
            page.emulate_media(reduced_motion='reduce');expect(panel.get_by_role('button',name='Lecture',exact=True)).to_be_disabled()
            page.emulate_media(reduced_motion='no-preference');expect(panel.get_by_role('button',name='Lecture',exact=True)).to_be_enabled()
            passed('reader');report['readerStep']='complete';step('privateExports');consent=panel.get_by_role('checkbox');formats=[('HTML','koreograph-projection.html'),('SVG animé','koreograph-projection.animated.svg'),('SVG du chapitre','koreograph-projection.chapter.svg'),('PNG du chapitre','koreograph-projection.chapter.png'),('Storyboard JSON','koreograph-projection.storyboard.json')]
            for name,_ in formats:expect(panel.get_by_role('button',name=name,exact=True)).to_be_disabled()
            consent.check();last_url=None
            for name,filename in formats:
                report['exportStep']=filename
                panel.get_by_role('button',name=name,exact=True).click();link=panel.get_by_role('link',name=filename,exact=True);receipt=panel.get_by_role('link',name=filename+'.receipt.json',exact=True);expect(link).to_be_visible();expect(receipt).to_be_visible()
                last_url=link.get_attribute('href')
                # CSP connect-src 'self' correctly blocks fetch(blob:). Exercise real
                # downloads instead, inspect temporary bytes, then delete immediately.
                def downloaded(locator,expected):
                    with page.expect_download(timeout=12000) as pending:
                        locator.click()
                    download=pending.value
                    try:
                        if download.suggested_filename!=expected:raise ValueError('filename')
                        local=download.path()
                        if local.stat().st_size>32*1024*1024:raise ValueError('budget')
                        return local.read_bytes()
                    finally:download.delete()
                data=downloaded(link,filename);meta=json.loads(downloaded(receipt,filename+'.receipt.json'))
                valid=bool(data) and meta.get('output',{}).get('sha256')==hashlib.sha256(data).hexdigest() and meta.get('publicationAuthorized') is False and meta.get('output',{}).get('name')==filename and (not filename.endswith('.png') or data.startswith(b'\x89PNG\r\n\x1a\n'))
                if not valid:raise ValueError('receipt')
            report['exportStep']='complete'
            passed('privateExports');step('contextInvalidation');old=svg.element_handle();old_url=last_url
            other_policies=policy.locator('option:not([disabled])').evaluate_all('(els)=>els.map(e=>e.value)');current=policy.input_value();other=next((x for x in other_policies if x!=current),None)
            if other:
                plans.clear();policy.select_option(other);expect(policy).to_have_value(other);read_plan(chosen['id'],other);report['contextSwitch']='policy'
            else:
                next_item=next((x for x in items if x['id']!=chosen['id']),None)
                if next_item:open_item(next_item);report['contextSwitch']='kristal'
                else:report['checks']['contextInvalidation']='not-applicable';report['diagnostics'].append('UI-NO-SECOND-CONTEXT')
            if report['checks']['contextInvalidation']=='running':
                # Wait until the old DOM and the old exported Blob have been revoked.
                for _ in range(40):
                    detached=not old.evaluate('(e)=>e.isConnected');revoked=page.evaluate('u=>window.__kgTestRevoked(u)',old_url)
                    if detached and revoked:break
                    page.wait_for_timeout(250)
                else:raise ValueError('old player or blob still accessible')
                passed('contextInvalidation')
        except Exception as exc:
            report['errorType']=type(exc).__name__ if type(exc).__name__ in ('AssertionError','TimeoutError','Error','ValueError','OSError','JSONDecodeError') else 'Other'
            for name,state in list(report['checks'].items()):
                if state=='running':report['checks'][name]='fail';report['diagnostics'].append('UI-'+name.upper()+'-FAILED')
            report['state']='fail'
        finally:
            context.close();browser.close()
            if errors or external:report['diagnostics'].extend(sorted(set(errors+(['UI-EXTERNAL-NETWORK-BLOCKED'] if external else []))));report['state']='fail'
    if report['state']!='fail' and all(report['checks'].get(k)=='pass' for k in ('catalogue','navigation','reader','privateExports','contextInvalidation')):report['state']='pass'
    return report

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--base',default='http://127.0.0.1:4321');ap.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium');ap.add_argument('--max-sources',type=int,choices=range(1,13),default=6);ap.add_argument('--report',type=Path,required=True);ap.add_argument('--catalogue-prive',action='store_true');args=ap.parse_args()
    if not args.catalogue_prive or args.report.exists():ap.error('Explicit private catalogue and new report required.')
    try:report=run(args.base,args.browser,args.max_sources)
    except Exception:report={'format':'koreograph.real-ui-smoke/0.1','browser':args.browser,'state':'fail','publicationAuthorized':False,'checks':{},'diagnostics':['UI-EXECUTION-FAILED']}
    with args.report.open('x',encoding='utf-8') as f:json.dump(report,f,indent=2,ensure_ascii=False);f.write('\n')
    print(json.dumps(report,ensure_ascii=False));raise SystemExit(0 if report['state']=='pass' else 2 if report['state']=='review' else 1)
