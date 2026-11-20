<script>
  export let data;
  export let inspect = () => {};
  let treeRoot;
  let activeIndex = 0;
  let compareMode = 'semantic'; // only meaningful when K5 supplies a reviewed hierarchy

  $: byId = Object.fromEntries((data.nodes || []).map((node) => [node.id, node]));
  $: qualifiedHierarchy = data.hierarchySemantics?.status === 'reviewed-visible-hierarchy' ? data.hierarchySemantics : null;
  $: showSemantic = Boolean(qualifiedHierarchy && compareMode === 'semantic');
  $: rows = showSemantic
    ? flatten(qualifiedHierarchy.roots, qualifiedHierarchy.edges, qualifiedHierarchy.nodeIds)
    : flatten(data.roots || [], data.edges || [], (data.nodes || []).map(n => n.id));
  $: if (activeIndex >= rows.length) activeIndex = Math.max(0, rows.length - 1);

  function flatten(roots, edges, includedIds) {
    const children = edges.reduce((map, edge) => { (map[edge.source] ??= []).push(edge); return map; }, {});
    const output = []; const visited = new Set();
    const walk = (id, depth, via = null, parentIndex = null) => {
      if (visited.has(id) || output.length >= 1200) return;
      visited.add(id);
      const index = output.length;
      output.push({ id, depth, via, parentIndex });
      for (const edge of children[id] || []) walk(edge.target, Math.min(depth + 1, 32), edge, index);
    };
    for (const root of roots) walk(root, 0);
    for (const id of includedIds || []) if (!visited.has(id)) walk(id, 0);
    return output;
  }

  function focusIndex(index) {
    if (!rows.length) return;
    activeIndex = Math.max(0, Math.min(rows.length - 1, index));
    queueMicrotask(() => treeRoot?.querySelector(`[data-tree-index="${activeIndex}"]`)?.focus());
  }

  function keyTree(event, row, index) {
    if (event.key === 'ArrowDown') { event.preventDefault(); focusIndex(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusIndex(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusIndex(0); }
    else if (event.key === 'End') { event.preventDefault(); focusIndex(rows.length - 1); }
    else if (event.key === 'ArrowRight') {
      const next = rows[index + 1];
      if (next && next.depth > row.depth) { event.preventDefault(); focusIndex(index + 1); }
    } else if (event.key === 'ArrowLeft' && row.parentIndex != null) {
      event.preventDefault(); focusIndex(row.parentIndex);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); inspect(row.id);
    }
  }
</script>

{#if data.hierarchySemantics?.status === 'constraints-unfulfilled'}
  <p class="hint" role="status">Hiérarchie non qualifiée : {data.hierarchySemantics.unfulfilled.join(', ')}. Les relations brutes sont conservées, sans imposer un faux ordre.</p>
{/if}
{#if qualifiedHierarchy}
  <p class="hint" role="status">Hiérarchie examinée : {qualifiedHierarchy.explanation} {#if qualifiedHierarchy.truncated}Vue partielle : des relations peuvent manquer.{/if}</p>
  <div class="renderer-stack" aria-label="Comparaison K8 entre relations brutes et hiérarchie examinée">
    <p class="hint">K8 · Règle : {qualifiedHierarchy.ruleId} · {qualifiedHierarchy.edges.length} arcs justifiés dans la vue visible. Ce n’est ni une affirmation canonique ni une autorisation de publication.</p>
    <div class="renderer-row">
      <button type="button" aria-pressed={compareMode === 'source'} on:click={() => compareMode = 'source'}>Avant : relations visibles brutes</button>
      <button type="button" aria-pressed={compareMode === 'semantic'} on:click={() => compareMode = 'semantic'}>Après : hiérarchie examinée</button>
    </div>
    {#if compareMode === 'source'}
      <p class="hint">Disposition de navigation non sémantique : la position verticale n’encode pas une parenté, même si des relations existent.</p>
    {:else}
      <p class="hint">Chaque arc parent → enfant est relié à ses références d’assertion visibles. Les relations hors vue ne sont jamais déduites.</p>
    {/if}
  </div>
{/if}
<div bind:this={treeRoot} class="renderer-stack" data-renderer="tree" role="tree" aria-label={showSemantic ? 'Hiérarchie de relations examinées' : 'Structure de navigation non qualifiée'}>
  {#each rows as row, index}
    <div
      class={`renderer-row tree-row tree-depth-${Math.min(row.depth, 12)}`}
      role="treeitem"
      tabindex={index === activeIndex ? 0 : -1}
      aria-level={row.depth + 1}
      aria-label={byId[row.id]?.label || row.id}
      data-tree-index={index}
      on:focus={() => activeIndex = index}
      on:click={() => inspect(row.id)}
      on:keydown={(event) => keyTree(event, row, index)}
    >
      <span class="renderer-key" aria-hidden="true">{row.depth ? '↳' : '◆'}</span>
      <span class="tree-label">{byId[row.id]?.label || row.id}</span>
      {#if row.via}
        <small>{showSemantic ? `${qualifiedHierarchy.relationId} · témoins : ${row.via.assertionRefs.join(', ')}` : row.via.relationLabel}</small>
      {/if}
    </div>
  {:else}<p class="empty-renderer">Aucune racine hiérarchique visible.</p>{/each}
</div>
