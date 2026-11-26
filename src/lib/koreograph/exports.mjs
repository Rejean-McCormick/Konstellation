import { digest, digestBytes, KoreographError, validateBundle, validateScore } from './contracts.mjs';
import { frameAt, graphic, renderSvg } from './frame.mjs';

function offlinePlayer(bundle, frameAt, renderSvg) {
  const stage = document.querySelector('#stage');
  const slider = document.querySelector('#time');
  const play = document.querySelector('#play');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const milestones = [...new Set([0, ...bundle.segments.map(segment => segment.endMs)])];
  const list = document.querySelector('#scenes');
  for (const scene of bundle.scenes) {
    const item = document.createElement('li');
    item.textContent = scene.objects.map(node => node.label).join(' · ') +
      (scene.truncated ? (bundle.locale === 'en' ? ' (partial view)' : ' (vue partielle)') : '');
    list.append(item);
  }
  slider.max = bundle.durationMs;
  let time = 0;
  let origin;
  let request;
  function show(value) {
    time = Math.min(bundle.durationMs, Math.max(0, value));
    slider.value = time;
    const xml = new DOMParser().parseFromString(renderSvg(bundle, frameAt(bundle, time, reduced.matches)), 'image/svg+xml');
    stage.replaceChildren(document.importNode(xml.documentElement, true));
  }
  function pause() {
    cancelAnimationFrame(request);
    request = undefined;
    play.setAttribute('aria-pressed', 'false');
  }
  function tick(now) {
    show(now - origin);
    if (time < bundle.durationMs) request = requestAnimationFrame(tick);
    else pause();
  }
  play.addEventListener('click', () => {
    if (request !== undefined) { pause(); return; }
    if (time === bundle.durationMs) show(0);
    origin = performance.now() - time;
    play.setAttribute('aria-pressed', 'true');
    request = requestAnimationFrame(tick);
  });
  slider.addEventListener('input', () => { pause(); show(Number(slider.value)); });
  previous.addEventListener('click', () => { pause(); show(milestones.findLast(value => value < time) ?? 0); });
  next.addEventListener('click', () => { pause(); show(milestones.find(value => value > time) ?? bundle.durationMs); });
  function preference() { play.disabled = reduced.matches; pause(); show(time); }
  reduced.addEventListener('change', preference);
  preference();
}

export async function exportHtml(bundle) {
  validateBundle(bundle);
  const { provenance: _provenance, ...presentation } = bundle;
  const data = JSON.stringify(presentation).replace(/</gu, '\\u003c');
  // Explicit function declarations preserve references even after browser bundling.
  const source = [frameAt, graphic, renderSvg].map(fn => fn.toString()).join('\n');
  const script = source + '\n(' + offlinePlayer.toString() + ')(' + data + ',' + frameAt.name + ',' + renderSvg.name + ');';
  const style = 'body{font:16px system-ui;background:#101c26;color:#f5f4eb;margin:1rem auto;max-width:72rem;padding:0 1rem}svg{display:block;width:100%;height:auto;max-height:75vh}nav{display:flex;flex-wrap:wrap;gap:.7rem;align-items:center}input{flex:1}button{padding:.4rem .7rem}';
  const integrity = async input => {
    const hex = (await digest(input)).slice(7);
    return btoa(String.fromCharCode(...hex.match(/../gu).map(byte => parseInt(byte, 16))));
  };
  const [scriptHash, styleHash] = await Promise.all([integrity(script), integrity(style)]);
  const en = bundle.locale === 'en';
  const header = en ? 'Derived navigation' : 'Navigation dérivée';
  return '<!doctype html><html lang="' + bundle.locale + '"><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-' + scriptHash +
    '\'; style-src \'sha256-' + styleHash + '\'; base-uri \'none\'; form-action \'none\'">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Koreograph</title><style>' + style + '</style>' +
    '<main><h1>' + header + '</h1><div id="stage"></div><nav aria-label="Koreograph">' +
    '<button id="play" aria-pressed="false">' + (en ? 'Play / pause' : 'Lecture / pause') + '</button>' +
    '<button id="previous">' + (en ? 'Previous scene' : 'Scène précédente') + '</button>' +
    '<button id="next">' + (en ? 'Next scene' : 'Scène suivante') + '</button>' +
    '<label for="time">' + (en ? 'Position' : 'Position temporelle') + '</label><input id="time" type="range" min="0" value="0">' +
    '</nav><details><summary>' + (en ? 'Scenes as text' : 'Scènes en texte') + '</summary><ol id="scenes"></ol></details></main><script>' + script + '</script></html>';
}

export function exportAnimatedSvg(bundle) {
  validateBundle(bundle);
  const { width, height } = bundle.viewport;
  const step = 1000 / 12;
  const count = Math.ceil(bundle.durationMs / step);
  const images = [];
  for (let index = 0; index <= count; index++) {
    const time = Math.min(bundle.durationMs, index * step);
    const last = index === count;
    const begin = index === 0 ? '0s' : (time / 1000).toFixed(6) + 's';
    const duration = last ? 'indefinite' : ((Math.min(bundle.durationMs, (index + 1) * step) - time) / 1000).toFixed(6) + 's';
    images.push('<g visibility="' + (index === 0 ? 'visible' : 'hidden') + '">' + graphic(bundle, frameAt(bundle, time)) +
      '<set attributeName="visibility" to="visible" begin="' + begin + '" dur="' + duration +
      '"/>' + (index === 0 ? '<set attributeName="visibility" to="hidden" begin="' + duration + '" dur="indefinite"/>' : '') + '</g>');
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height +
    '" width="' + width + '" height="' + height + '" role="img">' + images.join('') + '</svg>';
  if (new TextEncoder().encode(svg).length > 24 * 1024 * 1024) throw new KoreographError('KOR_EXPORT_UNSUPPORTED');
  return svg;
}

export async function exportArtifact(prepared, format, timeMs = 0) {
  const { bundle, score, manifest } = prepared;
  if (format === 'score') {
    const filename = 'koreograph.score.json';
    const data = JSON.stringify(validateScore(score), null, 2);
    return { filename, mime: 'application/json', data, receipt: {
      ...manifest, output: { filename, format, digest: await digest(data) },
    } };
  }
  validateBundle(bundle);
  let data;
  let mime;
  let filename;
  if (format === 'html') {
    [filename, mime, data] = ['koreograph.html', 'text/html', await exportHtml(bundle)];
  } else if (format === 'svg' || format === 'animated') {
    [filename, mime, data] = [format === 'animated' ? 'koreograph.animated.svg' : 'koreograph.svg', 'image/svg+xml',
      format === 'animated' ? exportAnimatedSvg(bundle) : renderSvg(bundle, frameAt(bundle, timeMs))];
  } else if (format === 'png') {
    const width = bundle.viewport.width;
    const height = bundle.viewport.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderSvg(bundle, frameAt(bundle, timeMs)));
    await image.decode();
    canvas.getContext('2d').drawImage(image, 0, 0);
    data = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!data) throw new KoreographError('KOR_EXPORT_FAILED');
    [filename, mime] = ['koreograph.png', 'image/png'];
  } else if (format === 'bundle') {
    [filename, mime, data] = ['koreograph.bundle.json', 'application/json', JSON.stringify(bundle, null, 2)];
  } else {
    throw new KoreographError('KOR_EXPORT_UNSUPPORTED');
  }
  const receipt = {
    ...manifest, output: { filename, format, digest: typeof data === 'string' ? await digest(data) : await digestBytes(await data.arrayBuffer()),
      timeMs: ['svg', 'png'].includes(format) ? timeMs : undefined },
    rasterEnvironment: format === 'png' ? { userAgent: navigator.userAgent, fontFamily: 'sans-serif' } : null, timelineReproducible: Boolean(manifest?.bundleDigest),
  };
  return { filename, mime, data, receipt };
}
