import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server/index.mjs';
import { Engine } from '../server/engine.mjs';
import { loadPack } from '../server/pack.mjs';
import { loadConfig } from '../server/config.mjs';
import { validateBundle, validateScore, targetOf } from '../src/lib/koreograph/contracts.mjs';
import { prepare } from '../src/lib/koreograph/prepare.mjs';
import { frameAt, renderSvg } from '../src/lib/koreograph/frame.mjs';
import { exportArtifact } from '../src/lib/koreograph/exports.mjs';

const target = id => ({ focus: { kind: 'entity', id }, groupId: null });
const step = (action, id) => ({ action, target: target(id) });
const context = { datasetRef: 'demo:synthetic', registryRef: 'demo:registry', readerPolicyRef: 'demo:policy', executionProfileRef: 'demo:execution' };
const lensRef = 'demo:lens';
const source = { ...context, lensRef };
const score = (steps, overrides = {}) => ({
  format: 'koreograph.score/0.1', title: 'Koreograph', locale: 'fr', source, mode: 'script',
  presentation: { style: 'minimal', durationMs: 'auto', aspectRatio: '16:9', density: 3 },
  steps, ...overrides,
});
const dto = (id, neighbors) => ({
  schemaVersion: '0.1', ...target(id), context, center: { id, label: id, kind: 'entity' },
  satellites: neighbors.map((other, i) => ({ id: other, target: target(other), kind: 'entity', label: other, salience: { score: 10 - i } })),
  truncated: false,
});
const graph = { A: dto('A', ['B', 'C', 'D', 'E']), B: dto('B', ['A', 'C']), C: dto('C', ['A']), E: dto('E', ['B']) };
const read = {
  currentContext: () => ({ source, generation: 1 }),
  constellation: async ({ focus }, limit) => {
    if (!(focus.id in graph)) throw Object.assign(Error('internal details'), { status: 404 });
    const value = graph[focus.id];
    return { ...value, satellites: value.satellites.slice(0, limit), truncated: value.satellites.length > limit };
  },
};

test('fixture contract, reveal, visible follow, fixed holds, seek, repeatability and receipts', async () => {
  const input = score([step('focus', 'A'), { action: 'reveal', limit: 4 }, step('follow', 'E'), { action: 'hold', durationMs: 1500 }]);
  const a = await prepare(input, read);
  const b = await prepare(input, read);
  assert.deepEqual(a, b);
  const bundle = a.bundle;
  assert.equal(validateBundle(bundle), bundle);
  assert.deepEqual(bundle.segments.map(it => it.primitive), ['hold', 'reveal', 'focus', 'hold', 'hold']);
  assert.equal(bundle.segments.at(-1).endMs - bundle.segments.at(-1).startMs, 1500);
  const focus = bundle.segments[2];
  const half = frameAt(bundle, (focus.startMs + focus.endMs) / 2);
  const last = bundle.scenes.at(-1);
  assert.equal(half.objects.find(node => node.key === last.focusKey).x,
    (bundle.scenes[1].objects.find(node => node.key === last.focusKey).x + last.objects[0].x) / 2);
  assert.equal(frameAt(bundle, bundle.durationMs), last);
  assert.equal(frameAt(bundle, focus.startMs + 1, true), bundle.scenes[1]);
  assert.notEqual((await exportArtifact(a, 'svg', 0)).receipt.output.digest, (await exportArtifact(a, 'svg', bundle.durationMs)).receipt.output.digest);
  const svg = await exportArtifact(a, 'animated');
  assert.match(svg.data, /<set attributeName="visibility"/u);
  assert.doesNotMatch(svg.data, /<script/u);
});

test('invalid, hidden, context drift, cancellation and denied reads fail closed', async () => {
  assert.throws(() => validateScore({ ...score([step('focus', 'A')]), token: 'secret' }), { code: 'KOR_INVALID_SCORE' });
  for (const id of ['E', 'HIDDEN', 'unknown']) {
    await assert.rejects(prepare(score([step('focus', 'A'), step('follow', id)]), read), { code: 'KOR_TARGET_UNAVAILABLE', step: 2 });
  }
  let generation = 1;
  await assert.rejects(prepare(score([step('focus', 'A')]), {
    ...read,
    currentContext: () => ({ source, generation }),
    constellation: async (...args) => { generation++; return read.constellation(...args); },
  }), { code: 'KOR_CONTEXT_CHANGED' });
  await assert.rejects(prepare(score([step('focus', 'A')]), read, { signal: AbortSignal.abort() }), { code: 'KOR_CANCELLED' });
  await assert.rejects(prepare(score([step('focus', 'A')]), {
    ...read, constellation: async () => { throw Object.assign(Error('sensitive'), { status: 403 }); },
  }), { code: 'KOR_READ_REFUSED' });
});

test('Auto is deterministic, stops at a dead end, and can be replayed as a Script', async () => {
  const { steps, ...base } = score([]);
  for (const recipe of ['exploration', 'association']) {
    const input = { ...base, mode: 'auto', auto: { start: target('A'), recipe, maxHops: 6, seed: 123 } };
    const a = await prepare(input, read);
    assert.deepEqual(a, await prepare(input, read));
    assert.deepEqual(a.explicitScore.steps.map(entry => entry.target.focus.id), ['A', 'B', 'C']);
    assert.ok(a.bundle.warnings.includes('EARLY_STOP'));
    const explicit = await prepare(a.explicitScore, read);
    assert.deepEqual(explicit.bundle.scenes, a.bundle.scenes);
  }
});

test('exports escape content and validation detects inconsistent timelines', async () => {
  const input = score([step('focus', 'A')], { title: '</script><script>document.body.remove()</script>&' });
  const prepared = await prepare(input, read);
  const svg = renderSvg(prepared.bundle, frameAt(prepared.bundle, 0));
  assert.match(svg, /&lt;\/script&gt;/u);
  const html = await exportArtifact(prepared, 'html');
  assert.equal(html.data.match(/<script>/gu).length, 1);
  assert.match(html.data, /default-src 'none'/u);
  const broken = structuredClone(prepared.bundle);
  broken.segments[0].startMs = 1;
  assert.throws(() => validateBundle(broken), { code: 'KOR_INVALID_BUNDLE' });
});

test('live reader policy removes hidden labels and rejects hidden targets before rendering', async t => {
  const pack = loadPack();
  const hidden = { id: 'koreograph-hidden', type: pack.entities[0].type, label: 'KOREOGRAPH_HIDDEN_WITNESS' };
  pack.entities.push(hidden);
  const sample = pack.assertions.find(item => typeof item.value === 'string' && pack.entities.some(entity => entity.id === item.value));
  assert.ok(sample);
  const real = pack.entities.find(entity => entity.id === sample.value);
  hidden.type = real.type;
  pack.assertions.push({ ...sample, id: 'koreograph-hidden-assertion', value: hidden.id, status: 'disputed' });
  pack.policies = [{ ...pack.policies[0], statuses: ['sourced'] }];
  const engine = new Engine(pack);
  const server = createServer({ engine, config: loadConfig({ KONSTELLATION_ENABLE_KOREOGRAPH: 'true' }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port;
  const boot = await (await fetch(url + '/api/bootstrap')).json();
  assert.equal(boot.koreographAvailable, true);
  const lens = boot.lenses.find(item => item.rootType === pack.entities.find(entity => entity.id === sample.subject).type);
  const source = { ...boot.context, lensRef: lens.id };
  const adapter = {
    currentContext: () => ({ source }),
    async constellation(target, limit, signal) {
      const res = await fetch(url + '/api/constellation', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: boot.context, lensRef: lens.id, ...target, limit }), signal,
      });
      if (!res.ok) throw Object.assign(Error('api error'), { status: res.status });
      return res.json();
    },
  };
  const first = await adapter.constellation(target(sample.subject), 3);
  assert(first.satellites.length);
  const next = { action: 'follow', target: targetOf(first.satellites[0].target) };
  const prepared = await prepare(score([step('focus', sample.subject), next], { source }), adapter);
  for (const time of [0, 1500, prepared.bundle.durationMs]) {
    assert.doesNotMatch(renderSvg(prepared.bundle, frameAt(prepared.bundle, time)), /KOREOGRAPH_HIDDEN_WITNESS/u);
  }
  assert.doesNotMatch((await exportArtifact(prepared, 'html')).data, /KOREOGRAPH_HIDDEN_WITNESS/u);
  for (const id of [hidden.id, 'koreograph-unknown']) {
    await assert.rejects(prepare(score([step('focus', id)], { source }), adapter), { code: 'KOR_TARGET_UNAVAILABLE' });
  }
  assert.equal(loadConfig({ KONSTELLATION_ENABLE_KOREOGRAPH: 'true', HOST: '0.0.0.0' }).koreographEnabled, false);
  const example = JSON.parse(await readFile(new URL('../docs/koreograph/examples/exploration.bundle.json', import.meta.url)));
  assert.equal(validateBundle(example), example);
});

test('the traceability adapter preserves exact visible witnesses and falls back for unrelated proof', async () => {
  const { prepareProjection } = await import('../src/lib/koreograph/specialized.mjs');
  const input = {
    schemaVersion: '1.0', derived: true, rendererId: 'traceability', projectionKind: 'traceability',
    nodes: [
      { id: 'a', assertionRef: 'ref-a', label: 'Source A' },
      { id: 'b', assertionRef: 'ref-b', label: 'Source B' },
    ],
    edges: [{ source: 'a', target: 'b', kind: 'conflict' }],
    visualAudit: {
      derived: true, authoritative: false, publicationAuthorized: false, status: 'partial', truncated: true,
      proofs: [{ channel: 'opposition', ruleId: 'conflictsWith', scope: 'visible-assertion-conflict', assertionRefs: ['ref-a', 'ref-b'] }],
    },
  };
  const qualified = await prepareProjection(input, source, 'fr');
  assert.deepEqual(qualified.bundle.specialization.assertionRefs, ['ref-a', 'ref-b']);
  assert.equal(qualified.bundle.specialization.status, 'partial');
  assert.match(renderSvg(qualified.bundle, frameAt(qualified.bundle, 4000)), /Désaccord attesté/u);
  input.visualAudit.proofs[0].assertionRefs[1] = 'absent';
  const neutral = await prepareProjection(input, source, 'fr');
  assert.deepEqual(neutral.bundle.specialization.assertionRefs, []);
  assert.doesNotMatch((await exportArtifact(neutral, 'html')).data.match(/const trace[^]*?;|$|/u)[0], /ref-b/u);
  assert.doesNotMatch(renderSvg(neutral.bundle, frameAt(neutral.bundle, 4000)), /Désaccord attesté/u);
  await assert.rejects(prepareProjection({ ...input, rendererId: 'unknown' }, source, 'fr'), { code: 'KOR_EXPORT_UNSUPPORTED' });
});

test('hierarchy and causal motion require the matching edge, reviewed rule and scoped witness', async () => {
  const { prepareProjection } = await import('../src/lib/koreograph/specialized.mjs');
  const edge = { id: 'witness', source: 'p', target: 'c', relationId: 'reviewed-relation' };
  const publicNodes = [{ id: 'p', label: 'Parent' }, { id: 'c', label: 'Child' }];
  const scope = 'visible-test';
  for (const [kind, channel] of [['tree', 'hierarchy'], ['causal-feedback', 'causal']]) {
    const input = {
      schemaVersion: '1.0', derived: true, rendererId: kind, projectionKind: kind, nodes: publicNodes, edges: [edge],
      visualAudit: {
        derived: true, authoritative: false, publicationAuthorized: false, status: 'qualified',
        proofs: [{ channel, ruleId: edge.relationId, scope, assertionRefs: [edge.id] }],
      },
      hierarchySemantics: {
        derived: true, authoritative: false, status: 'reviewed-visible-hierarchy', ruleId: edge.relationId,
        relationId: edge.relationId, scope, edges: [{ ...edge, assertionRefs: [edge.id] }],
      },
      visualSemantics: {
        status: 'explicit-relations', causalEdges: [{ ...edge, assertionRef: edge.id, scope, sign: -1 }],
      },
    };
    const result = await prepareProjection(input, source, 'fr');
    assert.deepEqual(result.bundle.specialization.assertionRefs, [edge.id]);
    const svg = renderSvg(result.bundle, frameAt(result.bundle, 4000));
    assert.match(svg, kind === 'tree' ? /Hiérarchie attestée/u : /Influence attestée \(−\)/u);
    assert.match(svg, /<path d="/u);
    input.visualAudit.proofs[0].scope = 'different-scope';
    const neutral = await prepareProjection(input, source, 'fr');
    assert.equal(neutral.bundle.specialization.status, 'unqualified');
    assert.doesNotMatch(renderSvg(neutral.bundle, frameAt(neutral.bundle, 4000)), /<path d="/u);
  }
});

test('the remaining renderer adapters present visible excerpts without semantic claims', async () => {
  const { prepareProjection } = await import('../src/lib/koreograph/specialized.mjs');
  const visible = { label: 'Visible' };
  const cases = [
    ['timeline-lineage', 'timeline-lineage', 'items', { entity: visible }],
    ['dag-proof', 'dag', 'nodes', visible],
    ['flow-path', 'flow', 'nodes', visible],
    ['matrix-profile', 'matrix', 'rows', visible],
    ['state-flow', 'state-flow', 'records', { entity: visible }],
    ['multiscale-layer', 'multiscale', 'layers', visible],
    ['spatial', 'spatial', 'places', { place: visible }],
  ];
  for (const [rendererId, projectionKind, field, node] of cases) {
    const result = await prepareProjection({ schemaVersion: '1.0', derived: true, rendererId, projectionKind,
      [field]: [node], truncated: false, totalCandidates: 10 }, source, 'fr');
    const svg = renderSvg(result.bundle, frameAt(result.bundle, 0));
    assert.match(svg, />Visible<\/title>/u);
    assert.equal(result.bundle.specialization.status, 'unqualified');
    assert.doesNotMatch(svg, /<path d="/u);
    assert(result.bundle.scenes[0].truncated);
  }
});
