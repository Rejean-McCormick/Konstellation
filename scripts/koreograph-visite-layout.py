#!/usr/bin/env python3
"""Visite guidée visible, en lecture seule, de Konstellation/Koreograph local.
Python + Playwright existants. Captures PNG privées et ZIP local dans Downloads.
Aucun export de connaissances par Koreograph, aucune publication.
"""
import argparse
import re
import json
import html
import hashlib
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

FAMILIES = {'timeline-lineage','tree','dag-proof','flow-path','causal-feedback',
            'matrix-profile','state-flow','traceability','multiscale-layer','spatial'}
BASE = 'http://127.0.0.1:4321'


class CapturePackage:
    """Only screenshots and an offline index; no raw API responses, traces or storage."""
    def __init__(self, downloads, work, args):
        self.downloads = downloads
        self.work = work
        self.records = []
        self.layout = []
        self.errors = []
        self.status = 'partial'
        self.browser = args.browser
        self.browser_version = None
        self.orbital = False
        self.families = []
        self.last_step = 'Démarrage'
        self.section = 'Catalogue'
        self.path = None
        self.technical = None

    def capture(self, page, title, target=None):
        title = self.section + ' — ' + title
        self.last_step = title
        if page.is_closed():
            return
        number = len(self.records) + 1
        filename = f'{number:03d}-{("detail" if target is not None else "ecran")}.png'
        dest = self.work / filename
        try:
            # No animation disabling: the chosen animation instant must be preserved.
            if target is None:
                page.screenshot(path=str(dest), full_page=False, timeout=12000)
            else:
                target.screenshot(path=str(dest), timeout=12000)
            data = dest.read_bytes()
            self.records.append({'file':filename, 'step':title, 'type':'detail' if target is not None else 'viewport',
                                 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()})
            print(f'  Capture {number:03d} : {title}', flush=True)
        except Exception as exc:
            dest.unlink(missing_ok=True)
            self.errors.append({'step':title, 'type':'Capture-'+type(exc).__name__})

    def error(self, page, title, exc):
        self.errors.append({'step':title,'type':type(exc).__name__})
        print('  Étape interrompue : '+title+' ('+type(exc).__name__+')', flush=True)
        if page is not None:
            self.capture(page, 'État après interruption — '+title)

    def finish(self):
        if self.path is not None:
            return self.path
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        dest = self.downloads / f'Koreograph_visite_layout_{stamp}_{uuid4().hex[:6]}.zip'
        report = {'format':'koreograph.visual-tour/0.2','state':self.status,
                  'browser':self.browser,'browserVersion':self.browser_version,
                  'viewport':{'width':1440,'height':960},'orbitalShown':self.orbital,
                  'familiesShown':self.families,'technicalViewCheck':self.technical,'lastStep':self.last_step,
                  'privateScreenshots':True,'publicationAuthorized':False,
                  'captures':self.records,'layout':self.layout,'errors':self.errors}
        index = ['<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
                 '<title>Visite Koreograph — captures privées</title><style>body{font:16px system-ui,sans-serif;color:#172c2a;background:#f4f7f6;max-width:1500px;margin:2rem auto;padding:0 1rem}figure{margin:1.5rem 0;background:white;padding:1rem;border:1px solid #d4dfdd;border-radius:8px}img{display:block;max-width:100%;height:auto;margin:1rem auto}figcaption{font-weight:600}small{color:#425a55}</style>',
                 '<h1>Visite Koreograph</h1><p>Captures privées — diffusion non autorisée automatiquement. Ouvrir localement après extraction.</p>',
                 '<p>État : '+html.escape(self.status)+' · '+str(len(self.records))+' captures. <a href="manifest.json">Manifeste</a></p>']
        for rec in self.records:
            name=html.escape(rec['file'],quote=True)
            index.append('<figure><figcaption>'+html.escape(rec['step'])+'</figcaption><a href="'+name+'"><img loading="lazy" src="'+name+'" alt="'+html.escape(rec['step'],quote=True)+'"></a><small>'+name+'</small></figure>')
        index.append('</html>')
        with zipfile.ZipFile(dest,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as archive:
            archive.writestr('manifest.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
            archive.writestr('index.html','\n'.join(index))
            for rec in self.records:
                archive.write(self.work/rec['file'],rec['file'])
        self.path = dest
        print('\n=== ARCHIVE DES CAPTURES ===',flush=True)
        print(str(dest),flush=True)
        print(f'{len(self.records)} capture(s) — {self.status}. Vérifier le contenu avant de le partager.',flush=True)
        return dest


def visit(args, package):
    with sync_playwright() as p:
        browser = getattr(p, args.browser).launch(headless=args.headless, slow_mo=0 if args.headless else 160)
        package.browser_version = browser.version
        context = browser.new_context(locale='fr-CA', viewport={'width': 1440, 'height': 960},
                                      reduced_motion='no-preference', service_workers='block',
                                      accept_downloads=False)
        page = context.new_page()
        page.set_default_timeout(15000)
        # Catalogue privé, aucune navigation externe ni export.
        def guard(route):
            url = route.request.url
            if url.startswith(BASE + '/') or urlsplit(url).scheme in ('about','data','blob'):
                route.continue_()
            else:
                route.abort()
        context.route('**/*', guard)
        plans = []
        def on_response(response):
            if response.ok and urlsplit(response.url).path == '/api/navigation/plan':
                try:
                    plans.append({'data':response.json(), 'request':response.request.post_data_json,
                                  'kristal':response.request.headers.get('x-konstellation-kristal','')})
                    del plans[:-100]
                except Exception:
                    pass
        page.on('response', on_response)
        def show(title, loc=None, seconds=2):
            package.last_step = title
            print('\n=== ' + title + ' ===', flush=True)
            if loc is not None:
                loc.scroll_into_view_if_needed()
            page.wait_for_timeout(int(seconds * args.tempo * 1000))
            package.capture(page, title)
        def seek_fraction(panel, fraction):
            slider=panel.get_by_role('slider')
            slider.evaluate("(e,f)=>{e.value=String(Math.round(Number(e.max)*f));e.dispatchEvent(new Event('input',{bubbles:true}));}",fraction)
            page.wait_for_timeout(300)
        def measure_layout(panel, phase):
            # Measure the live SVG and its stage; no labels, IDs or API payloads in the measurements.
            result = panel.evaluate("""(root)=>{
                const stage=root.querySelector('.kg-stage'), svg=stage.querySelector('svg'), player=root.querySelector('.kg-player');
                const r=root.getBoundingClientRect(), s=stage.getBoundingClientRect(), v=svg.getBoundingClientRect(), p=player.getBoundingClientRect();
                const vb=svg.viewBox.baseVal, expanded=root.classList.contains('kg-presenting'), epsilon=2;
                const inside=(a,b)=>a.left>=b.left-epsilon && a.top>=b.top-epsilon && a.right<=b.right+epsilon && a.bottom<=b.bottom+epsilon;
                const vp={left:0,top:0,right:innerWidth,bottom:innerHeight};
                const hits=expanded?[.02,.5,.98].every(x=>[.02,.5,.98].every(y=>root.contains(document.elementFromPoint(v.left+v.width*x,v.top+v.height*y)))):null;
                const dimensions=a=>({width:Math.round(a.width),height:Math.round(a.height)});
                return {expanded,ratio:vb.width+':'+vb.height,reader:dimensions(r),stage:dimensions(s),svg:dimensions(v),
                    aspectPreserved:Math.abs(v.width/v.height-vb.width/vb.height)<.02,
                    svgContained:inside(v,s)&&inside(s,r),
                    readerFillsViewport:expanded?inside(r,vp)&&r.width>=innerWidth-epsilon&&r.height>=innerHeight-epsilon:null,
                    controlsInViewport:expanded?inside(p,vp)&&inside(v,vp):null,unobscured:hits};
            }""")
            result.update({'step':package.section+' — '+phase})
            result['state']='pass' if result['aspectPreserved'] and result['svgContained'] and (not result['expanded'] or all(result[k] for k in ('readerFillsViewport','controlsInViewport','unobscured'))) else 'review'
            package.layout.append(result)
            print('  Géométrie : '+result['state']+' · SVG '+str(result['svg']['width'])+' × '+str(result['svg']['height']),flush=True)
            if result['state']!='pass':package.errors.append({'step':result['step'],'type':'LAYOUT-REVIEW'})
        def leave_presentation():
            if not page.is_closed():
                toggle=page.locator('.kg-presenting .kg-present-toggle')
                if toggle.count():toggle.click()
        def enter_presentation(panel):
            if not panel.evaluate("e=>e.classList.contains('kg-presenting')"):
                measure_layout(panel,'Lecteur intégré')
                show('Lecteur intégré avant agrandissement',panel.locator('.kg-stage'),.3)
                panel.get_by_role('button',name='Mode présentation',exact=True).click()
                expect(panel.locator('.kg-present-toggle')).to_have_attribute('aria-pressed','true')
            measure_layout(panel,'Mode présentation')
        def play_clip(panel):
            stage = panel.locator('.kg-stage')
            slider = panel.get_by_role('slider')
            expect(stage.locator('svg')).to_be_visible(timeout=50000)
            expect(slider).to_be_enabled(timeout=30000)
            enter_presentation(panel)
            slider.focus(); slider.press('Home')
            show('Lecture de la chorégraphie', stage, 1)
            play = panel.get_by_role('button',name='Lecture',exact=True)
            expect(play).to_be_enabled()
            duration = int(float(slider.get_attribute('max') or '10000'))
            play.click(); stage.scroll_into_view_if_needed()
            page.wait_for_timeout(min(max(duration//3, 300), 3500))
            pause = panel.get_by_role('button',name='Pause',exact=True)
            if pause.is_visible(): pause.click()
            show('Arrêt sur image — lecture réelle',stage,0.5)
            for fraction in (0.2,0.55,0.9):
                seek_fraction(panel,fraction)
                package.capture(page,f'Chorégraphie — position {int(fraction*100)} %',stage.locator('svg'))

        try:
            response = context.request.get(BASE+'/api/kristals',max_redirects=0,timeout=15000)
            if not response.ok: raise RuntimeError('Catalogue local indisponible ou authentification requise.')
            cat = response.json()
            items = [x for x in cat.get('items',[]) if x.get('available') is True]
            if not cat.get('selectable') or not items: raise RuntimeError('Aucun Kristal local sélectionnable.')
            if args.audit:
                if args.audit.stat().st_size > 4*1024*1024: raise ValueError('Audit trop volumineux')
                audit=json.loads(args.audit.read_text(encoding='utf-8-sig'))
                if audit.get('format')!='konstellation.reader-audit/1' or audit.get('state') not in ('complete','review'):raise ValueError('Audit non utilisable')
                # Audit only influences visit order; every item remains selected from the live authorised catalogue.
                by_id={entry['readerId']:entry for entry in audit['entries']}
                eligible=[item for item in items if by_id.get(item['id'],{}).get('state') in ('navigation-observee','entites-observees')]
                def rank(item):
                    e=by_id[item['id']]
                    return (e['state']!='navigation-observee', -max((o['entityNeighbors'] for o in e['observations']),default=0), -max((o['specializedViews'] for o in e['observations']),default=0), item['label'].casefold())
                eligible.sort(key=rank)
                technical=next((item for item in items if by_id.get(item['id'],{}).get('state')=='structure-technique'),None)
                items=([technical] if technical else [])+eligible
            else:
                items.sort(key=lambda x:(x.get('label','').casefold()!='catho',x.get('label','').casefold()))
            page.goto(BASE+'/',wait_until='domcontentloaded')
            page.wait_for_function('''()=>[...document.querySelectorAll('.fleet-card,select[aria-label=Kristal]')].some(e=>e.getClientRects().length>0)''',timeout=25000)
            show('1. Mes Kristals — catalogue réel',seconds=3)
            select = page.get_by_label('Kristal',exact=True)
            buttons = page.locator('.view-switch.adaptive-switch button')
            def open_item(item):
                k = item['id']
                if not (select.is_visible() and select.input_value()==k and any(q['kristal']==k for q in plans)):
                    plans.clear()
                    if select.is_visible():
                        if select.input_value()!=k: select.select_option(k)
                        else: page.reload(wait_until='domcontentloaded')
                    else:
                        card=page.get_by_role('button',name='Choisir '+item['label'],exact=True)
                        card.wait_for();card.click()
                        page.get_by_role('button',name=re.compile('Ouvrir dans l.explorateur')).click()
                expect(select).to_be_visible();expect(select).to_have_value(k);expect(select).to_be_enabled(timeout=60000)
                if page.locator('[data-technical-view=true]').is_visible():
                    return []
                for _ in range(100):
                    for q in reversed(plans):
                        views=q['data'].get('views',[])
                        if q['kristal']==k and select.input_value()==k and views and buttons.count()==len(views) and page.locator('.results-body[aria-busy=false]').count()>0:
                            return views
                    page.wait_for_timeout(250)
                raise RuntimeError('Plan de navigation non disponible.')
            orbital_done=False; families=set()
            for item_number, item in enumerate(items[:args.max_kristals], 1):
                package.section = f'Kristal {item_number:02d}'
                if page.is_closed(): break
                try:
                    views=open_item(item)
                except Exception as exc:
                    package.error(page,'Ouverture du Kristal',exc)
                    continue
                show('2. Ouverture du Kristal et de ses vues autorisées',page.locator('.context-bar'),1)
                if page.locator('[data-technical-view=true]').is_visible():
                    try:
                        notice=page.locator('[data-technical-view=true]')
                        expect(page.locator('.workspace')).to_have_count(0)
                        show('Vue technique — pas de contenu du domaine affirmé',notice,1)
                        notice.get_by_role('button').click()
                        expect(page.locator('.workspace')).to_be_visible()
                        expect(page.locator('.kg-specialized,.koreograph-studio')).to_have_count(0)
                        show('Structure accessible sur demande',page.locator('.workspace'),1)
                        notice.get_by_role('button').click()
                        expect(page.locator('.workspace')).to_have_count(0)
                        package.technical='pass'
                    except Exception as exc:
                        package.technical='fail';package.error(page,'Distinction structure / connaissances',exc)
                    continue
                try:
                    if not orbital_done:
                        orbit=next((i for i,v in enumerate(views) if v.get('rendererId')=='constellation'),None)
                        if orbit is not None:
                            buttons.nth(orbit).click()
                            canvas=page.locator('.constellation-view')
                            expect(canvas).to_be_visible();expect(canvas).to_have_attribute('aria-busy','false')
                            nodes=canvas.locator('svg g[role=button][aria-label^="Explorer "]')
                            if nodes.count():
                                package.section = f'Kristal {item_number:02d} / Orbital Signature'
                                show('3. Navigation dans la constellation',canvas,2)
                                nodes.first.press('Enter');expect(canvas).to_have_attribute('aria-busy','false')
                                canvas.get_by_role('button',name='Koreograph',exact=True).click()
                                studio=canvas.locator('.koreograph-studio')
                                generate=studio.get_by_role('button',name='Générer automatiquement',exact=True)
                                expect(generate).to_be_enabled(timeout=20000)
                                show('4. Koreograph — génération automatique',studio.locator('.kg-controls').first,2)
                                studio.get_by_label('Étapes',exact=True).select_option('3')
                                generate.click()
                                play_clip(studio)
                                package.section = f'Kristal {item_number:02d} / Orbital Spectrum'
                                show('5. Coloration et formes par type',studio.locator('.kg-stage'),1)
                                appearance=studio.locator('.kg-setup details').first
                                if not appearance.evaluate('e=>e.open'):appearance.locator('summary').click()
                                studio.get_by_label('Thème',exact=True).select_option('spectrum')
                                studio.get_by_label('Coloration',exact=True).select_option('by-kind')
                                studio.get_by_label('Formes',exact=True).select_option('by-kind')
                                if appearance.evaluate('e=>e.open'):appearance.locator('summary').click()
                                play_clip(studio)
                                leave_presentation()
                                orbital_done=True
                                package.orbital=True
                                # Restore a matching live plan; focusing an entity may change the available recipes.
                                views=open_item(item)
                except Exception as exc:
                    package.error(page,'Navigation orbitale',exc)
                    try:
                        leave_presentation()
                        views=open_item(item)
                    except Exception as inner:
                        package.error(page,'Retour aux vues autorisées',inner)
                        continue
                for i, recipe in enumerate(views):
                    if len(families)>=args.families: break
                    family=recipe.get('rendererId')
                    if family not in FAMILIES or family in families: continue
                    try:
                        package.section = f'Kristal {item_number:02d} / {family}'
                        buttons.nth(i).click()
                        projection=page.locator('.adaptive-projection')
                        expect(projection).to_have_attribute('data-recipe',recipe['id'])
                        expect(projection).to_have_attribute('aria-busy','false',timeout=30000)
                        panel=page.locator('.kg-specialized')
                        expect(panel).to_be_visible()
                        show('6. Projection spécialisée : '+family,projection,2)
                        panel.get_by_role('button',name='Koreograph',exact=True).click()
                        play_clip(panel)
                        nxt=panel.get_by_role('button',name='Chapitre suivant',exact=True)
                        prev=panel.get_by_role('button',name='Chapitre précédent',exact=True)
                        if prev.is_enabled():
                            prev.click();show('Navigation par chapitre',panel.locator('.kg-stage'),2)
                        elif nxt.is_enabled():
                            nxt.click();show('Navigation par chapitre',panel.locator('.kg-stage'),2)
                        theme=panel.get_by_label(re.compile(r'^Thème\b'))
                        ratio=panel.get_by_label(re.compile(r'^Format\b'))
                        for style,fmt in [('paper','1:1'),('atlas','9:16'),('signature','16:9')]:
                            theme.select_option(style);ratio.select_option(fmt)
                            # Last instant of the chapter sequence makes the cards visible.
                            slider=panel.get_by_role('slider');slider.focus();slider.press('End')
                            expect(panel.locator('.kg-stage svg')).to_have_attribute('viewBox',{'1:1':'0 0 1080 1080','9:16':'0 0 900 1600','16:9':'0 0 1600 900'}[fmt])
                            measure_layout(panel,'Format '+fmt)
                            show('Thème '+style+' — format '+fmt,panel.locator('.kg-stage'),2)
                            package.capture(page,'Détail — '+style+' — '+fmt,panel.locator('.kg-stage svg'))
                        panel.locator('details > summary').click()
                        show('Transcription et références visibles',panel.locator('details'),2)
                        panel.locator('details > summary').click()
                        show('Exports locaux : consentement nécessaire',panel.get_by_role('button',name='Storyboard JSON',exact=True),2)
                        show('Retour à la chorégraphie',panel.locator('.kg-stage'),2)
                        leave_presentation()
                        measure_layout(panel,'Retour intégré')
                        families.add(family)
                        package.families=sorted(families)
                        if len(families)>=args.families: break
                        panel.get_by_role('button',name='Fermer Koreograph',exact=True).click()
                    except Exception as exc:
                        package.error(page,'Projection '+family,exc)
                        try:leave_presentation()
                        except Exception:pass
                        if page.is_closed():break
                        continue
                if len(families)>=args.families and orbital_done: break
            package.status='complete' if orbital_done and len(families)>=args.families and not package.errors else 'partial'
            print('\nVisite terminée : '+('orbital présenté' if orbital_done else 'orbital indisponible dans cet échantillon')+f', {len(families)} famille(s) spécialisée(s).',flush=True)
        except Exception as exc:
            # No private locator values, server responses or labels in terminal output.
            print('\nVisite interrompue ('+type(exc).__name__+'). Le navigateur reste disponible pour inspection.',flush=True)
            package.error(page,package.last_step,exc)
        finally:
            if not page.is_closed():
                package.finish()
            if not page.is_closed() and not args.headless and not args.sans_pause:
                try: input('\nExplore librement dans le navigateur. Entrée ici pour fermer la visite. ')
                except (EOFError,KeyboardInterrupt): pass
            context.close();browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium')
    parser.add_argument('--max-kristals',type=int,choices=range(1,13),default=6)
    parser.add_argument('--familles',dest='families',type=int,choices=[1,2,3],default=2)
    parser.add_argument('--tempo',type=float,choices=[0.5,1.0,1.5,2.0],default=1.0)
    parser.add_argument('--catalogue-prive',action='store_true',help='Autorise les captures privées locales du catalogue.')
    parser.add_argument('--audit',type=Path,help='Audit local pour sélectionner les Kristals effectivement explorables.')
    parser.add_argument('--headless',action='store_true',help='Capturer sans ouvrir de navigateur visible.')
    parser.add_argument('--sans-pause',action='store_true',help='Fermer le navigateur après la création du ZIP.')
    parser.add_argument('--downloads',type=Path,default=Path.home()/'Downloads',help='Dossier de destination du ZIP.')
    args=parser.parse_args()
    if not args.catalogue_prive: parser.error('Confirmer la lecture du catalogue privé avec --catalogue-prive.')
    args.downloads.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='koreograph-visite-') as temp:
        package=CapturePackage(args.downloads,Path(temp),args)
        try:
            visit(args,package)
        except KeyboardInterrupt:
            package.status='partial'
            package.errors.append({'step':package.last_step,'type':'KeyboardInterrupt'})
        except Exception as exc:
            package.error(None,package.last_step,exc)
        finally:
            package.finish()
