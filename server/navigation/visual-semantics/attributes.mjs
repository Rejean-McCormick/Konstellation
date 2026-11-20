/**
 * K4: explicitly reviewed visual attribute channels over an ALREADY policy-scoped
 * read projection. Never infer identity, causality, numeric unit or scalar from a
 * human-readable label. The absence of a binding means neutral presentation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../contracts.mjs';

const FORMAT = 'konstellation.visual-attribute-bindings/0.1';
const ID = /^[A-Za-z0-9][A-Za-z0-9_:./-]{0,159}$/;
const CHANNELS = new Set(['shape', 'color', 'size', 'x', 'y']);
const SHAPES = new Set(['circle', 'square', 'diamond', 'triangle']);
const COLORS = new Set(['navy', 'teal', 'amber', 'rose', 'slate']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const obj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const only = (x, keys) => Object.keys(x).every((k) => keys.includes(k));
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const compare = (a, b) => cmp(a.id, b.id);
const fail = () => { throw new Error('INVALID_VISUAL_ATTRIBUTE_BINDING'); };
const INVALID = Symbol('invalid-valuation');

export const ATTRIBUTE_CHANNELS = Object.freeze({
  shape: 'Forme = type d’entité explicitement visible, sans nouvelle classification.',
  color: 'Couleur = catégorie exacte d’une valuation explicitement qualifiée ; autre canal non exclusif obligatoire.',
  size: 'Taille = grandeur scalaire comparable à unité déclarée (rayon monotone, pas aire proportionnelle).',
  x: 'Axe X = grandeur scalaire sur une échelle linéaire bornée et déclarée.',
  y: 'Axe Y = grandeur scalaire sur une échelle linéaire bornée et déclarée.',
  distance: 'Distance euclidienne interprétable uniquement avec deux axes du même groupe, même unité et même rapport pixels/unité.',
});

/**
 * Rules are code-owned and require a substantial maintainer review note. This
 * is neither an authorisation of publication nor a Kristal semantic assertion.
 */
export function parseVisualAttributeBindings(input) {
  if (!obj(input) || !only(input, ['format', 'rules']) || input.format !== FORMAT ||
    !Array.isArray(input.rules) || input.rules.length > 5) fail();
  const channels = new Set(), ids = new Set(), out = [];
  for (const rule of input.rules) {
    if (!obj(rule) || !only(rule, ['id','channel','scope','review','mapping','relationId','dimension','unit','min','max','distanceGroup']) ||
      !CHANNELS.has(rule.channel) || typeof rule.id !== 'string' || !ID.test(rule.id) ||
      typeof rule.scope !== 'string' || !ID.test(rule.scope) ||
      channels.has(rule.channel) || ids.has(rule.id) ||
      typeof rule.review !== 'string' || rule.review.trim().length < 20 || rule.review.length > 800) fail();
    const r = { id: rule.id, channel: rule.channel, scope: rule.scope };
    if (rule.channel === 'shape') {
      if (!obj(rule.mapping) || !only(rule, ['id','channel','scope','review','mapping'])) fail();
    } else if (rule.channel === 'color') {
      if (!obj(rule.mapping) || !only(rule,['id','channel','scope','review','mapping','relationId','dimension']) ||
        typeof rule.relationId !== 'string' || !ID.test(rule.relationId) ||
        typeof rule.dimension !== 'string' || !ID.test(rule.dimension)) fail();
      r.relationId=rule.relationId;r.dimension=rule.dimension;
    } else {
      if (!only(rule,['id','channel','scope','review','relationId','dimension','unit','min','max','distanceGroup']) ||
        typeof rule.relationId !== 'string' || !ID.test(rule.relationId) ||
        typeof rule.dimension !== 'string' || !ID.test(rule.dimension) ||
        typeof rule.unit !== 'string' || !ID.test(rule.unit) ||
        !finite(rule.min) || !finite(rule.max) || rule.max <= rule.min ||
        !Number.isFinite(rule.max-rule.min) || rule.max-rule.min < Number.EPSILON ||
        (rule.channel === 'size' && rule.min < 0) ||
        (rule.distanceGroup !== undefined && (rule.channel === 'size' ||
          typeof rule.distanceGroup !== 'string' || !ID.test(rule.distanceGroup)))) fail();
      Object.assign(r, { relationId:rule.relationId,dimension:rule.dimension,unit:rule.unit,min:rule.min,max:rule.max });
      if (rule.distanceGroup !== undefined) r.distanceGroup=rule.distanceGroup;
    }
    if (rule.channel === 'shape' || rule.channel === 'color') {
      const entries = Object.entries(rule.mapping);
      if (!entries.length || entries.length > 64) fail();
      const mapping = Object.create(null);
      const usedTokens = new Set();
      for (const [value, token] of entries) {
        if (!ID.test(value) || ['__proto__','prototype','constructor'].includes(value) ||
          !(rule.channel === 'shape' ? SHAPES : COLORS).has(token) || usedTokens.has(token)) fail();
        mapping[value]=token; usedTokens.add(token);
      }
      r.mapping=Object.freeze(mapping);
    }
    channels.add(rule.channel); ids.add(rule.id);out.push(Object.freeze(r));
  }
  // A single K4 panel compares one declared domain at a time. Never combine
  // units/categories from unrelated scopes in a single semantic geometry.
  if (new Set(out.map(r=>r.scope)).size>1) fail();
  const x=out.find(r=>r.channel==='x'), y=out.find(r=>r.channel==='y');
  if (x && y && x.scope!==y.scope) fail();
  if ((x?.distanceGroup || y?.distanceGroup) &&
      (!x?.distanceGroup || !y?.distanceGroup || x.distanceGroup!==y.distanceGroup ||
        x.scope!==y.scope || x.unit!==y.unit)) fail();
  return Object.freeze(out.sort(compare));
}

export function loadVisualAttributeBindings() {
  // Never load a rule from a Kristal read surface or an HTTP request.
  return parseVisualAttributeBindings(JSON.parse(fs.readFileSync(
    path.join(ROOT, 'config', 'visual-attributes.json'),'utf8')));
}

const selectionNodes = (projection) => {
  const rows = projection?.nodes || projection?.rows || projection?.points?.map(p=>p.entity) ||
    projection?.items?.map(item=>item.entity) || projection?.records?.map(item=>item.entity) || [];
  const nodes = new Map();
  for (const item of rows) {
    if (!obj(item) || item.kind==='assertion' || item.kind==='source') continue;
    const entityId = item.entityId || item.id;
    if (typeof item.id !== 'string' || typeof item.type !== 'string' || typeof entityId !== 'string') continue;
    if (!nodes.has(item.id)) nodes.set(item.id, { id:item.id,entityId,type:item.type });
  }
  return [...nodes.values()].sort(compare);
};

/**
 * Boundary adapter for a trusted navigation projection and its policy-scoped state.
 * Hidden assertions are NEVER passed to the attribute compiler, even if a stale
 * by-entity index were to contain them. A budget overflow fails closed.
 */
export function collectVisibleAttributeInput(projection, state) {
  if (!(state?.assertions instanceof Map) || !(state?.entityIds instanceof Set))
    throw new TypeError('VISIBLE_POLICY_STATE_REQUIRED');
  const candidates = selectionNodes(projection).filter(n=>state.entityIds.has(n.entityId));
  if (candidates.length > 160) return {nodes:[],records:[],incomplete:true};
  const records = [];
  for (const n of candidates) {
    for (const a of state.assertionsByEntity?.get(n.entityId) || []) {
      if (!obj(a) || !state.assertions.has(a.id) || a.subject!==n.entityId) continue;
      if (records.length >= 4096) return {nodes:[],records:[],incomplete:true};
      records.push({ subjectId:n.entityId, assertionRef:a.id, relationId:a.relation,
        valuations:Array.isArray(a.valuations) ? a.valuations.slice(0,24) : [] });
    }
  }
  return {nodes:candidates,records,incomplete:false};
}

function valueOf(record,rule) {
  if (record.relationId!==rule.relationId) return null;
  const matches=record.valuations.filter(v=>obj(v) && v.dimension===rule.dimension);
  if (!matches.length) return null;
  if (matches.length!==1) return INVALID;
  const v=matches[0];
  if (rule.channel==='color') {
    if (v.value_state!=='known' || v.value_semantics!=='categorical' ||
      typeof v.value!=='string' || own(v,'unit') || !own(rule.mapping,v.value)) return INVALID;
    return {value:v.value,token:rule.mapping[v.value]};
  }
  if (v.value_state!=='known' || v.value_semantics!=='scalar' || v.unit!==rule.unit ||
      !finite(v.value) || v.value<rule.min || v.value>rule.max) return INVALID;
  return {value:v.value,ratio:(v.value-rule.min)/(rule.max-rule.min)};
}

const encodingFor = (rule, value, refs, fromType=false) => ({
  channel:rule.channel,ruleId:rule.id, value:value.value,
  ...(value.token ? { token:value.token } : {}),
  ...(value.ratio!==undefined ? { ratio:value.ratio,unit:rule.unit } : {}),
  assertionRefs:fromType?[]:refs,
  origin:fromType?'visible-entity-type':'visible-assertion-valuation',
});

/** Pure compiler. `input` MUST be the output of `collectVisibleAttributeInput` in production. */
export function compileVisualAttributes(input, bindings) {
  if (!Array.isArray(bindings)) throw new TypeError('ATTRIBUTE_RULES_REQUIRED');
  const rules=bindings.map(rule=>({ id:rule.id,channel:rule.channel,scope:rule.scope,
    ...(rule.relationId?{relationId:rule.relationId,dimension:rule.dimension}:{}),
    ...(rule.unit?{unit:rule.unit,min:rule.min,max:rule.max}:{}),
    explanation:ATTRIBUTE_CHANNELS[rule.channel] }));
  const distanceRules=bindings.filter(r=>r.distanceGroup && (r.channel==='x'||r.channel==='y'));
  const distanceQualified=distanceRules.length===2 && distanceRules[0].distanceGroup===distanceRules[1].distanceGroup &&
    distanceRules[0].scope===distanceRules[1].scope && distanceRules[0].unit===distanceRules[1].unit;
  const distance={qualified:distanceQualified,
    explanation:distanceQualified ? ATTRIBUTE_CHANNELS.distance : 'Les écarts spatiaux entre nœuds ne sont pas une distance mesurée.'};
  const warning='Seuls les attributs justifiés par les règles et assertions visibles sont sémantiques ; les autres styles restent techniques.';
  if (input?.incomplete) return {version:'0.1',derived:true,authoritative:false,
    status:'incomplete',rules, nodes:[],distance,truncated:true,warning};
  const nodes=[];
  const records=Array.isArray(input?.records)?input.records:[];
  const bySubject=new Map();
  for (const row of records) if (obj(row) && typeof row.subjectId==='string') {
    if (!bySubject.has(row.subjectId)) bySubject.set(row.subjectId,[]);
    bySubject.get(row.subjectId).push(row);
  }
  const visibleNodes=Array.isArray(input?.nodes)?[...input.nodes].sort(compare):[];
  const seen=new Set();
  for (const node of visibleNodes) {
    if (!obj(node)||typeof node.id!=='string'||typeof node.entityId!=='string'||typeof node.type!=='string'||seen.has(node.id)) continue;
    seen.add(node.id);
    const encodings=[];
    for (const rule of bindings) {
      if (rule.channel==='shape') {
        if (own(rule.mapping,node.type)) encodings.push(encodingFor(rule,{value:node.type,token:rule.mapping[node.type]},[],true));
        continue;
      }
      const values=[];
      let invalid=false;
      for (const record of bySubject.get(node.entityId) || []) {
        if (typeof record.assertionRef!=='string'||!Array.isArray(record.valuations)) continue;
        const value=valueOf(record,rule);
        if (value===INVALID) invalid=true;
        else if (value!==null) values.push({value,ref:record.assertionRef});
      }
      // Any distinct qualifying values make the channel ambiguous. No silent
      // last-write-wins. Repeated equal values share their listed evidence.
      const distinct=new Set(values.map(x=>JSON.stringify(x.value)));
      if (invalid || distinct.size!==1 || values.length>16) continue;
      encodings.push(encodingFor(rule,values[0].value,[...new Set(values.map(x=>x.ref))].sort(),false));
    }
    if (encodings.length) nodes.push({id:node.id,entityId:node.entityId,encodings});
  }
  return {version:'0.1',derived:true,authoritative:false,
    status:nodes.length?'explicit-attributes':'no-qualified-attributes',rules,nodes,distance,truncated:false,warning};
}
