/** Maintainer-reviewed exact relation bindings, never inferred from a Kristal label. */
import fs from 'node:fs';

export const CHANNEL_REGISTRY = Object.freeze({
  opposition: 'Opposition attestée dans un domaine de comparaison déclaré',
  causal: 'Influence causale explicitement liée à une assertion ; signe +/− seulement si qualifié',
  decorative: 'Écartement technique sans signification de distance, de vérité ou de conflit',
});
const FORMAT = 'konstellation.visual-encoding-bindings/0.1';
const ID = /^[a-zA-Z0-9][a-zA-Z0-9:_./-]{0,199}$/;
const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
const only = (x, keys) => Object.keys(x).every((key) => keys.includes(key));

export function parseVisualEncodingBindings(input) {
  if (!object(input) || input.format !== FORMAT || !Array.isArray(input.rules) ||
      !only(input, ['format', 'rules']) || input.rules.length > 256) {
    throw new Error('INVALID_VISUAL_ENCODING_REGISTRY');
  }
  const seen = new Set();
  const accepted = [];
  for (const rule of input.rules) {
    if (!object(rule) || !only(rule, ['relationId', 'kind', 'scope', 'sign', 'review']) ||
        typeof rule.relationId !== 'string' || !ID.test(rule.relationId) ||
        !['opposition', 'causal'].includes(rule.kind) ||
        typeof rule.scope !== 'string' || !ID.test(rule.scope) ||
        typeof rule.review !== 'string' || rule.review.trim().length < 15 || rule.review.length > 800 ||
        (rule.kind === 'opposition' && rule.sign !== undefined) ||
        (rule.kind === 'causal' && ![-1, 0, 1].includes(rule.sign)) ||
        seen.has(rule.relationId)) throw new Error('INVALID_VISUAL_ENCODING_RULE');
    seen.add(rule.relationId);
    accepted.push(Object.freeze({ relationId: rule.relationId, kind: rule.kind, scope: rule.scope,
      ...(rule.kind === 'causal' ? { sign: rule.sign } : {}) }));
  }
  return new Map(accepted.sort((a,b)=>a.relationId.localeCompare(b.relationId)).map((r) => [r.relationId,r]));
}

export function loadVisualEncodingBindings() {
  // Read only code-owned local configuration; NEVER from a loaded Kristal or HTTP input.
  return parseVisualEncodingBindings(JSON.parse(fs.readFileSync(
    new URL('../../../config/visual-semantics.json', import.meta.url), 'utf8')));
}
