import { layoutConstellation } from '../constellation/layout.js';
import { canonical, digest, KoreographError, targetKey, targetOf, validateBundle, validateScore, VERSION } from './contracts.mjs';

const dimensions = { '16:9': [1600, 900], '9:16': [900, 1600], '1:1': [1000, 1000] };
const ROUND = 1000;
const round = value => Math.round(value * ROUND) / ROUND;
const knownContext = ['datasetRef', 'registryRef', 'readerPolicyRef', 'executionProfileRef'];
const allowedKinds = new Set(['entity', 'source', 'concept', 'value', 'group']);

function ranked(satellites, seen, recipe, seed) {
  const distinct = new Map();
  for (const node of satellites) {
    const key = targetKey(node.target);
    if (!seen.has(key) && (!distinct.has(key) || node.score > distinct.get(key).score)) distinct.set(key, node);
  }
  const scores = [...distinct.values()].map(node => node.score).filter(Number.isFinite);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const families = new Set([...seen.values()].map(target => target.focus.kind));
  const weights = recipe === 'association' ? [0.65, 0.15, 0.20] : [0.40, 0.40, 0.20];
  function tie(key) {
    if (!seed) return key;
    let hash = seed;
    for (const char of key) hash = Math.imul(hash ^ char.codePointAt(0), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0') + key;
  }
  return [...distinct].map(([key, node]) => {
    const salience = hi > lo && Number.isFinite(node.score) ? (node.score - lo) / (hi - lo) : 0.5;
    const novel = !families.has(node.target.focus.kind);
    const coherent = node.target.focus.kind === 'entity' && !node.target.groupId ? 1 : 0.5;
    return { node, rank: weights[0] * salience + weights[1] * Number(novel) + weights[2] * coherent, tie: tie(key) };
  }).sort((a, b) => b.rank - a.rank || (a.tie < b.tie ? -1 : a.tie > b.tie ? 1 : 0));
}

function snapshotOf(dto) {
  const copyNode = node => ({
    label: node.label,
    kind: allowedKinds.has(node.kind) ? node.kind : 'entity',
  });
  return {
    target: targetOf(dto),
    center: copyNode(dto.center),
    satellites: dto.satellites.slice(0, 10).map(node => ({
      ...copyNode(node), id: node.id, target: targetOf(node.target), score: Number.isFinite(node.salience?.score) ? node.salience.score : null,
    })),
    truncated: dto.truncated || dto.satellites.length > 10,
  };
}

function compile(score, actions, warnings, applicationVersion) {
  const { aspectRatio, durationMs, density } = score.presentation;
  const [width, height] = dimensions[aspectRatio];
  const scenes = [];
  const segments = [];
  const keys = new Map();
  function objectKey(key) {
    if (!keys.has(key)) keys.set(key, 'node-' + (keys.size + 1));
    return keys.get(key);
  }
  function scene(snapshot, limit, previous) {
    const focusCanonical = targetKey(snapshot.target);
    const focusKey = objectKey(focusCanonical);
    const center = {
      ...snapshot.center, key: focusKey, role: 'center', x: width / 2, y: height / 2, radius: 48, opacity: 1,
    };
    const proposed = snapshot.satellites.slice(0, limit);
    const counts = new Map();
    for (const node of snapshot.satellites) {
      const key = targetKey(node.target);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const neighbors = proposed.map((node, index) => {
      const identity = targetKey(node.target);
      const unique = counts.get(identity) === 1 && identity !== focusCanonical;
      const key = unique ? identity : canonical([focusCanonical, identity, node.id, index]);
      return { label: node.label, kind: node.kind, key: objectKey(key) };
    });
    const slots = layoutConstellation(neighbors, width, height);
    const remaining = new Set(slots);
    const prior = new Map(previous?.objects.map(node => [node.key, node]));
    const assigned = new Map();
    for (const node of neighbors) {
      const old = prior.get(node.key);
      if (!old) continue;
      let best;
      let distance = Infinity;
      for (const slot of remaining) {
        const cost = (slot.x - old.x) ** 2 + (slot.y - old.y) ** 2;
        if (cost < distance) { best = slot; distance = cost; }
      }
      assigned.set(node.key, best);
      remaining.delete(best);
    }
    const vacant = remaining.values();
    const objects = [center, ...neighbors.map(node => {
      const slot = assigned.get(node.key) || vacant.next().value;
      return { ...node, role: 'satellite', x: round(slot.x), y: round(slot.y), radius: 27, opacity: 1 };
    })];
    if (snapshot.truncated) warnings.add('SOURCE_TRUNCATED');
    if (proposed.length < snapshot.satellites.length) warnings.add('PRESENTATION_TRUNCATED');
    const entry = {
      id: 's' + (scenes.length + 1), focusKey, objects,
      links: objects.slice(1).map(node => ({ key: focusKey + '/' + node.key, from: focusKey, to: node.key, kind: 'navigation' })),
      truncated: snapshot.truncated || proposed.length < snapshot.satellites.length,
    };
    scenes.push(entry);
    return entry;
  }
  let current = scene(actions[0].snapshot, density);
  const add = (from, to, primitive, preferred, minimum = preferred) =>
    segments.push({ fromScene: from.id, toScene: to.id, primitive, easing: primitive === 'hold' ? 'linear' : 'smoothstep', preferred, minimum });
  add(current, current, 'hold', 1200, 900);
  for (const item of actions.slice(1)) {
    if (item.action === 'hold') { add(current, current, 'hold', item.durationMs); continue; }
    const next = scene(item.snapshot, item.limit, current);
    const primitive = item.action === 'reveal' ? 'reveal' :
      current.objects.some(node => node.key === next.focusKey) ? 'focus' : 'fade';
    if (primitive === 'fade') warnings.add('NEUTRAL_FADE');
    add(current, next, primitive, primitive === 'reveal' ? 900 : 1400, 400);
    current = next;
    if (item.action === 'follow') {
      const words = next.objects.reduce((total, node) => total + node.label.trim().split(/\s+/u).length, 0);
      const dwell = Math.min(4200, 1000 + 45 * words + 100 * (next.objects.length - 1));
      add(current, current, 'hold', dwell, 900);
    }
  }
  const initial = segments.reduce((sum, item) => sum + item.preferred, 0);
  const minimum = segments.reduce((sum, item) => sum + item.minimum, 0);
  const desired = durationMs === 'auto' ? initial : durationMs;
  if (desired < minimum || desired > 120000) throw new KoreographError('KOR_DURATION');
  const flexible = segments.filter(item => item.minimum < item.preferred);
  if (desired > minimum && !flexible.length) throw new KoreographError('KOR_DURATION');
  let elapsed = 0;
  let weight = 0;
  let distributed = 0;
  const timeline = segments.map(({ preferred, minimum: floor, ...item }) => {
    weight += preferred - floor;
    const next = initial === minimum ? 0 : Math.round((desired - minimum) * weight / (initial - minimum));
    const startMs = elapsed;
    elapsed += floor + next - distributed;
    distributed = next;
    return { ...item, startMs, endMs: elapsed };
  });
  return validateBundle({
    format: 'koreograph.bundle/0.1', title: score.title, locale: score.locale, ['style']: score.presentation.style,
    provenance: {
      source: score.source, konstellationVersion: applicationVersion, compilerVersion: VERSION, adapterVersion: VERSION,
      derived: true, authoritative: false, publicationAuthorized: false,
    },
    viewport: { width, height, aspectRatio }, durationMs: elapsed, scenes, segments: timeline, warnings: [...warnings],
  });
}

export async function prepare(input, reader, { signal, applicationVersion = '1.0.0-rc.2' } = {}) {
  const score = validateScore(input);
  const scope = reader.currentContext();
  const guard = () => {
    if (signal?.aborted) throw new KoreographError('KOR_CANCELLED');
    if (canonical(reader.currentContext()) !== canonical(scope)) throw new KoreographError('KOR_CONTEXT_CHANGED');
  };
  if (!scope || canonical(score.source) !== canonical(scope.source)) throw new KoreographError('KOR_CONTEXT_CHANGED');
  const deadline = AbortSignal.timeout(15_000);
  const snapshots = new Map();
  let requests = 0;
  const actions = [];
  const warnings = new Set();
  const density = score.presentation.density;
  const requestLimit = Math.max(density, ...(score.steps || []).filter(step => step.action === 'reveal').map(step => step.limit));

  async function resolve(target, step) {
    guard();
    const key = targetKey(target);
    if (snapshots.has(key)) return snapshots.get(key);
    if (deadline.aborted) throw new KoreographError('KOR_PREPARE_TIMEOUT', step);
    while (++requests <= 24) {
      const perRequest = AbortSignal.timeout(5_000);
      const combined = AbortSignal.any([deadline, perRequest, ...(signal ? [signal] : [])]);
      let dto;
      try {
        dto = await reader.constellation(target, requestLimit, combined);
      } catch (error) {
        guard();
        if (deadline.aborted || perRequest.aborted) throw new KoreographError('KOR_PREPARE_TIMEOUT', step);
        if ([502, 503, 504].includes(error.status) && requests === 1) continue;
        throw new KoreographError([401, 403].includes(error.status) ? 'KOR_READ_REFUSED' : 'KOR_TARGET_UNAVAILABLE', step);
      }
      guard();
      if (combined.aborted) throw new KoreographError('KOR_PREPARE_TIMEOUT', step);
      if (!dto || dto.schemaVersion !== '0.1' || !dto.center || !Array.isArray(dto.satellites) ||
          targetKey(dto) !== key || knownContext.some(field => dto.context?.[field] !== score.source[field])) {
        throw new KoreographError('KOR_CONTEXT_CHANGED', step);
      }
      const snapshot = snapshotOf(dto);
      snapshots.set(key, snapshot);
      return snapshot;
    }
    throw new KoreographError('KOR_BUDGET_EXCEEDED', step);
  }

  const initial = score.mode === 'auto' ? score.auto.start : score.steps[0].target;
  let current = await resolve(initial, 1);
  let limit = density;
  actions.push({ action: 'focus', snapshot: current, limit });
  const route = [{ action: 'focus', target: initial }];
  if (score.mode === 'auto') {
    const seen = new Map([[targetKey(initial), initial]]);
    for (let index = 0; index < score.auto.maxHops; index++) {
      let next;
      for (const { node } of ranked(current.satellites.slice(0, limit), seen, score.auto.recipe, score.auto.seed)) {
        try {
          next = await resolve(node.target, index + 2);
        } catch (error) {
          if (error.code !== 'KOR_TARGET_UNAVAILABLE') throw error;
          continue;
        }
        route.push({ action: 'follow', target: node.target });
        seen.set(targetKey(node.target), node.target);
        break;
      }
      if (!next) { warnings.add('EARLY_STOP'); break; }
      current = next;
      actions.push({ action: 'follow', snapshot: current, limit });
    }
  } else {
    for (const [index, step] of score.steps.slice(1).entries()) {
      if (step.action === 'hold') {
        actions.push(step);
      } else if (step.action === 'reveal') {
        const previous = limit;
        limit = Math.max(limit, step.limit);
        if (Math.min(limit, current.satellites.length) > Math.min(previous, current.satellites.length)) {
          actions.push({ action: 'reveal', snapshot: current, limit });
        }
      } else {
        if (!current.satellites.slice(0, limit).some(node => targetKey(node.target) === targetKey(step.target))) {
          throw new KoreographError('KOR_TARGET_UNAVAILABLE', index + 2);
        }
        current = await resolve(step.target, index + 2);
        limit = density;
        actions.push({ action: 'follow', snapshot: current, limit });
      }
    }
  }
  const bundle = compile(score, actions, warnings, applicationVersion);
  const { auto: _auto, ...explicit } = score;
  const explicitScore = score.mode === 'auto' ? validateScore({ ...explicit, mode: 'script', steps: route }) : score;
  const manifest = {
    format: 'koreograph.reproducibility/0.1',
    source: score.source,
    revision: scope.revision || null,
    scoreDigest: await digest(canonical(score)),
    snapshotDigests: await Promise.all([...snapshots.values()].map(snapshot => digest(canonical(snapshot)))),
    bundleDigest: await digest(canonical(bundle)),
    compiler: VERSION, renderer: VERSION, application: applicationVersion,
    durationMs: bundle.durationMs, viewport: bundle.viewport, warnings: bundle.warnings,
  };
  guard();
  return { bundle, score, explicitScore, manifest };
}
