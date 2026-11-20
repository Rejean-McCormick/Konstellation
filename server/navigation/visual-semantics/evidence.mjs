/**
 * K9–K12: proof ledger for an ALREADY reader-policy-scoped adaptive projection.
 * Records existing, code-reviewed semantics; never approves a rule. Incomplete,
 * forged or hidden evidence fails closed. No raw canonical source is accepted.
 */
const cmp = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const LIMIT = 96;
const CHANNELS = new Set(['hierarchy','opposition','causal','shape','color','size','x','y']);

export function compileVisualEvidence(projection, state) {
  if (!(state?.assertions instanceof Map) || !(state?.entityIds instanceof Set))
    throw new TypeError('VISIBLE_READER_POLICY_STATE_REQUIRED');
  if (!projection || typeof projection !== 'object' || projection.derived !== true)
    throw new TypeError('DERIVED_PROJECTION_REQUIRED');
  const proofs = [];
  let rejected = false, exceeded = false;
  const visible = (ref) => typeof ref === 'string' && state.assertions.has(ref);
  const record = (channel,ruleId,scope,refs,entityId = undefined) => {
    if (!CHANNELS.has(channel) || typeof ruleId !== 'string' || !ruleId ||
        typeof scope !== 'string' || !scope || !Array.isArray(refs) || refs.some(ref=>!visible(ref)) ||
        (entityId!==undefined && !state.entityIds.has(entityId))) {rejected = true;return;}
    if (proofs.length >= LIMIT) { exceeded = true;return; }
    const unique = [...new Set(refs)].sort(cmp);
    if (unique.length > 16) exceeded = true;
    proofs.push({channel,ruleId,scope,assertionRefs:unique.slice(0,16),
      ...(entityId!==undefined?{entityId}:{})});
  };
  const hierarchy = projection.hierarchySemantics;
  if (hierarchy?.status === 'reviewed-visible-hierarchy') {
    for (const edge of hierarchy.edges || []) {
      const refs = edge.assertionRefs || [];
      if (!refs.length || refs.some(ref=>{
        const a = state.assertions.get(ref);
        if (!a || a.relation !== hierarchy.relationId) return true;
        return hierarchy.direction === 'child-to-parent' ?
          a.subject !== edge.target || a.value !== edge.source :
          a.subject !== edge.source || a.value !== edge.target;
      }) || !state.entityIds.has(edge.source) || !state.entityIds.has(edge.target)) {
        rejected=true;continue;
      }
      record('hierarchy',hierarchy.ruleId,hierarchy.scope,refs);
    }
  }
  const attrs = projection.attributeSemantics;
  if (attrs?.status === 'explicit-attributes') {
    const rules = new Map((attrs.rules || []).map(r=>[r.id,r]));
    for (const n of attrs.nodes || []) for (const encoding of n.encodings || []) {
      const rule = rules.get(encoding.ruleId), refs = encoding.assertionRefs || [];
      if (!rule || rule.channel !== encoding.channel || !state.entityIds.has(n.entityId)) { rejected = true;continue; }
      if (encoding.channel === 'shape') {
        if (encoding.origin !== 'visible-entity-type' || refs.length ||
            !state.entityIds.has(n.entityId)) {rejected=true;continue;}
      } else if (encoding.origin !== 'visible-assertion-valuation' || !refs.length ||
          refs.some(ref=>{const a=state.assertions.get(ref);return !a || a.subject!==n.entityId || a.relation!==rule.relationId;})) {
        rejected=true;continue;
      }
      record(encoding.channel,rule.id,rule.scope,refs,n.entityId);
    }
  }
  const semantics = projection.visualSemantics;
  if (semantics?.status === 'explicit-relations') {
    for (const edge of semantics.causalEdges || []) {
      const a=state.assertions.get(edge.assertionRef);
      if (!a || a.relation!==edge.relationId || a.subject!==edge.source || a.value!==edge.target ||
          !state.entityIds.has(edge.source) || !state.entityIds.has(edge.target)) {rejected=true;continue;}
      record('causal',edge.relationId,edge.scope,[edge.assertionRef]);
    }
    for (const part of semantics.opposition?.components || []) for (const edge of part.relations || []) {
      const a=state.assertions.get(edge.assertionRef);
      // A traceability `conflict:*` link is a derived presentation link, not an
      // assertion ID. Prove the explicit underlying `conflictsWith` witness
      // from the TWO visible assertion nodes and scoped source assertions.
      if (!a && edge.relationId === 'conflictsWith' && part.scope === 'visible-assertion-conflict') {
        const from = (projection.nodes || []).find(n=>n.id===edge.source && n.kind==='assertion');
        const to = (projection.nodes || []).find(n=>n.id===edge.target && n.kind==='assertion');
        const parent = state.assertions.get(from?.assertionRef);
        if (!parent || !state.assertions.has(to?.assertionRef) ||
            !Array.isArray(parent.conflictsWith) || !parent.conflictsWith.includes(to.assertionRef)) {
          rejected=true;continue;
        }
        record('opposition','conflictsWith',part.scope,[from.assertionRef,to.assertionRef]);
        continue;
      }
      if (!a || a.relation!==edge.relationId || a.subject!==edge.source || a.value!==edge.target ||
          !state.entityIds.has(edge.source) || !state.entityIds.has(edge.target)) {rejected=true;continue;}
      record('opposition',edge.relationId,part.scope,[edge.assertionRef]);
    }
  }
  proofs.sort((a,b)=>cmp(a.channel,b.channel)||cmp(a.ruleId,b.ruleId)||
    cmp(a.entityId||'',b.entityId||'')||cmp(a.assertionRefs.join(','),b.assertionRefs.join(',')));
  const truncated=Boolean(projection.truncated||hierarchy?.truncated||attrs?.truncated||exceeded);
  // A mixed invalid candidate never becomes a partially qualified result.
  const status = rejected?'refused':proofs.length?(truncated?'partial':'qualified'):'unqualified';
  return {
    version:'1.0',derived:true,authoritative:false,publicationAuthorized:false,
    status,proofs:rejected?[]:proofs,proofCount:rejected?0:proofs.length,
    truncated,warning:rejected?
      'Preuves de projection incohérentes : aucune qualification n’est retenue.' :
      truncated?'Vue partielle : ne pas conclure à l’absence de relations hors de la sélection visible.' :
      proofs.length?'Les canaux affichés sont liés à des témoins visibles et aux règles examinées ou aux conflits explicites attestés; aucune autorisation de publier.' :
      'Aucun encodage sémantique examiné n’est actif pour cette vue. La disposition ordinaire reste technique.',
  };
}
