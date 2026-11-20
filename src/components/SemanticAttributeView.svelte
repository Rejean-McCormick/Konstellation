<script>
  // K4: consumes a code-reviewed, server-compiled attribute plan. It NEVER
  // reads raw attributes, labels, or arbitrary Kristal styles to infer meaning.
  export let data;
  $: plan = data?.attributeSemantics || null;
  $: rules = plan?.rules || [];
  $: xRule = rules.find((r) => r.channel === 'x');
  $: yRule = rules.find((r) => r.channel === 'y');
  $: sourceNodes = [
    ...(data?.nodes || []), ...(data?.rows || []),
    ...(data?.points || []).map((p) => p.entity).filter(Boolean),
    ...(data?.items || []).map((p) => p.entity).filter(Boolean),
    ...(data?.records || []).map((p) => p.entity).filter(Boolean)
  ];
  $: labels = new Map(sourceNodes.map((n) => [n.id, String(n.label || n.id)]));
  const palette = Object.freeze({ navy:'#324e80', teal:'#167b72', amber:'#a35b0f', rose:'#9b4866', slate:'#586574' });
  const symbols = Object.freeze({ circle:'●', square:'■', diamond:'◆', triangle:'▲' });
  const entry = (node, channel) => node.encodings.find((e) => e.channel === channel);
  const format = (value) => typeof value === 'number' ? String(Number(value.toPrecision(8))) : String(value);
  const textFor = (node, channel) => {
    const e=entry(node,channel);
    return e ? `${format(e.value)}${e.unit ? ` ${e.unit}` : ''} — ${e.assertionRefs.length ? `témoin : ${e.assertionRefs.join(', ')}` : 'type visible'}` : 'non disponible';
  };
  const labelFor = (node) => labels.get(node.id) || node.id;
  const colorFor = (node) => palette[entry(node,'color')?.token] || palette.slate;
  const colorClass = (node) => `tone-${Object.hasOwn(palette, entry(node,'color')?.token) ? entry(node,'color').token : 'slate'}`;
  const glyphFor = (node) => symbols[entry(node,'shape')?.token] || '●';
  const radiusFor = (node) => 10 + 13*(entry(node,'size')?.ratio ?? 0);
  const overlap = (x,y) => x.assertionRefs.some(ref => y.assertionRefs.includes(ref));
  function location(node) {
    const x=entry(node,'x'), y=entry(node,'y');
    if (!x || !y || !xRule || !yRule || xRule.scope !== yRule.scope || !overlap(x,y)) return null;
    // When metric distance is approved, both axes use an IDENTICAL pixels/unit
    // scale. Otherwise, each axis is normalized separately and distance is NOT
    // given a metric interpretation.
    if (plan.distance.qualified) {
      const spanX=xRule.max-xRule.min,spanY=yRule.max-yRule.min;
      const px=Math.min(610/spanX,350/spanY);
      return { x:100+(x.value-xRule.min)*px, y:430-(y.value-yRule.min)*px };
    }
    return {x:100+x.ratio*610,y:430-y.ratio*350};
  }
  $: plotted = plan?.nodes ? plan.nodes.map((node)=>({node,point:location(node)})).filter((v)=>v.point) : [];
  const clip = (s, max=20) => s.length > max ? `${s.slice(0,max-1)}…` : s;
</script>

{#if plan}
  <section class="attribute-panel" aria-label="Grammaire visuelle des attributs qualifiés">
    <header class="heading">
      <strong>Formes, couleurs, tailles et axes sémantiques</strong>
      <small>Attributs dérivés des données visibles · règles examinées localement · non canonique</small>
    </header>
    {#if plan.truncated}
      <p class="notice" role="status">Cette sélection dépasse le budget de vérification des attributs. Aucun encodage partiel susceptible d’être trompeur n’est émis.</p>
    {:else if !plan.nodes.length}
      <p class="notice">Aucune valeur éligible aux canaux actuellement approuvés ; les styles ordinaires restent décoratifs.</p>
    {:else}
      {#if xRule && yRule && plotted.length}
        <div class="visual-chart">
          <svg viewBox="0 0 820 500" role="img" aria-label={`Positions qualifiées : ${xRule.dimension} en abscisse et ${yRule.dimension} en ordonnée ; ${plan.distance.qualified ? 'distance métrique qualifiée' : 'distance non mesurable'}`}>
            <line x1="100" y1="430" x2="720" y2="430" class="axis" />
            <line x1="100" y1="430" x2="100" y2="75" class="axis" />
            <text x="412" y="476" text-anchor="middle" class="axis-label">X : {xRule.dimension} ({xRule.unit}) · {xRule.min} à {xRule.max}</text>
            <text x="23" y="260" transform="rotate(-90 23 260)" text-anchor="middle" class="axis-label">Y : {yRule.dimension} ({yRule.unit}) · {yRule.min} à {yRule.max}</text>
            {#each plotted as item (item.node.id)}
              {@const p=item.point}
              {@const node=item.node}
              {@const r=radiusFor(node)}
              <g>
                <title>{labelFor(node)} — {textFor(node,'x')} / {textFor(node,'y')}</title>
                {#if entry(node,'shape')?.token === 'square'}
                  <rect x={p.x-r} y={p.y-r} width={2*r} height={2*r} fill={colorFor(node)} class="mark" />
                {:else if entry(node,'shape')?.token === 'diamond'}
                  <polygon points={`${p.x},${p.y-r} ${p.x+r},${p.y} ${p.x},${p.y+r} ${p.x-r},${p.y}`} fill={colorFor(node)} class="mark" />
                {:else if entry(node,'shape')?.token === 'triangle'}
                  <polygon points={`${p.x},${p.y-r} ${p.x+r},${p.y+r} ${p.x-r},${p.y+r}`} fill={colorFor(node)} class="mark" />
                {:else}
                  <circle cx={p.x} cy={p.y} r={r} fill={colorFor(node)} class="mark" />
                {/if}
                <text x={p.x} y={p.y+r+19} text-anchor="middle" class="point-label">{clip(labelFor(node))}</text>
              </g>
            {/each}
          </svg>
        </div>
        <p class="meaning">
          {#if plan.distance.qualified}
            Les axes partagent l’unité et la même échelle géométrique : les distances euclidiennes entre points admissibles sont significatives dans ce domaine.
          {:else}
            Les deux coordonnées sont signifiantes, mais la distance visuelle entre les points n’est <strong>pas</strong> une mesure interprétable.
          {/if}
          Seules les coordonnées liées à une même assertion peuvent produire un point.
        </p>
      {:else if xRule || yRule}
        <p class="meaning">Un seul axe ou aucune paire de coordonnées attestée : les valeurs restent lisibles dans le tableau. Aucune géométrie bidimensionnelle n’est déduite.</p>
      {/if}
      <details class="attributes-table" open>
        <summary>Lecture accessible : {plan.nodes.length} élément(s) encodé(s)</summary>
        <div class="table-scroll"><table>
          <thead><tr><th scope="col">Élément</th><th scope="col">Forme / type</th><th scope="col">Couleur / catégorie</th><th scope="col">Taille / valeur</th><th scope="col">X</th><th scope="col">Y</th></tr></thead>
          <tbody>
            {#each plan.nodes as node (node.id)}
              <tr>
                <th scope="row">{labelFor(node)}</th>
                <td><span class={`symbol ${colorClass(node)}`}>{glyphFor(node)}</span> {textFor(node,'shape')}</td>
                <td>{textFor(node,'color')}</td>
                <td>{textFor(node,'size')}</td>
                <td>{textFor(node,'x')}</td>
                <td>{textFor(node,'y')}</td>
              </tr>
            {/each}
          </tbody>
        </table></div>
      </details>
    {/if}
    <details class="rule-details">
      <summary>Règles centrales, unités et limites</summary>
      <ul>{#each rules as rule (rule.id)}<li><strong>{rule.channel} · {rule.id}</strong> : {rule.explanation} Domaine : {rule.scope}.{#if rule.unit} Unité : {rule.unit}; intervalle : {rule.min} à {rule.max}.{/if}</li>{/each}</ul>
      <p>{plan.distance.explanation}</p>
      <p>{plan.warning}</p>
    </details>
  </section>
{/if}

<style>
  .attribute-panel{border:1px solid #b6c8d7;border-radius:12px;padding:14px;margin:12px 0 18px;background:#f8fafc;color:#25384c}
  .heading{display:flex;gap:6px 18px;flex-wrap:wrap;justify-content:space-between}
  .heading strong{font-size:15px}.heading small{color:#536c7d}
  .notice{padding:10px;border:1px solid #e2d3a0;background:#fff9eb;border-radius:8px;font-size:13px}
  .visual-chart{overflow:auto;background:#fff;border:1px solid #d5e0e9;border-radius:8px;margin-top:14px}
  .visual-chart svg{width:100%;min-width:600px;max-width:820px;height:auto}
  .axis{stroke:#395671;stroke-width:2}.axis-label{fill:#284b62;font-size:13px}.point-label{fill:#1c3445;font-size:12px}
  .mark{stroke:#1b3545;stroke-width:1.7}
  .meaning{font-size:13px;line-height:1.5;margin:9px 0;color:#42596b}
  summary{cursor:pointer;font-weight:600;color:#345b76}
  .table-scroll{max-width:100%;overflow:auto}
  table{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0}
  td,th{border:1px solid #d1dbe4;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  th{background:#ebf2f7}.symbol{font-size:17px}
  .tone-navy{color:#324e80}.tone-teal{color:#167b72}.tone-amber{color:#a35b0f}.tone-rose{color:#9b4866}.tone-slate{color:#586574}
  .rule-details{border-top:1px solid #d5e0e9;padding-top:10px;margin-top:12px}
  li{margin:5px 0;line-height:1.5}
</style>
