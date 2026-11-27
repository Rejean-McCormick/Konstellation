#!/usr/bin/env python3
"""Rendu vidéo local d'un SVG Koreograph. Python Playwright + Chromium + FFmpeg optionnels."""
import argparse, math, os, re, shutil, subprocess, tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
NS='{http://www.w3.org/2000/svg}'
TAGS={'svg','title','desc','rect','defs','pattern','circle','text','g','line','path','animate','animateTransform'}
ATTRS=set('viewBox width height role aria-label font-family x y rx r cx cy fill opacity stroke stroke-width stroke-linejoin paint-order font-size font-weight text-anchor letter-spacing id patternUnits transform d x1 x2 y1 y2 attributeName values keyTimes dur repeatCount calcMode type'.split())
ANIM_ATTRS=set('x y x1 y1 x2 y2 opacity r fill stroke stroke-width transform'.split())
def inspect_svg(path):
    if path.stat().st_size>32*1024*1024: raise ValueError('SVG trop volumineux.')
    raw=path.read_text(encoding='utf-8')
    if re.search(r'<!DOCTYPE|<!ENTITY|<\?',raw,re.I): raise ValueError('Déclarations XML interdites.')
    root=ET.fromstring(raw)
    if root.tag!=NS+'svg': raise ValueError('Racine SVG invalide.')
    duration=0
    for node in root.iter():
        tag=node.tag.removeprefix(NS)
        if not node.tag.startswith(NS) or tag not in TAGS: raise ValueError('Élément SVG non autorisé.')
        for k,v in node.attrib.items():
            if k not in ATTRS: raise ValueError('Attribut non autorisé : '+k)
            if re.search(r'url\s*\(',v,re.I) and v!='url(#kg-grid)': raise ValueError('Ressource externe interdite.')
        if tag in {'animate','animateTransform'}:
            if node.get('attributeName') not in ANIM_ATTRS: raise ValueError('Attribut animé non autorisé.')
            d=node.get('dur','')
            if not re.fullmatch(r'[0-9]+ms',d): raise ValueError('Durée SMIL invalide.')
            duration=max(duration,int(d[:-2]))
    w,h=map(int,(root.get('width'),root.get('height')))
    if not (320<=w<=3840 and 320<=h<=3840 and 1<=duration<=120000): raise ValueError('Dimensions/durée hors budget.')
    # Reserialize the allowlisted XML: reject script, event handlers, foreignObject, href and namespaces.
    ET.register_namespace('',NS[1:-1]);return ET.tostring(root,encoding='unicode'),w,h,duration

def render(args):
    from playwright.sync_api import sync_playwright
    raw,sw,sh,duration=inspect_svg(args.svg)
    w=args.width or min(sw,1920);h=round(w*sh/sw/2)*2
    if w%2 or not (320<=w<=3840 and 320<=h<=3840): raise ValueError('Dimensions raster invalides.')
    frames=math.ceil(duration*args.fps/1000)
    if frames>3600: raise ValueError('Budget maximum : 3600 images.')
    fmt=args.out.suffix.lower();codecs={'.mp4':['-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart'],'.webm':['-c:v','libvpx-vp9','-pix_fmt','yuv420p'],'.gif':['-vf','fps=12']}
    if fmt not in codecs: raise ValueError('Format : MP4, WebM ou GIF.')
    if args.out.exists(): raise FileExistsError('Le fichier de sortie existe déjà.')
    if not shutil.which('ffmpeg'): raise RuntimeError('FFmpeg introuvable.')
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='koreograph-',dir=args.out.parent) as tmp:
        output=Path(tmp)/('video'+fmt)
        cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',str(args.fps),'-i','-','-an',*codecs[fmt],str(output)]
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,**({'executable_path':args.chromium} if args.chromium else {}))
            page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
            page.route('**/*',lambda route:route.abort())
            page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style></head><body>'+raw+'</body></html>')
            page.locator('svg').evaluate('(svg)=>svg.pauseAnimations()')
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
            try:
                for i in range(frames):
                    page.locator('svg').evaluate('(svg,t)=>svg.setCurrentTime(t)',min(duration/1000,i/args.fps))
                    proc.stdin.write(page.screenshot(type='png',animations='allow'))
                proc.stdin.close()
                if proc.wait()!=0: raise RuntimeError('FFmpeg a échoué.')
            except BaseException:
                proc.kill();proc.wait();raise
            finally: browser.close()
        if not output.is_file() or not output.stat().st_size: raise RuntimeError('Export vide.')
        os.replace(output,args.out)
    print(f'{args.out}: {frames} images, {w}×{h}, {args.fps} fps')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('svg',type=Path);parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--fps',type=int,choices=[24,30,60],default=30);parser.add_argument('--width',type=int);parser.add_argument('--chromium')
    render(parser.parse_args())
