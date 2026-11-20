/**
 * Fail-closed, deterministic visual plan from ALREADY POLICY-FILTERED graph DTO.
 * No engine access, no global assertions and no lexical inference.
 */
import { CHANNEL_REGISTRY } from './registry.mjs';

const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = (list) => [...list].sort(cmp);
const sortedEdges = (list) => [...list].sort((a, b) => cmp(a.assertionRef || a.id, b.assertionRef || b.id));

function oppositionComponents(bindings) {
  // Scopes and disconnected graphs NEVER share a semantic left-right axis.
  const byScope = new Map();
  for (const { edge, rule } of bindings) {
    if (edge.source === edge.target) continue;
    if (!byScope.has(rule.scope)) byScope.set(rule.scope, []);
    byScope.get(rule.scope).push({ assertionRef: edge.id, source: edge.source,
      target: edge.target, relationId: edge.relationId });
  }
  const components = [], unfulfilled = [];
  for (const scope of sorted(byScope.keys())) {
    const edges = sortedEdges(byScope.get(scope));
    const adjacency = new Map();
    for (const edge of edges) {
      for (const [a, b] of [[edge.source,edge.target], [edge.target,edge.source]]) {
        if (!adjacency.has(a)) adjacency.set(a,new Set());
        adjacency.get(a).add(b);
      }
    }
    const visited = new Set();
    for (const start of sorted(adjacency.keys())) {
      if (visited.has(start)) continue;
      const color = new Map([[start,0]]), queue=[start];
      let impossible = false;
      for (let index=0; index<queue.length; index++) {
        const u=queue[index];
        visited.add(u);
        for (const v of sorted(adjacency.get(u))) {
          if (!color.has(v)) { color.set(v,1-color.get(u)); queue.push(v); }
          else if (color.get(v)===color.get(u)) impossible=true;
        }
      }
      const ids = new Set(color.keys());
      const relations = edges.filter((e)=>ids.has(e.source)&&ids.has(e.target));
      if (impossible) {
        unfulfilled.push({ scope, reason:'NON_BIPARTITE_OPPOSITIONS',
          nodeIds:sorted(ids), assertionRefs:sorted(relations.map((e)=>e.assertionRef)) });
      } else {
        components.push({ scope,
          left:sorted([...color].filter(([,v])=>v===0).map(([id])=>id)),
          right:sorted([...color].filter(([,v])=>v===1).map(([id])=>id)),
          relations,
          explanation:'Seules les paires attestées sont opposées. Un même côté ne prouve aucune équivalence.' });
      }
    }
  }
  return { components, unfulfilled };
}

export function compileVisualSemantics(selection, bindings, { includeAssertionConflicts = false } = {}) {
  if (!(bindings instanceof Map)) throw new TypeError('VISUAL_ENCODING_RULES_REQUIRED');
  const nodes = Array.isArray(selection?.nodes) ? selection.nodes : [];
  const edges = Array.isArray(selection?.edges) ? selection.edges : [];
  const visibleIds = new Set(nodes.map((n)=>n?.id).filter((id)=>typeof id==='string'));
  const accepted = sortedEdges(edges.filter((e)=>e && typeof e.id==='string' &&
    visibleIds.has(e.source) && visibleIds.has(e.target) && bindings.has(e.relationId)));
  const withRules = accepted.map((edge)=>({edge,rule:bindings.get(edge.relationId)}));
  const assertionNodes = new Map(nodes.filter((n)=>n?.kind==='assertion' && typeof n.assertionRef==='string')
    .map((n)=>[n.id,n.assertionRef]));
  // `traceability` already materializes conflictsWith as a literal edge between
  // two *visible assertions*. It is NOT inferred from their names/positions.
  const declaredConflicts = includeAssertionConflicts ? edges.filter((e)=>
    e?.kind==='conflict' && typeof e.id==='string' && e.id.startsWith('conflict:') &&
    visibleIds.has(e.source) && visibleIds.has(e.target) &&
    assertionNodes.has(e.source) && assertionNodes.has(e.target))
    .map((edge)=>({edge:{...edge,relationId:'conflictsWith'},rule:{kind:'opposition',scope:'visible-assertion-conflict'}})) : [];
  const opposition = oppositionComponents([
    ...withRules.filter(({rule})=>rule.kind==='opposition'), ...declaredConflicts,
  ]);
  const causalEdges = withRules.filter(({rule})=>rule.kind==='causal')
    .map(({edge,rule})=>({ assertionRef:edge.id, source:edge.source,
      target:edge.target, relationId:edge.relationId, scope:rule.scope, sign:rule.sign }));
  const legend = [];
  if (opposition.components.length||opposition.unfulfilled.length)
    legend.push({channel:'opposition',explanation:CHANNEL_REGISTRY.opposition});
  if (causalEdges.length)
    legend.push({channel:'causal',explanation:CHANNEL_REGISTRY.causal});
  legend.push({channel:'decorative',explanation:CHANNEL_REGISTRY.decorative});
  return {
    version:'0.1', derived:true, authoritative:false,
    status: opposition.components.length||causalEdges.length?'explicit-relations':'no-qualified-encoding',
    opposition, causalEdges, legend,
    warning:'Position, distance et couleurs décoratives n’ajoutent aucune assertion au canon.',
  };
}
