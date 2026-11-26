import { canonical, digest, KoreographError, validateBundle, VERSION } from './contracts.mjs';

const adapters = new Map([
  ['traceability', { kind: 'traceability', field: 'nodes', select: traceability, titles: ['Traçabilité visible', 'Visible traceability'] }],
  ['tree', { kind: 'tree', field: 'nodes', select: hierarchy, titles: ['Vue arborescente', 'Tree view'] }],
  ['causal-feedback', { kind: 'causal-feedback', field: 'nodes', select: causality, titles: ['Relations visibles', 'Visible relationships'] }],
  ['timeline-lineage', { kind: 'timeline-lineage', field: 'items', label: item => item.entity?.label, titles: ['Extrait chronologique', 'Timeline excerpt'] }],
  ['dag-proof', { kind: 'dag', field: 'nodes', label: item => item.label, titles: ['Extrait du graphe', 'Graph excerpt'] }],
  ['flow-path', { kind: 'flow', field: 'nodes', label: item => item.label, titles: ['Éléments du parcours', 'Path items'] }],
  ['matrix-profile', { kind: 'matrix', field: 'rows', label: item => item.label, titles: ['Lignes de la matrice', 'Matrix rows'] }],
  ['state-flow', { kind: 'state-flow', field: 'records', label: item => item.entity?.label, titles: ['Éléments des états visibles', 'Visible state items'] }],
  ['multiscale-layer', { kind: 'multiscale', field: 'layers', label: item => item.label, titles: ['Couches visibles', 'Visible layers'] }],
  ['spatial', { kind: 'spatial', field: 'points', label: item => item.label || item.entity?.label, titles: ['Lieux visibles', 'Visible places'] }],
]);

export function supportsProjection(projection) {
  const adapter = adapters.get(projection?.rendererId);
  return Boolean(adapter && projection.schemaVersion === '1.0' && projection.derived === true &&
    projection.projectionKind === adapter.kind && (Array.isArray(projection[adapter.field]) ||
      (adapter.field === 'points' && Array.isArray(projection.places))) &&
    (!adapter.select || Array.isArray(projection.edges)));
}

function trustedAudit(audit) {
  return audit?.derived === true && audit.authoritative === false && audit.publicationAuthorized === false;
}

function reviewedAudit(audit) {
  return trustedAudit(audit) && ['qualified', 'partial'].includes(audit.status) && Array.isArray(audit.proofs);
}

function hasProof(audit, channel, ruleId, scope, assertionRefs) {
  return audit.proofs.some(proof => proof.channel === channel && proof.ruleId === ruleId &&
    proof.scope === scope && canonical(proof.assertionRefs) === canonical(assertionRefs));
}

function neutral(nodes, audit) {
  const status = trustedAudit(audit) && audit.status === 'refused' ? 'refused' : 'unqualified';
  return { nodes, status, assertionRefs: [] };
}

function traceability(projection, nodes) {
  const audit = projection.visualAudit;
  if (reviewedAudit(audit)) {
    for (const edge of projection.edges) {
      if (edge.kind !== 'conflict') continue;
      const a = nodes.get(edge.source);
      const b = nodes.get(edge.target);
      if (!a?.assertionRef || !b?.assertionRef || a.assertionRef === b.assertionRef) continue;
      const assertionRefs = [a.assertionRef, b.assertionRef].sort();
      if (hasProof(audit, 'opposition', 'conflictsWith', 'visible-assertion-conflict', assertionRefs)) {
        return { nodes: [a, b], status: audit.status, assertionRefs };
      }
    }
  }
  const traceKinds = new Set(['asserts', 'source', 'provenance', 'evidence']);
  const trace = projection.edges.find(edge => traceKinds.has(edge.kind) && nodes.has(edge.source) && nodes.has(edge.target));
  return neutral(trace ? [nodes.get(trace.source), nodes.get(trace.target)] : [...nodes.values()].slice(0, 2), audit);
}

function hierarchy(projection, nodes) {
  const audit = projection.visualAudit;
  const semantics = projection.hierarchySemantics;
  if (reviewedAudit(audit) && semantics?.status === 'reviewed-visible-hierarchy' &&
      semantics.derived === true && semantics.authoritative === false) {
    for (const edge of semantics.edges || []) {
      const parent = nodes.get(edge.source);
      const child = nodes.get(edge.target);
      const assertionRefs = [...new Set(edge.assertionRefs)].sort();
      if (parent && child && parent !== child && edge.relationId === semantics.relationId &&
          assertionRefs.length > 0 && assertionRefs.length <= 16 &&
          hasProof(audit, 'hierarchy', semantics.ruleId, semantics.scope, assertionRefs)) {
        return { nodes: [parent, child], status: audit.status, assertionRefs };
      }
    }
  }
  return neutral([...nodes.values()].slice(0, 2), audit);
}

function causality(projection, nodes) {
  const audit = projection.visualAudit;
  const semantics = projection.visualSemantics;
  if (reviewedAudit(audit) && semantics?.status === 'explicit-relations') {
    for (const edge of semantics.causalEdges || []) {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      const assertionRefs = [edge.assertionRef];
      const present = projection.edges.some(link => link.id === edge.assertionRef &&
        link.source === edge.source && link.target === edge.target && link.relationId === edge.relationId);
      if (present && source && target && source !== target && [-1, 0, 1].includes(edge.sign) &&
          hasProof(audit, 'causal', edge.relationId, edge.scope, assertionRefs)) {
        return { nodes: [source, target], status: audit.status, assertionRefs, sign: edge.sign };
      }
    }
  }
  return neutral([...nodes.values()].slice(0, 2), audit);
}

function neutralExcerpt(projection, adapter) {
  const rows = projection[adapter.field] || [];
  const candidates = rows.length || adapter.field !== 'points'
    ? rows.map(adapter.label)
    : projection.places.map(item => item.place?.label);
  const labels = [...new Set(candidates.filter(label => typeof label === 'string' && label.trim()))].slice(0, 2);
  return neutral(labels.map(label => ({ label })), projection.visualAudit);
}

export async function prepareProjection(projection, source, locale, revision) {
  if (!supportsProjection(projection)) throw new KoreographError('KOR_EXPORT_UNSUPPORTED');
  const adapter = adapters.get(projection.rendererId);
  const id = projection.rendererId + '/1';
  const view = adapter.select
    ? adapter.select(projection, new Map(projection.nodes.map(node => [node.id, node])))
    : neutralExcerpt(projection, adapter);
  if (!view.nodes.length) throw new KoreographError('KOR_TARGET_UNAVAILABLE');
  const specialization = { adapter: id, status: view.status, assertionRefs: view.assertionRefs, ...(view.sign === undefined ? {} : { sign: view.sign }) };
  const labels = view.nodes.map(node => [...(String(node.label || '').trim() || '…')].slice(0, 500).join(''));
  const partial = Boolean(projection.truncated || projection.visualAudit?.truncated ||
    specialization.status === 'partial' || (projection[adapter.field]?.length ?? projection.places?.length) > view.nodes.length ||
    projection.totalCandidates > view.nodes.length);
  const center = { key: 'trace-1', label: labels[0], kind: 'concept', role: 'center', x: 800, y: 450, radius: 48, opacity: 1 };
  const first = { id: 's1', focusKey: center.key, objects: [center], links: [], truncated: partial };
  const scenes = [first];
  const segments = [{ fromScene: 's1', toScene: 's1', primitive: 'hold', easing: 'linear', startMs: 0, endMs: 1200 }];
  if (view.nodes.length > 1) {
    const secondary = { key: 'trace-2', label: labels[1], kind: 'concept', role: 'satellite', x: 1190, y: 450, radius: 27, opacity: 1 };
    scenes.push({ ...first, id: 's2', objects: [center, secondary] });
    segments.push(
      { fromScene: 's1', toScene: 's2', primitive: 'reveal', easing: 'smoothstep', startMs: 1200, endMs: 2100 },
      { fromScene: 's2', toScene: 's2', primitive: 'hold', easing: 'linear', startMs: 2100, endMs: 4000 },
    );
  }
  const bundle = validateBundle({
    format: 'koreograph.bundle/0.1', title: adapter.titles[locale === 'en' ? 1 : 0],
    locale: locale === 'en' ? 'en' : 'fr', ['style']: 'didactic',
    provenance: { source, konstellationVersion: '1.0.0-rc.2', compilerVersion: VERSION, adapterVersion: id,
      derived: true, authoritative: false, publicationAuthorized: false },
    viewport: { width: 1600, height: 900, aspectRatio: '16:9' },
    scenes, segments, durationMs: segments.at(-1).endMs,
    warnings: partial ? ['SOURCE_TRUNCATED'] : [],
    specialization,
  });
  const manifest = {
    format: 'koreograph.reproducibility/0.1', source, revision: revision || null,
    snapshotDigests: [await digest(canonical({ labels, specialization, partial }))],
    bundleDigest: await digest(canonical(bundle)), adapter: id, renderer: VERSION, durationMs: bundle.durationMs,
  };
  return { bundle, manifest };
}
