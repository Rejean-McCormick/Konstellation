<script>
  // Read-only view of the SERVER-VERIFIED visual plan. Does not infer meanings
  // from labels, positions, colors, profile scores, or hidden sources.
  export let data;
  $: plan = data?.visualSemantics || null;
  $: byId = new Map((data?.nodes || []).map((node) => [node.id, node]));
  const MAX_COLUMN_NODES = 12;
  const labelOf = (id) => String(byId.get(id)?.label || id);
  const clip = (value, max = 25) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
  function picture(component) {
    const left = component.left.slice(0, MAX_COLUMN_NODES);
    const right = component.right.slice(0, MAX_COLUMN_NODES);
    const coords = new Map();
    left.forEach((id, i) => coords.set(id, { x: 165, y: 52 + i * 63 }));
    right.forEach((id, i) => coords.set(id, { x: 575, y: 52 + i * 63 }));
    return { left, right, coords,
      height: Math.max(155, 105 + (Math.max(left.length, right.length) - 1) * 63),
      clipped: left.length !== component.left.length || right.length !== component.right.length };
  }
  const signed = (value) => value > 0 ? '+ (augmente)' : value < 0 ? '− (diminue)' : '? (signe inconnu)';
</script>

{#if plan}
  <section class="semantic-encodings" aria-label="Significations visuelles vérifiées">
    <div class="semantic-heading">
      <strong>Signification des positions et relations</strong>
      <small>Projection dérivée, non canonique · règles locales explicites</small>
    </div>
    {#if plan.status === 'no-qualified-encoding' && !plan.opposition.unfulfilled.length}
      <p class="semantic-warning">Aucun encodage spatial ou causal qualifié dans cette sélection. Le placement des autres nœuds reste technique et ne permet pas de déduire un conflit ou une causalité.</p>
    {/if}
    {#each plan.opposition.components as component, index}
      {@const pic = picture(component)}
      <div class="semantic-group">
        <div class="semantic-intro"><strong>Oppositions attestées — groupe {index + 1}</strong><span>Domaine : {component.scope}</span></div>
        <p class="semantic-note">{component.explanation}</p>
        <div class="semantic-canvas">
          <svg viewBox={`0 0 740 ${pic.height}`} role="img" aria-label={`Relations d'opposition explicitement attestées pour ${component.scope}`}>
            <text x="165" y="22" text-anchor="middle" class="axis-label">Côté A</text>
            <text x="575" y="22" text-anchor="middle" class="axis-label">Côté B</text>
            {#each component.relations as relation (relation.assertionRef)}
              {@const left = pic.coords.get(relation.source)}
              {@const right = pic.coords.get(relation.target)}
              {#if left && right}
                <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} class="opposed-edge" />
              {/if}
            {/each}
            {#each [...pic.left, ...pic.right] as id (id)}
              {@const pos = pic.coords.get(id)}
              <g>
                <title>{labelOf(id)}</title>
                <rect x={pos.x - 120} y={pos.y - 17} width="240" height="34" rx="8" class="opposed-node" />
                <text x={pos.x} y={pos.y + 4} text-anchor="middle" class="node-label">{clip(labelOf(id))}</text>
              </g>
            {/each}
          </svg>
        </div>
        {#if pic.clipped}<p class="semantic-warning">Aperçu borné à {MAX_COLUMN_NODES} éléments par côté. Toutes les relations visibles restent dans le tableau ci-dessous.</p>{/if}
        <details>
          <summary>Justification des {component.relations.length} opposition(s) — lecture accessible</summary>
          <ul>
            {#each component.relations as r (r.assertionRef)}
              <li><strong>{labelOf(r.source)}</strong> est opposé à <strong>{labelOf(r.target)}</strong> — témoin d'assertion : <code>{r.assertionRef}</code>, relation : <code>{r.relationId}</code>.</li>
            {/each}
          </ul>
        </details>
      </div>
    {/each}
    {#each plan.opposition.unfulfilled as issue, index}
      <div class="semantic-warning" role="status">
        <strong>Axe d'opposition non réalisable — groupe {index + 1}</strong>
        <p>Ces {issue.nodeIds.length} éléments présentent des oppositions incompatibles avec deux côtés. Aucun placement bipolaire trompeur n'est produit.</p>
        <details><summary>Relations concernées</summary><p>{issue.assertionRefs.join(' · ')}</p></details>
      </div>
    {/each}
    {#if plan.causalEdges.length}
      <div class="semantic-group">
        <strong>Influences causales expressément qualifiées</strong>
        <p class="semantic-note">Le sens de la flèche est celui de la relation déclarée. Le signe représente une influence, pas un degré de vérité.</p>
        <ul>
          {#each plan.causalEdges as edge (edge.assertionRef)}
            <li><strong>{labelOf(edge.source)}</strong> → <strong>{labelOf(edge.target)}</strong> : {signed(edge.sign)}. <small>{edge.scope} · témoin {edge.assertionRef}</small></li>
          {/each}
        </ul>
      </div>
    {/if}
    <details class="semantic-legend">
      <summary>Légende et limites des encodages</summary>
      <ul>{#each plan.legend as entry}<li><strong>{entry.channel} :</strong> {entry.explanation}</li>{/each}</ul>
      <p>{plan.warning}</p>
    </details>
  </section>
{/if}

<style>
  .semantic-encodings { border:1px solid #bacac5; background:#f8faf8; border-radius:12px; padding:15px; margin:12px 0 18px; color:#263b33; }
  .semantic-heading { display:flex; flex-wrap:wrap; gap:6px 16px; justify-content:space-between; }
  .semantic-heading strong { font-size:15px; }
  .semantic-heading small { color:#576b63; }
  .semantic-group { padding:12px 0; border-top:1px solid #d5e1d9; margin-top:12px; }
  .semantic-intro { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; }
  .semantic-note { font-size:13px; color:#4a6559; margin:7px 0; }
  .semantic-warning { background:#fff9e9; border:1px solid #e7d5a2; padding:10px; border-radius:8px; font-size:13px; margin:10px 0; }
  .semantic-warning p { margin:4px 0; }
  .semantic-canvas { max-width:100%; overflow:auto; background:#fff; border:1px solid #d5e1d9; border-radius:8px; }
  .semantic-canvas svg { min-width:540px; max-width:740px; width:100%; height:auto; }
  .axis-label { font-size:15px; font-weight:650; fill:#34554c; }
  .opposed-edge { stroke:#668c80; stroke-width:2.5; stroke-dasharray:6 5; }
  .opposed-node { fill:#ebf3ee; stroke:#527a6b; stroke-width:1.5; }
  .node-label { fill:#183f36; font-size:12px; }
  details { margin-top:10px; }
  summary { cursor:pointer; color:#315d51; font-weight:600; }
  ul { padding-left:20px; }
  li { margin:8px 0; line-height:1.5; overflow-wrap:anywhere; }
  code { font-size:12px; }
  .semantic-legend { border-top:1px solid #d5e1d9; padding-top:6px; }
</style>
