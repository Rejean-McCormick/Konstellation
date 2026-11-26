import { score, bundle } from './validators.mjs';

export const SCORE_BYTES = 64 * 1024;
export const BUNDLE_BYTES = 2 * 1024 * 1024;
export const VERSION = '0.1.0';

export class KoreographError extends Error {
  constructor(code, step) {
    super(code);
    this.code = code;
    this.step = step;
  }
}

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function targetOf(value) {
  return { focus: value.focus, groupId: value.groupId ?? null };
}

export function targetKey(value) {
  return canonical(targetOf(value));
}

export function validateScore(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  if (!text || text.length > SCORE_BYTES || new TextEncoder().encode(text).length > SCORE_BYTES) {
    throw new KoreographError('KOR_INVALID_SCORE');
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new KoreographError('KOR_INVALID_SCORE');
  }
  if (!score(value)) throw new KoreographError('KOR_INVALID_SCORE');
  return value;
}

const ratios = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };

export function validateBundle(value) {
  const fail = () => { throw new KoreographError('KOR_INVALID_BUNDLE'); };
  if (!bundle(value) || new TextEncoder().encode(JSON.stringify(value)).length > BUNDLE_BYTES) fail();
  const { viewport, scenes, segments, durationMs, specialization } = value;
  if (specialization) {
    const reviewed = ['qualified', 'partial'].includes(specialization.status);
    const count = specialization.assertionRefs.length;
    if (reviewed !== (count > 0)) fail();
    if (reviewed && !['traceability/1', 'tree/1', 'causal-feedback/1'].includes(specialization.adapter)) fail();
    if (reviewed && specialization.adapter === 'traceability/1' && count !== 2) fail();
    if (reviewed && specialization.adapter === 'causal-feedback/1' && (count !== 1 || specialization.sign === undefined)) fail();
    if ((!reviewed || specialization.adapter !== 'causal-feedback/1') && specialization.sign !== undefined) fail();
  }
  if (Math.abs(viewport.width / viewport.height - ratios[viewport.aspectRatio]) > 0.005) fail();
  const ids = new Map();
  for (const scene of scenes) {
    const objects = new Map(scene.objects.map(node => [node.key, node]));
    const focus = objects.get(scene.focusKey);
    if (ids.has(scene.id) || objects.size !== scene.objects.length || focus?.role !== 'center' ||
        !focus.opacity || scene.objects.filter(node => node.role === 'center').length !== 1) fail();
    for (const node of scene.objects) {
      if (node.x < node.radius || node.x + node.radius > viewport.width ||
          node.y < node.radius || node.y + node.radius > viewport.height) fail();
    }
    const links = new Set();
    for (const link of scene.links) {
      if (links.has(link.key) || link.from === link.to || !objects.has(link.from) || !objects.has(link.to)) fail();
      links.add(link.key);
    }
    ids.set(scene.id, { focus: scene.focusKey, objects });
  }
  let end = 0;
  let scene = segments[0].fromScene;
  for (const segment of segments) {
    const from = ids.get(segment.fromScene);
    const to = ids.get(segment.toScene);
    if (!from || !to || segment.fromScene !== scene || segment.startMs !== end || segment.endMs <= end) fail();
    if (segment.primitive === 'hold' && from !== to) fail();
    if (segment.primitive === 'focus' && !from.objects.get(to.focus)?.opacity) fail();
    if (segment.primitive === 'reveal' && (from.focus !== to.focus ||
        [...from.objects.keys()].some(key => !to.objects.has(key)))) fail();
    end = segment.endMs;
    scene = segment.toScene;
  }
  if (end !== durationMs) fail();
  return value;
}

export function digest(text) {
  return digestBytes(new TextEncoder().encode(text));
}

export async function digestBytes(bytes) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
