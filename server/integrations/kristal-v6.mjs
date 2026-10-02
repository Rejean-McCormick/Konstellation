import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, ajv, fail } from '../contracts.mjs';
import { readJson, hash, validatePack } from '../pack.mjs';

const schema = readJson(path.join(ROOT, 'contracts/upstream/kristal-state-v6.schema.json'));
const validateState = ajv.compile(schema);

const SUPPORTED_STATUS = new Set([
  'hypothesis', 'claimed', 'sourced', 'disputed', 'reviewed', 'validated',
  'rejected', 'retracted', 'superseded',
]);

const safeId = (value) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_.:-]*$/.test(value);
const sha = (value) => createHash('sha256').update(String(value)).digest('hex');

export function canonicalizeV6(value) {
  if (value === null || ['boolean', 'string', 'number'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value))
      fail('INVALID_KRISTAL_STATE', 'Nombre non fini interdit par le profil JCS v6.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalizeV6).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalizeV6(value[key])).join(',') + '}';
  }
  fail('INVALID_KRISTAL_STATE', `Valeur JSON non prise en charge: ${typeof value}.`);
}

export function kristalV6Identity(state) {
  const target = structuredClone(state);
  delete target.state_id;
  delete target.content_hash;
  delete target.signatures;
  const canonical = canonicalizeV6(target);
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return {
    canonicalizationProfile: 'kristal.v6:jcs-rfc8785',
    sha256: digest,
    stateId: `sha256:${digest}`,
  };
}

export function verifyKristalV6State(state, { requireIdentity = false } = {}) {
  if (!validateState(state))
    fail('INVALID_KRISTAL_STATE', ajv.errorsText(validateState.errors));
  const identity = kristalV6Identity(state);
  if (state.state_id && state.state_id !== identity.stateId)
    fail('INTEGRITY_MISMATCH', 'Kristal v6 state_id ne correspond pas au contenu canonique.');
  if (state.content_hash && (state.content_hash.alg !== 'sha256' || state.content_hash.value !== identity.sha256))
    fail('INTEGRITY_MISMATCH', 'Kristal v6 content_hash ne correspond pas au contenu canonique.');
  if (requireIdentity && (!state.state_id || !state.content_hash))
    fail('INTEGRITY_MISMATCH', 'Identité canonique v6 requise mais absente.');
  return identity;
}

function statementRef(value) {
  if (!value || typeof value !== 'object') return null;
  return typeof value.id === 'string' ? value.id : null;
}

function displayLabel(ref) {
  const tail = String(ref).split(/[\/#:]/).filter(Boolean).at(-1) || String(ref);
  return tail.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()).slice(0, 300);
}

function entityId(ref) {
  return `item:${sha(ref).slice(0, 24)}`;
}

function predicateId(predicate, kind) {
  const raw = typeof predicate === 'string' ? predicate : JSON.stringify(predicate);
  const base = safeId(raw) ? raw : `rel:${sha(raw).slice(0, 24)}`;
  return `${base}:${kind}`;
}

function predicateLabel(predicate) {
  const raw = typeof predicate === 'string' ? predicate : JSON.stringify(predicate);
  const text = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_:./-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Relation';
}

function objectProjection(value) {
  if (!value || typeof value !== 'object') return { supported: false, reason: 'statement object absent' };
  if (typeof value.id === 'string') return { supported: true, kind: 'entity', value: entityId(value.id), sourceRef: value.id };
  if (!('value' in value)) return { supported: false, reason: `value absent pour kind=${String(value.kind)}` };
  if (typeof value.value === 'string') return { supported: true, kind: 'string', value: value.value };
  if (Number.isSafeInteger(value.value)) return { supported: true, kind: 'integer', value: value.value };
  return { supported: false, reason: `kind=${String(value.kind)} / valeur non projetable sans perte` };
}

function sourceEntry(ref) {
  if (typeof ref === 'string') {
    return { key: ref, entry: { id: `source:${sha(ref).slice(0, 24)}`, title: ref.slice(0, 300), upstream: ref } };
  }
  if (ref && typeof ref === 'object') {
    const key = ref.source_id || ref.source_url || ref.id || ref.iri || ref.content_hash?.value || hash(ref);
    return {
      key,
      entry: {
        id: `source:${sha(key).slice(0, 24)}`,
        title: String(ref.title || ref.label || key).slice(0, 300),
        ...(ref.source_url ? { url: ref.source_url } : {}),
        upstream: ref,
      },
    };
  }
  return null;
}

function uniqueRefs(refs, sourceIdFor, mapAssertionRef) {
  const out = [];
  for (const ref of refs || []) {
    const mappedSource = sourceIdFor(ref);
    const rawId = typeof ref === 'string' ? ref : ref?.assertion_id || ref?.id || null;
    const mappedAssertion = rawId ? mapAssertionRef(rawId) : null;
    const value = mappedSource || mappedAssertion;
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

function defaultPolicy(state) {
  return {
    id: 'kristal-v6-local-structural-reader',
    label: 'Lecture structurelle locale v6',
    description: 'Politique locale de projection. Elle ne transforme ni validation, ni autorité, ni actionabilité en permission.',
    profile: 'konstellation.normalized-reader.v1',
    showLabels: true,
    statuses: ['*'],
    certainties: ['*'],
    validationStatuses: ['*'],
    validatedAs: ['*'],
    authorities: ['*'],
    requireSources: false,
  };
}

export function summarizeKristalV6Structure(state) {
  const summary = {
    assertionCount: 0,
    recordRoles: {},
    actionabilityModes: {},
    coordinateAxes: {},
    valuationSemantics: {},
    valuationDimensions: {},
    assertionStatuses: {},
    statementKinds: {},
    conflicts: 0,
    supersedes: 0,
    lineage: 0,
    evidenceRefs: 0,
    provenanceRefs: 0,
  };
  for (const assertion of state.assertions || []) {
    summary.assertionCount += 1;
    const inc = (obj, key) => { if (key) obj[key] = (obj[key] || 0) + 1; };
    inc(summary.recordRoles, assertion.record_role);
    inc(summary.actionabilityModes, assertion.actionability?.mode);
    inc(summary.assertionStatuses, assertion.assertion_status || 'unspecified');
    inc(summary.statementKinds, assertion.statement?.subject?.kind);
    inc(summary.statementKinds, assertion.statement?.object?.kind);
    const coords = Array.isArray(assertion.coordinates)
      ? assertion.coordinates
      : assertion.coordinates && typeof assertion.coordinates === 'object'
        ? Object.entries(assertion.coordinates).map(([axis, value]) => ({ axis, value }))
        : [];
    for (const coordinate of coords) inc(summary.coordinateAxes, coordinate.axis);
    for (const valuation of assertion.valuations || []) {
      inc(summary.valuationSemantics, valuation.value_semantics);
      inc(summary.valuationDimensions, valuation.dimension);
    }
    summary.conflicts += assertion.conflicts_with?.length || 0;
    summary.supersedes += assertion.supersedes?.length || 0;
    if (assertion.lineage && Object.keys(assertion.lineage).length) summary.lineage += 1;
    summary.evidenceRefs += assertion.evidence_refs?.length || 0;
    summary.provenanceRefs += assertion.provenance_refs?.length || 0;
  }
  return summary;
}

function navigationHintsFromState(state, config) {
  const extension = state.extensions?.konstellation?.navigation;
  const raw = config.navigationHints || (extension && typeof extension === 'object' ? extension : null);
  if (!raw) return null;
  return {
    ...raw,
    schemaVersion: '1.0',
    affordances: { ...(raw.capabilities || {}), ...(raw.affordances || {}) },
    relationAffordances: { ...(raw.relationCapabilities || {}), ...(raw.relationAffordances || {}) },
    entityTypes: Object.fromEntries(Object.entries(raw.entityTypes || {}).map(([type, profile]) => [type, {
      ...profile,
      affordances: { ...(profile.capabilities || {}), ...(profile.affordances || {}) },
      relationAffordances: { ...(profile.relationCapabilities || {}), ...(profile.relationAffordances || {}) },
      capabilities: undefined,
      relationCapabilities: undefined,
    }])),
    capabilities: undefined,
    relationCapabilities: undefined,
  };
}

export function importKristalV6State(state, config = {}, inputSha256 = 'not-provided') {
  const identity = verifyKristalV6State(state, { requireIdentity: config.requireIdentity === true });
  const sourceMap = new Map();
  for (const ref of state.source_refs || []) {
    const item = sourceEntry(ref);
    if (item) sourceMap.set(item.key, item.entry);
  }
  const sourceIdFor = (ref) => {
    const item = sourceEntry(ref);
    if (!item || !sourceMap.has(item.key)) return null;
    return sourceMap.get(item.key).id;
  };

  const refs = new Set();
  for (const assertion of state.assertions || []) {
    const subjectRef = statementRef(assertion.statement?.subject);
    const objectRef = statementRef(assertion.statement?.object);
    if (subjectRef) refs.add(subjectRef);
    if (objectRef) refs.add(objectRef);
  }
  const entities = [...refs].sort().map((ref) => ({
    id: entityId(ref),
    type: 'item',
    label: config.entityLabels?.[ref] || displayLabel(ref),
    upstreamRef: ref,
  }));

  const relationMap = new Map();
  const assertions = [];
  const losses = [];
  const normalizedAssertionIds = new Map((state.assertions || []).map((upstream, index) => {
    const raw = upstream.assertion_id || `${identity.stateId}:${index}`;
    return [String(raw), safeId(upstream.assertion_id) ? upstream.assertion_id : `assertion:${sha(raw).slice(0, 24)}`];
  }));
  const mapAssertionRef = (ref) => normalizedAssertionIds.get(String(ref)) || null;
  let generatedAssertion = 0;
  for (const [index, upstream] of (state.assertions || []).entries()) {
    const subjectRef = statementRef(upstream.statement?.subject);
    if (!subjectRef) {
      losses.push({ index, assertionId: upstream.assertion_id || null, reason: 'subject sans identifiant; assertion non projetée' });
      continue;
    }
    const object = objectProjection(upstream.statement?.object);
    if (!object.supported) {
      losses.push({ index, assertionId: upstream.assertion_id || null, reason: object.reason });
      continue;
    }
    const kind = object.kind;
    const relationId = predicateId(upstream.statement?.predicate, kind);
    if (!relationMap.has(relationId)) {
      relationMap.set(relationId, {
        id: relationId,
        label: { fr: predicateLabel(upstream.statement?.predicate), en: predicateLabel(upstream.statement?.predicate) },
        domain: ['item'],
        range: kind === 'entity' ? 'item' : kind,
        valueKind: kind,
        operators: kind === 'entity' || kind === 'string' || kind === 'integer'
          ? ['exists', 'missing_in_view', 'in', 'none_of']
          : ['exists', 'missing_in_view'],
      });
    }
    const evidenceRefs = (upstream.evidence_refs || []).map(sourceIdFor).filter(Boolean);
    const status = SUPPORTED_STATUS.has(upstream.assertion_status) ? upstream.assertion_status : 'unspecified';
    const applicability = { ...(state.applicability || {}), ...(upstream.applicability || {}) };
    assertions.push({
      id: normalizedAssertionIds.get(String(upstream.assertion_id || `${identity.stateId}:${index}`)),
      subject: entityId(subjectRef),
      relation: relationId,
      value: object.value,
      status,
      // v6 has typed valuations. These sentinel labels are deliberately not derived
      // from valuations and therefore cannot be mistaken for a collapsed certainty.
      certainty: 'v6:typed-valuations',
      validationStatus: 'v6:not-inferred',
      validatedAs: 'v6:not-inferred',
      authority: 'v6:not-inferred',
      scope: { domain: applicability.domain || 'domain:unspecified', ...applicability },
      sourceRefs: [...new Set(evidenceRefs)],
      conflictsWith: (upstream.conflicts_with || []).map(mapAssertionRef).filter(Boolean),
      supersedes: (upstream.supersedes || []).map(mapAssertionRef).filter(Boolean),
      lineage: upstream.lineage || null,
      recordRole: upstream.record_role || null,
      actionability: upstream.actionability || null,
      valuations: upstream.valuations || [],
      coordinates: upstream.coordinates || [],
      applicability,
      evidenceRefs: uniqueRefs(upstream.evidence_refs || [], sourceIdFor, mapAssertionRef),
      provenanceRefs: uniqueRefs(upstream.provenance_refs || [], sourceIdFor, mapAssertionRef),
      upstreamContractRef: schema.$id,
      upstreamPayload: upstream,
      projectionKind: 'kristal-v6-derived-query-record',
    });
    generatedAssertion += 1;
  }

  if (!relationMap.size) {
    relationMap.set('structural:identity:string', {
      id: 'structural:identity:string',
      label: { fr: 'Identité', en: 'Identity' },
      domain: ['item'],
      range: 'string',
      valueKind: 'string',
      operators: ['exists', 'missing_in_view', 'in', 'none_of'],
    });
    for (const entity of entities) {
      assertions.push({
        id: `assertion:${sha(entity.id + ':identity').slice(0, 24)}`,
        subject: entity.id,
        relation: 'structural:identity:string',
        value: entity.upstreamRef,
        status: 'unspecified',
        certainty: 'v6:typed-valuations',
        validationStatus: 'v6:not-inferred',
        validatedAs: 'v6:not-inferred',
        authority: 'v6:not-inferred',
        scope: { domain: state.applicability?.domain || 'domain:unspecified' },
        sourceRefs: [],
        projectionKind: 'konstellation-structural-fallback',
      });
    }
  }

  const registry = {
    schemaVersion: '0.2',
    registryRef: `kristal-v6:${identity.stateId}`,
    entityTypes: ['item'],
    relations: [...relationMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const hints = navigationHintsFromState(state, config);
  const summary = summarizeKristalV6Structure(state);
  const pack = {
    schemaVersion: '0.3',
    title: typeof config.title === 'string' ? config.title : (typeof state.extensions?.title === 'string' ? state.extensions.title : 'Kristal v6'),
    description: typeof config.description === 'string' ? config.description : 'Projection de lecture dérivée d’un kristal_state v6 canonique.',
    synthetic: config.synthetic === true,
    registry,
    entities,
    assertions,
    sources: [...sourceMap.values()],
    policies: config.policies?.length ? config.policies : [defaultPolicy(state)],
    ...(hints ? { navigationHints: hints } : {}),
    integration: {
      adapter: 'kristal-v6-state:1.0.0',
      metadata: {
        canonicalArtifact: 'kristal_state',
        schemaVersion: state.schema_version,
        artifactStatus: state.artifact_status,
        stateId: state.state_id || identity.stateId,
        identityVerified: Boolean(state.state_id || state.content_hash),
        derivedView: true,
        structuralSummary: summary,
        provenanceCount: Array.isArray(state.provenance) ? state.provenance.length : 0,
      },
    },
    importRecord: {
      inputSha256,
      stateId: state.state_id || identity.stateId,
      artifactStatus: state.artifact_status,
      importer: 'konstellation-kristal-v6:1.0.0',
      canonicalizationProfile: identity.canonicalizationProfile,
      identityVerified: Boolean(state.state_id || state.content_hash),
      projectedAssertions: generatedAssertion,
      unprojectedAssertions: losses.length,
      losses,
      // Deliberately a derived/query surface. Canonical truth remains the input state.
      canonicalTruth: 'upstream-kristal-state',
      structuralSummary: summary,
    },
  };
  return validatePack(pack);
}

export function isKristalV6State(value) {
  return Boolean(value && value.schema_version === '6.0' && value.artifact_type === 'kristal_state');
}
