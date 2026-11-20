/**
 * K5: hierarchy is an explainable, policy-scoped DERIVED VIEW, not canonical
 * knowledge. No relation name, label or type grants hierarchy semantics.
 * Maintainers must pin a reviewed rule to the exact normalized dataset and
 * reader policy. The reader never accepts rules from a Kristal or HTTP input.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../contracts.mjs';

export const HIERARCHY_REVIEW_FORMAT = 'konstellation.visual-hierarchy-reviews/0.1';
const SHA = /^sha256:[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_:./-]{0,199}$/;
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const only = (x, fields) => Object.keys(x).every((key) => fields.includes(key));
const fail = () => { throw new Error('INVALID_HIERARCHY_REVIEW'); };
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = (items) => [...items].sort(sort);

export function parseHierarchyReviews(value) {
  if (!object(value) || !only(value,['format','rules']) ||
      value.format !== HIERARCHY_REVIEW_FORMAT || !Array.isArray(value.rules) ||
      value.rules.length > 32) fail();
  const keys = new Set(), reviews = [];
  for (const row of value.rules) {
    if (!object(row) || !only(row, [
      'id','datasetRef','readerPolicyRef','stateRef','relationId','scope',
      'direction','sampleAssertionRefs','reviewer','reviewedOn','review',
    ]) || !ID.test(row.id || '') || !SHA.test(row.datasetRef || '') ||
      !SHA.test(row.readerPolicyRef || '') || !ID.test(row.stateRef || '') ||
      !ID.test(row.relationId || '') || !ID.test(row.scope || '') ||
      !['child-to-parent','parent-to-child'].includes(row.direction) ||
      typeof row.reviewer !== 'string' || row.reviewer.trim().length < 3 || row.reviewer.length > 100 ||
      typeof row.reviewedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedOn) ||
      !Number.isFinite(Date.parse(row.reviewedOn + 'T00:00:00Z')) ||
      typeof row.review !== 'string' || row.review.trim().length < 60 || row.review.length > 1200 ||
      !Array.isArray(row.sampleAssertionRefs) || !row.sampleAssertionRefs.length ||
      row.sampleAssertionRefs.length > 24 ||
      row.sampleAssertionRefs.some(ref => typeof ref !== 'string' || !ID.test(ref)) ||
      new Set(row.sampleAssertionRefs).size !== row.sampleAssertionRefs.length) fail();
    const key = `${row.datasetRef}|${row.readerPolicyRef}|${row.relationId}`;
    if (keys.has(key)) fail();
    keys.add(key);
    reviews.push(Object.freeze({ ...row, sampleAssertionRefs: Object.freeze(sorted(row.sampleAssertionRefs)) }));
  }
  return Object.freeze(reviews.sort((a,b)=>sort(a.id,b.id)));
}

export function loadHierarchyReviews() {
  // Local code-owned source only; no Kristal-supplied hints or API payloads.
  const source = path.join(ROOT, 'config', 'visual-hierarchy-reviews.json');
  return parseHierarchyReviews(JSON.parse(fs.readFileSync(source,'utf8')));
}

/**
 * Called after engine.scope(context), never on upstream unfiltered assertions.
 * A reviewed rule can activate ONLY when both runtime dataset and policy pins
 * match; its sample assertions must themselves be visible under that policy.
 */
export function compileReviewedHierarchy(projection, state, context, reviews, { truncated = false } = {}) {
  if (!Array.isArray(reviews)) throw new TypeError('HIERARCHY_REVIEWS_REQUIRED');
  const allowedRelations = new Set(projection?.relationIds || []);
  const candidates = reviews.filter(r =>
    r.datasetRef === context?.datasetRef && r.readerPolicyRef === context?.readerPolicyRef &&
    allowedRelations.has(r.relationId));
  if (!candidates.length) return null;
  if (candidates.length !== 1 || !(state?.assertions instanceof Map) || !(state.entityIds instanceof Set))
    return null; // never guess one rule or access a raw source
  const rule = candidates[0];
  if (!rule.sampleAssertionRefs.every(ref => state.assertions.get(ref)?.relation === rule.relationId))
    return null; // must have at least these exact visible source witnesses
  const nodes = new Set((projection?.nodes || []).map(n => n?.id).filter(id => typeof id === 'string' && state.entityIds.has(id)));
  const pairs = new Map(), parents = new Map(), problems = new Set();
  for (const edge of projection?.edges || []) {
    if (!edge || edge.relationId !== rule.relationId || !nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    const witness = state.assertions.get(edge.id);
    if (!witness || witness.relation !== rule.relationId || witness.subject !== edge.source ||
        witness.value !== edge.target) continue;
    const child = rule.direction === 'child-to-parent' ? edge.source : edge.target;
    const parent = rule.direction === 'child-to-parent' ? edge.target : edge.source;
    if (child === parent) { problems.add('SELF_PARENT'); continue; }
    if (parents.has(child) && parents.get(child) !== parent) problems.add('MULTIPLE_PARENTS');
    parents.set(child,parent);
    const key = JSON.stringify([parent,child]);
    const old = pairs.get(key) || { source:parent,target:child,relationId:rule.relationId,assertionRefs:[] };
    old.assertionRefs.push(edge.id);pairs.set(key,old);
  }
  const edges = [...pairs.values()].map(e => ({...e,assertionRefs:sorted(new Set(e.assertionRefs))}))
    .sort((a,b) => sort(a.source,b.source) || sort(a.target,b.target));
  if (!edges.length) return null; // do not activate meaningless empty mapping
  const children = new Map(), memberIds = new Set();
  for (const edge of edges) {
    memberIds.add(edge.source);memberIds.add(edge.target);
    if (!children.has(edge.source)) children.set(edge.source,[]);
    children.get(edge.source).push(edge.target);
  }
  const roots = sorted([...memberIds].filter(id => !parents.has(id)));
  const visited = new Set(), visiting = new Set();
  function walk(id) {
    if (visiting.has(id)) { problems.add('CYCLE');return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of sorted(children.get(id) || [])) walk(next);
    visiting.delete(id);visited.add(id);
  }
  for (const id of sorted(memberIds)) walk(id);
  if (!roots.length) problems.add('NO_ROOT');
  const unfulfilled = sorted(problems);
  return {
    version:'0.1',derived:true,authoritative:false,
    status:unfulfilled.length ? 'constraints-unfulfilled' : 'reviewed-visible-hierarchy',
    ruleId:rule.id,relationId:rule.relationId,scope:rule.scope,direction:rule.direction,
    roots:unfulfilled.length ? [] : roots,
    edges:unfulfilled.length ? [] : edges,
    nodeIds:unfulfilled.length ? [] : sorted(memberIds),
    unfulfilled,truncated:Boolean(truncated),
    explanation:unfulfilled.length
      ? 'La vue visible ne peut pas être représentée sans faux ordre hiérarchique : voir les relations brutes.'
      : 'Les parents sont au-dessus des enfants car des assertions visibles justifient chaque arc. Il ne s’agit pas d’une vérité ajoutée au Kristal. Les éléments hors vue ne sont pas déduits.',
  };
}
