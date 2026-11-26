// The offline player serializes these pure functions with their code intact.
export function frameAt(bundle, milliseconds, reduced = false) {
  const time = Math.max(0, Math.min(bundle.durationMs, Number.isFinite(milliseconds) ? milliseconds : 0));
  const { segments, scenes } = bundle;
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const middle = (lo + hi) >>> 1;
    if (time < segments[middle].endMs) hi = middle;
    else lo = middle + 1;
  }
  const { startMs, endMs, fromScene, toScene, easing, primitive } = segments[lo];
  const from = scenes.find(scene => scene.id === fromScene);
  const to = scenes.find(scene => scene.id === toScene);
  if (time === bundle.durationMs) return to;
  if (time === startMs || from === to || reduced) return from;
  const u = (time - startMs) / (endMs - startMs);
  const q = easing === 'smoothstep' ? u * u * (3 - 2 * u) : u;
  const mix = (a, b) => a + (b - a) * q;
  const objects = [];
  const links = [];
  if (primitive === 'fade') {
    for (const [scene, prefix, weight] of [[from, 'a/', 1 - q], [to, 'b/', q]]) {
      objects.push(...scene.objects.map(node => ({ ...node, key: prefix + node.key, opacity: node.opacity * weight })));
      links.push(...scene.links.map(link => ({
        ...link, key: prefix + link.key, from: prefix + link.from, to: prefix + link.to, opacity: weight,
      })));
    }
  } else {
    const old = new Map(from.objects.map(node => [node.key, node]));
    const next = new Map(to.objects.map(node => [node.key, node]));
    let revealed = 0;
    for (const key of new Set([...old.keys(), ...next.keys()])) {
      const a = old.get(key);
      const b = next.get(key);
      if (!b) objects.push({ ...a, opacity: a.opacity * (1 - q) });
      else if (!a) {
        const lag = primitive === 'reveal' ? 0.035 * revealed++ : 0;
        objects.push({ ...b, opacity: b.opacity * Math.max(0, (q - lag) / (1 - lag)) });
      } else {
        const node = {
          ...(q < 0.5 ? a : b), x: mix(a.x, b.x), y: mix(a.y, b.y),
          radius: mix(a.radius, b.radius), opacity: mix(a.opacity, b.opacity),
        };
        if (a.label !== b.label || a.role !== b.role) node.labelBlend = { from: a.label, to: b.label, progress: q };
        objects.push(node);
      }
    }
    const oldLinks = new Map(from.links.map(link => [link.key, link]));
    const nextLinks = new Map(to.links.map(link => [link.key, link]));
    for (const key of new Set([...oldLinks.keys(), ...nextLinks.keys()])) {
      const a = oldLinks.get(key);
      const b = nextLinks.get(key);
      links.push({ ...(a || b), opacity: a && b ? 1 : a ? 1 - q : q });
    }
  }
  return { id: to.id, focusKey: to.focusKey, objects, links, truncated: from.truncated || to.truncated };
}

export function graphic(bundle, frame) {
  const { width, height } = bundle.viewport;
  const escape = text => String(text).replace(/[&<>"']/gu, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/gu, '�');
  const short = (text, length) => {
    const characters = [...text];
    return characters.length > length ? characters.slice(0, length - 1).join('') + '…' : text;
  };
  const number = value => Math.round(value * 1000) / 1000;
  const deep = bundle.style === 'cinematic';
  const plain = bundle.style === 'minimal';
  const background = deep ? '#101c26' : '#f5f4eb';
  const ink = deep ? '#f4f2db' : '#152e32';
  const accent = deep ? '#f5c36b' : '#196d61';
  const fill = deep ? '#1d3944' : '#e3eee1';
  const objects = new Map(frame.objects.map(node => [node.key, node]));
  const lines = frame.links.flatMap(link => {
    const a = objects.get(link.from);
    const b = objects.get(link.to);
    if (!a?.opacity || !b?.opacity) return [];
    return ['<line x1="' + number(a.x) + '" y1="' + number(a.y) + '" x2="' + number(b.x) +
      '" y2="' + number(b.y) + '" stroke="' + accent + '" stroke-width="2" opacity="' +
      number(0.6 * Math.min(a.opacity, b.opacity, link.opacity ?? 1)) + '"/>'];
  });
  const nodes = frame.objects.map(node => {
    const center = node.role === 'center';
    const label = (value, opacity) =>
      '<text text-anchor="middle" y="' + number(node.radius + 21) + '" fill="' + ink +
      '" opacity="' + number(opacity) + '" font-size="' + (center ? 24 : 17) + '">' + escape(short(value, 20)) + '</text>';
    const blend = node.labelBlend;
    return '<g transform="translate(' + number(node.x) + ' ' + number(node.y) + ')" opacity="' + number(node.opacity) +
      '"><title>' + escape(node.label) + '</title><circle r="' + number(node.radius) + '" fill="' + (center ? accent : fill) +
      '" stroke="' + accent + '" stroke-width="' + (center ? 3 : 2) + '"/>' +
      (blend ? label(blend.from, 1 - blend.progress) + label(blend.to, blend.progress) : label(node.label, 1)) + '</g>';
  }).join('');
  const footnote = bundle.locale === 'en' ? 'Derived navigation' : 'Navigation dérivée';
  const trace = bundle.specialization;
  const revealed = frame.objects.filter(node => node.opacity > 0.5).length > 1;
  const labels = {
    'traceability/1': ['Désaccord attesté', 'Documented disagreement'],
    'tree/1': ['Hiérarchie attestée', 'Documented hierarchy'],
    'causal-feedback/1': ['Influence attestée', 'Documented influence'],
  };
  const caption = trace && labels[trace.adapter]?.[bundle.locale === 'en' ? 1 : 0];
  const sign = trace?.sign === 1 ? ' (+)' : trace?.sign === -1 ? ' (−)' : '';
  const annotation = trace?.assertionRefs.length && revealed
    ? '<text x="40" y="' + (height - 60) + '" font-size="17" fill="' + ink + '"><title>' +
      escape(trace.assertionRefs.join(' / ')) + '</title>' + caption + sign + '</text>'
    : '';
  const direction = trace?.assertionRefs.length && revealed && trace.adapter !== 'traceability/1'
    ? '<path d="M 859 450 H 1140 M 1124 436 L 1140 450 L 1124 464" fill="none" stroke="' +
      accent + '" stroke-width="3"><title>' + caption + '</title></path>'
    : '';
  const truncated = bundle.locale === 'en' ? ' · Partial view' : ' · Vue partielle';
  return '<rect width="' + width + '" height="' + height + '" fill="' + background + '"/>' +
    '<g font-family="sans-serif"><text x="40" y="52" font-size="' + (plain ? 23 : 29) + '" fill="' + ink + '">' +
    escape(short(bundle.title, Math.floor(width / 19))) + '</text>' + lines.join('') + direction + nodes + annotation +
    '<text x="40" y="' + (height - 32) + '" font-size="18" fill="' + ink + '">' +
    footnote + (frame.truncated ? truncated : '') + '</text></g>';
}

export function renderSvg(bundle, frame) {
  const { width, height } = bundle.viewport;
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height + '">' + graphic(bundle, frame) + '</svg>';
}
