import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { validate, fail } from './contracts.mjs';
import { validatePack, compare, hash, canonical, canRead } from './pack.mjs';
import { projectConstellation } from './navigation/projector.mjs';
import {
  normalizeKristalPolicy,
  evaluatePolicy,
  enforcePolicySet,
} from './integrations/reader-policy.mjs';
export class Engine {
  constructor(
    pack,
    {
      roles = ['public'],
      secret = randomBytes(32),
      maxOperations = 2000000,
      deadlineMs = 3000,
      cacheSize = 64,
    } = {},
  ) {
    this.pack = structuredClone(validatePack(pack));
    pack = this.pack;
    pack.policies = pack.policies.map((p) =>
      p.profile === 'konstellation.kristal-reader.v1' ? normalizeKristalPolicy(p.document) : p,
    );
    this.roles = [...roles].sort(compare);
    this.secret = secret;
    this.limits = { maxOperations, deadlineMs, maxDepth: 3, maxFilters: 32, maxLinks: 16 };
    this.cacheSize = cacheSize;
    this.cache = new Map();
    this.relations = new Map(pack.registry.relations.map((r) => [r.id, r]));
    this.entities = new Map(
      pack.entities.filter((e) => canRead(e, this.roles)).map((e) => [e.id, e]),
    );
    this.sources = new Map(
      pack.sources.filter((s) => canRead(s, this.roles)).map((s) => [s.id, s]),
    );
    this.policies = new Map(pack.policies.map((p) => [hash(p), p]));
    this.baseContext = {
      datasetRef: hash(pack),
      registryRef: hash(pack.registry),
      executionProfileRef: hash({
        adapter: 'konstellation-reader:0.5.0',
        limits: this.limits,
        canonicalization: 'sorted-keys-json-v1',
      }),
    };
    this.accessRef = hash(this.roles);
  }
  context(
    policyRef = [...this.policies].find(([, p]) => p.support?.available !== false)?.[0] ||
      [...this.policies.keys()][0],
  ) {
    return { ...this.baseContext, readerPolicyRef: policyRef };
  }
  tick(state) {
    if (++state.operations > this.limits.maxOperations)
      fail('BUDGET_EXCEEDED', 'Le budget de calcul est dépassé. Affinez la sélection.', 422);
    if ((state.operations & 255) === 0 && Date.now() > state.deadline)
      fail('TIMEOUT', 'Le calcul a dépassé le délai autorisé.', 503);
  }
  scope(context) {
    for (const [k, v] of Object.entries(this.baseContext))
      if (context?.[k] !== v)
        fail(
          'CONTEXT_UNAVAILABLE',
          'Le corpus, le registre ou le profil enregistré n’est plus disponible.',
          409,
        );
    const policy = this.policies.get(context.readerPolicyRef);
    if (!policy) fail('CONTEXT_UNAVAILABLE', 'Politique de lecture inconnue.', 409);
    const state = {
      policy,
      operations: 0,
      deadline: Date.now() + this.limits.deadlineMs,
      index: new Map(),
      assertions: new Map(),
    };
    if (policy.support?.available === false)
      fail('UNSUPPORTED_POLICY', policy.support.reasons.join(' '), 422);
    const candidates = [];
    const allowed = (list, value) => list.includes('*') || list.includes(value);
    for (const a of this.pack.assertions) {
      this.tick(state);
      const rel = this.relations.get(a.relation);
      if (
        !canRead(a, this.roles) ||
        !this.entities.has(a.subject) ||
        (rel.valueKind === 'entity' && !this.entities.has(a.value))
      )
        continue;
      if (
        !allowed(policy.statuses, a.status) ||
        !allowed(policy.certainties, a.certainty) ||
        !allowed(policy.validationStatuses, a.validationStatus) ||
        !allowed(policy.validatedAs, a.validatedAs) ||
        !allowed(policy.authorities, a.authority)
      )
        continue;
      if (policy.domain && policy.domain !== a.scope.domain) continue;
      if (
        policy.requireSources &&
        (!a.sourceRefs.length || a.sourceRefs.some((id) => !this.sources.has(id)))
      )
        continue;
      // Never expose provenance or a raw payload referencing access-restricted source metadata.
      if (a.sourceRefs.some((id) => !this.sources.has(id))) continue;
      const evaluated = evaluatePolicy(policy, a, this.pack);
      if (evaluated.visible)
        candidates.push(evaluated.labels?.length ? { ...a, readerLabels: evaluated.labels } : a);
    }
    for (const a of enforcePolicySet(policy, candidates)) {
      const rel = this.relations.get(a.relation);
      state.assertions.set(a.id, a);
      const put = (subject, relation, value) => {
        const k = subject + '|' + relation;
        const list = state.index.get(k) || [];
        list.push({ assertion: a, value });
        state.index.set(k, list);
      };
      put(a.subject, a.relation, a.value);
      if (rel.inverseOf) put(a.value, rel.inverseOf, a.subject);
    }
    return state;
  }
  check(q) {
    validate('query-spec', q);
    let filters = 0,
      links = 0;
    const walk = (s, depth = 0) => {
      if (depth > 3) fail('BUDGET_EXCEEDED', 'Trois traversées maximum.', 422);
      if (!this.pack.registry.entityTypes.includes(s.entityType))
        fail('TYPE_MISMATCH', 'Type inconnu.');
      for (const id of s.ids || [])
        if (!this.entities.has(id) || this.entities.get(id).type !== s.entityType)
          fail('TYPE_MISMATCH', 'Sélection d’identités indisponible.');
      filters += s.filters.length;
      links += s.links.length;
      const resolve = (id) => {
        const r = this.relations.get(id);
        if (!r) fail('UNKNOWN_RELATION', 'Relation inconnue.');
        if (!this.relationCapability(id).available)
          fail('UNSUPPORTED_CAPABILITY', this.relationCapability(id).reason, 422);
        if (!r.domain.includes(s.entityType))
          fail('TYPE_MISMATCH', 'Relation incompatible avec le type sélectionné.');
        return r;
      };
      for (const f of s.filters) {
        const r = resolve(f.relation);
        if (!this.relationCapability(r.id).operators.includes(f.op))
          fail('UNSUPPORTED_CAPABILITY', 'Opérateur non pris en charge.');
        for (const v of f.values || []) {
          if (v.kind !== r.valueKind) fail('TYPE_MISMATCH', 'Type de valeur incorrect.');
          if (
            v.kind === 'entity' &&
            (!this.entities.has(v.id) || this.entities.get(v.id).type !== r.range)
          )
            fail('TYPE_MISMATCH', 'Valeur indisponible.');
        }
        if (
          f.op === 'overlaps' &&
          (f.interval.from > f.interval.to ||
            !Number.isSafeInteger(f.interval.from) ||
            !Number.isSafeInteger(f.interval.to))
        )
          fail('INVALID_QUERY', 'Intervalle invalide.');
      }
      for (const l of s.links) {
        const r = resolve(l.relation);
        if (r.valueKind !== 'entity' || l.target.entityType !== r.range)
          fail('TYPE_MISMATCH', 'Pivot incompatible.');
        walk(l.target, depth + 1);
      }
    };
    walk(q.selection);
    if (filters > 32 || links > 16 || Buffer.byteLength(canonical(q)) > 65536)
      fail('BUDGET_EXCEEDED', 'Requête trop grande.', 422);
    for (const [k, v] of Object.entries(this.baseContext))
      if (q.context[k] !== v) fail('CONTEXT_UNAVAILABLE', 'Contexte sauvegardé indisponible.', 409);
    if (!this.policies.has(q.context.readerPolicyRef))
      fail('CONTEXT_UNAVAILABLE', 'Politique indisponible.', 409);
  }
  values(id, relation, state) {
    this.tick(state);
    return state.index.get(id + '|' + relation) || [];
  }
  testFilter(f, entries, state) {
    const matches = entries.filter((e) => {
      this.tick(state);
      if (f.op === 'in' || f.op === 'none_of')
        return f.values.some((v) => (v.kind === 'entity' ? v.id : v.value) === e.value);
      if (f.op === 'overlaps') {
        const v = e.value;
        return (
          v.startMax !== null &&
          v.endMin !== null &&
          v.startMax <= f.interval.to &&
          v.endMin >= f.interval.from
        );
      }
      return true;
    });
    if (f.op === 'missing_in_view' || f.op === 'none_of')
      return { ok: matches.length === 0, entries: [] };
    return { ok: matches.length > 0, entries: matches.slice(0, 1) };
  }
  witness(path, a, kind) {
    return {
      criterionPath: path,
      kind: kind || (a?.ruleRef ? 'derivation' : 'assertion'),
      assertionRefs: a ? [a.id] : [],
      sourceRefs: a ? a.sourceRefs : [],
      ...(a?.ruleRef ? { ruleRef: a.ruleRef } : {}),
    };
  }
  match(id, s, state, path = '/selection') {
    this.tick(state);
    const entity = this.entities.get(id);
    if (!entity || entity.type !== s.entityType || (s.ids && !s.ids.includes(id))) return null;
    const witnesses = [];
    for (let i = 0; i < s.filters.length; i++) {
      const f = s.filters[i],
        found = this.testFilter(f, this.values(id, f.relation, state), state);
      if (!found.ok) return null;
      witnesses.push(
        this.witness(
          `${path}/filters/${i}`,
          found.entries[0]?.assertion,
          found.entries.length ? undefined : 'absence_in_view',
        ),
      );
    }
    for (let i = 0; i < s.links.length; i++) {
      const l = s.links[i];
      let matched = false;
      for (const e of this.values(id, l.relation, state)) {
        this.tick(state);
        const nested = this.match(e.value, l.target, state, `${path}/links/${i}/target`);
        if (nested) {
          witnesses.push(this.witness(`${path}/links/${i}`, e.assertion), ...nested);
          matched = true;
          break;
        }
      }
      if (!matched) return null;
    }
    return witnesses;
  }
  all(q, state) {
    const rows = [];
    for (const id of [...this.entities.keys()].sort(compare)) {
      const witnesses = this.match(id, q.selection, state);
      if (witnesses) rows.push({ entityId: id, witnesses, witnessesComplete: true });
    }
    return rows;
  }
  identity(q) {
    return hash({ context: q.context, selection: q.selection });
  }
  sign(payload) {
    const body = Buffer.from(canonical(payload)).toString('base64url');
    return body + '.' + createHmac('sha256', this.secret).update(body).digest('base64url');
  }
  cursor(token, key) {
    try {
      if (typeof token !== 'string' || token.length > 2048) throw Error();
      const [body, sig, ...rest] = token.split('.');
      if (rest.length) throw Error();
      const expected = createHmac('sha256', this.secret).update(body).digest();
      const actual = Buffer.from(sig, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();
      const p = JSON.parse(Buffer.from(body, 'base64url'));
      if (p.key !== key || !Number.isSafeInteger(p.offset) || p.offset < 0) throw Error();
      return p.offset;
    } catch {
      fail('CURSOR_MISMATCH', 'Curseur expiré ou incompatible avec cette requête.', 409);
    }
  }
  query(q, cursor = null) {
    this.check(q);
    const maxLimit = this.policies.get(q.context.readerPolicyRef)?.document?.query?.max_limit;
    if (maxLimit && q.pageSize > maxLimit)
      fail('POLICY_LIMIT', 'Taille de page supérieure à la politique.', 422);
    const key = hash({ q, access: this.accessRef });
    const offset = cursor ? this.cursor(cursor, key) : 0;
    let computed = this.cache.get(key);
    if (!computed) {
      const state = this.scope(q.context);
      computed = { rows: this.all(q, state), state };
      if (this.cacheSize) {
        this.cache.set(key, computed);
        while (this.cache.size > this.cacheSize) this.cache.delete(this.cache.keys().next().value);
      }
    }
    const rows = computed.rows.slice(offset, offset + q.pageSize);
    const assertionIds = new Set(rows.flatMap((r) => r.witnesses.flatMap((w) => w.assertionRefs)));
    const view = (a) => this.viewAssertion(a, computed.state);
    return {
      schemaVersion: '0.2',
      context: q.context,
      queryIdentity: this.identity(q),
      evaluation: 'complete',
      rows,
      assertions: [...assertionIds].map((id) => view(computed.state.assertions.get(id))),
      nextCursor:
        offset + q.pageSize < computed.rows.length
          ? this.sign({ key, offset: offset + q.pageSize })
          : null,
      total: { kind: 'exact', value: computed.rows.length },
    };
  }
  viewAssertion(a, state) {
    // Imported raw payloads remain in the pack for audit; only normalized admitted metadata crosses the API.
    const { upstreamPayload, roles, conflictsWith, derivedFrom, ...safe } = a;
    return {
      assertionRef: a.id,
      upstreamContractRef: a.upstreamContractRef || 'konstellation.normalized-assertion:0.3',
      payload: {
        ...safe,
        ...(derivedFrom
          ? {
              derivedFrom: derivedFrom.filter(
                (id) => state.assertions.has(id) || this.sources.has(id),
              ),
            }
          : {}),
        conflictsWith: (conflictsWith || []).filter((id) => state.assertions.has(id)),
      },
    };
  }
  facets(q, ids) {
    this.check(q);
    if (!Array.isArray(ids) || ids.length > 32 || ids.some((id) => typeof id !== 'string'))
      fail('INVALID_QUERY', 'Liste de facettes invalide.');
    const state = this.scope(q.context),
      result = {};
    for (const id of ids) {
      const r = this.relations.get(id);
      if (!r || !r.domain.includes(q.selection.entityType))
        fail('UNKNOWN_RELATION', 'Facette incompatible.');
      if (!this.relationCapability(id).available) {
        result[id] = this.relationCapability(id);
        continue;
      }
      const s = { ...q.selection, filters: q.selection.filters.filter((f) => f.relation !== id) },
        counts = new Map();
      let present = 0,
        missing = 0;
      for (const eid of this.entities.keys()) {
        if (!this.match(eid, s, state)) continue;
        const entries = this.values(eid, id, state);
        if (entries.length) present++;
        else missing++;
        const seen = new Set();
        for (const e of entries) {
          this.tick(state);
          const k = canonical(e.value);
          if (!seen.has(k)) {
            seen.add(k);
            const x = counts.get(k) || { value: e.value, count: 0 };
            x.count++;
            counts.set(k, x);
          }
        }
      }
      result[id] = {
        available: true,
        present,
        missing,
        kind: 'exact',
        values: [...counts.values()].sort((a, b) =>
          compare(canonical(a.value), canonical(b.value)),
        ),
      };
    }
    return result;
  }
  entity(id, context) {
    const state = this.scope(context);
    const e = this.entities.get(id);
    if (!e) fail('NOT_FOUND', 'Entité indisponible.', 404);
    const assertions = [];
    for (const a of state.assertions.values())
      if (
        a.subject === id ||
        (this.relations.get(a.relation).valueKind === 'entity' && a.value === id)
      )
        assertions.push(this.viewAssertion(a, state));
    return {
      entity: this.publicEntity(e),
      assertions,
      sources: [...new Set(assertions.flatMap((a) => a.payload.sourceRefs))].map((id) =>
        this.publicSource(this.sources.get(id)),
      ),
    };
  }
  constellation(request, lenses) {
    if (!request || typeof request !== 'object' || Array.isArray(request))
      fail('INVALID_QUERY', 'Requête de constellation invalide.');
    const state = this.scope(request.context);
    return projectConstellation(this, state, lenses, request);
  }
  evidence(ids, context) {
    if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== 'string'))
      fail('INVALID_QUERY', 'Références invalides.');
    const state = this.scope(context);
    return ids.map((id) => {
      const a = state.assertions.get(id);
      if (!a) fail('NOT_FOUND', 'Assertion indisponible.', 404);
      return this.viewAssertion(a, state);
    });
  }
  publicEntity(e) {
    const { roles, ...rest } = e;
    return rest;
  }
  publicSource(s) {
    const { roles, ...rest } = s;
    return rest;
  }
  relationCapability(id) {
    return (
      this.pack.integration?.capabilities?.relations?.[id] || {
        available: true,
        operators: this.relations.get(id)?.operators || [],
        reason: null,
      }
    );
  }
  bootstrap(lenses) {
    return {
      version: '0.5.0',
      title: this.pack.title,
      description: this.pack.description,
      synthetic: this.pack.synthetic,
      context: this.context(),
      registry: this.pack.registry,
      lenses,
      entities: [...this.entities.values()].map((e) => this.publicEntity(e)),
      policies: [...this.policies].map(([ref, p]) => ({
        ref,
        id: p.id,
        label: p.label,
        description: p.description,
        available: p.support?.available !== false,
        reasons: p.support?.reasons || [],
        defaultPageSize: Math.min(
          24,
          p.document?.query?.default_limit || 24,
          p.document?.query?.max_limit || 100,
        ),
        maxPageSize: Math.min(100, p.document?.query?.max_limit || 100),
      })),
      limits: this.limits,
      capabilities: {
        filters: true,
        pivots: true,
        evidence: true,
        sa: false,
        packAdapter: this.pack.integration?.adapter || 'normalized-json-v1',
        relations: Object.fromEntries(
          [...this.relations.keys()].map((id) => [id, this.relationCapability(id)]),
        ),
      },
    };
  }
}
