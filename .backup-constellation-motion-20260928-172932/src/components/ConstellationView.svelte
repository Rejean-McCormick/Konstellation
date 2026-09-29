<script>
  import { onDestroy } from 'svelte';
  import { layoutConstellation, splitLabel } from '../lib/constellation/layout.js';
  export let rows = [];
  export let labels = {};
  export let rootLabel = 'Sélection';
  export let context;
  export let lensRef;
  export let path = [];
  export let limit = 8;
  export let inspect = () => {};

  let data = null,
    busy = false,
    error = '',
    controller,
    loadedKey = '';

  $: current = path.at(-1) || null;
  $: requestKey = current
    ? JSON.stringify({ context, lensRef, focus: current.focus, groupId: current.groupId, limit })
    : '';
  $: if (requestKey && requestKey !== loadedKey) load(requestKey);
  $: rootSatellites = rows.slice(0, limit).map((r) => ({
    id: r.entityId,
    kind: 'entity',
    label: labels[r.entityId] || r.entityId,
    count: null,
    target: { focus: { kind: 'entity', id: r.entityId }, groupId: null },
    salience: null,
    evidence: null,
  }));
  $: model = current
    ? data
    : {
        center: { label: rootLabel, kind: 'group', description: 'Sélection courante' },
        satellites: rootSatellites,
        totalCandidates: rows.length,
        truncated: rows.length > rootSatellites.length,
      };
  $: positioned = layoutConstellation(model?.satellites || []);

  async function load(key) {
    controller?.abort();
    loadedKey = key;
    controller = new AbortController();
    loadedKey = key;
    busy = true;
    error = '';
    data = null;
    try {
      const payload = JSON.parse(key);
      const response = await fetch('/api/constellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.error?.message || 'Constellation indisponible.');
      if (loadedKey === key) data = value;
    } catch (e) {
      if (e.name !== 'AbortError' && loadedKey === key) error = e.message;
    } finally {
      if (loadedKey === key) busy = false;
    }
  }

  function navigate(node) {
    const entry = { focus: node.target.focus, groupId: node.target.groupId, label: node.label };
    path = [...path, entry];
    if (entry.focus.kind === 'entity' && !entry.groupId) inspect(entry.focus.id);
  }
  function go(index) {
    path = index < 0 ? [] : path.slice(0, index + 1);
    const entry = path.at(-1);
    if (entry?.focus.kind === 'entity' && !entry.groupId) inspect(entry.focus.id);
  }
  function radius(node) {
    if (node.kind === 'group') return 38;
    if (node.kind === 'source') return 31;
    return 28;
  }
  function nodeClass(node) {
    return `constellation-node kind-${node.kind}`;
  }
  function onLimit(event) {
    limit = Number(event.currentTarget.value);
  }

  onDestroy(() => controller?.abort());
</script>

<div class="constellation-view" aria-busy={busy}>
  <div class="constellation-toolbar">
    <nav class="constellation-breadcrumb" aria-label="Chemin de constellation">
      <button on:click={() => go(-1)}>Sélection</button>
      {#each path as item, i}<span>›</span><button class:current={i === path.length - 1} on:click={() => go(i)}>{item.label}</button>{/each}
    </nav>
    <label class="satellite-limit">
      <span>Satellites <strong>{limit}</strong></span>
      <input aria-label="Nombre maximal de satellites" type="range" min="3" max="25" step="1" value={limit} on:input={onLimit} />
    </label>
  </div>

  {#if error}<div class="constellation-message error">{error}</div>
  {:else if busy && !model}<div class="constellation-message">Calcul de la constellation…</div>
  {:else if model}
    <svg class="constellation-canvas" viewBox="0 0 900 560" role="img" aria-label={'Constellation autour de ' + model.center.label}>
      {#each positioned as node}<line class="constellation-edge" x1="450" y1="280" x2={node.x} y2={node.y} />{/each}
      <g class="constellation-center" transform="translate(450 280)">
        <circle r="70" />
        {#each splitLabel(model.center.label, 18) as line, i}<text y={-5 + i * 17} text-anchor="middle">{line}</text>{/each}
        {#if model.center.kind !== 'group'}<text class="node-kind" y="42" text-anchor="middle">{model.center.kind}</text>{/if}
      </g>
      {#each positioned as node}
        <g class={nodeClass(node)} role="button" tabindex="0" transform={`translate(${node.x} ${node.y})`} aria-label={'Explorer ' + node.label} on:click={() => navigate(node)} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(node); } }}>
          <circle r={radius(node)} />
          {#if node.count !== null}<text class="node-count" y="4" text-anchor="middle">{node.count}</text>{:else}<text class="node-mark" y="5" text-anchor="middle">{node.kind === 'source' ? '◫' : node.kind === 'group' ? '✦' : '•'}</text>{/if}
          {#each splitLabel(node.label) as line, i}<text class="node-label" y={radius(node) + 18 + i * 14} text-anchor="middle">{line}</text>{/each}
          <title>{node.label}{node.salience ? ` · score ${node.salience.score} · ${node.evidence.assertionCount} assertion(s)` : ''}</title>
        </g>
      {/each}
    </svg>
    <div class="constellation-footer">
      <span>{model.satellites.length} satellite{model.satellites.length > 1 ? 's' : ''}{model.truncated ? ` sur ${model.totalCandidates}` : ''}</span>
      <span>Classement déterministe · sources et politique de lecture préservées</span>
    </div>
    {#if !current}<p class="hint constellation-hint">Cliquez sur une entité pour la placer au centre. Les niveaux suivants regroupent relations, thèmes et sources sans créer de nouvelles assertions.</p>{/if}
  {/if}
</div>
