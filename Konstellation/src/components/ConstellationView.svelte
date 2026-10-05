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
  export let authToken = '';
  export let kristal = '';

  const VIEW_WIDTH = 1000;
  const VIEW_HEIGHT = 620;
  const BASE_CENTER_X = 500;
  const HISTORY_CENTER_X = 565;
  const CENTER_Y = 300;
  const HISTORY_X = 82;

  let data = null,
    busy = false,
    error = '',
    controller,
    requestedKey = '',
    resolvedKey = '',
    resolvedCenterKey = 'root',
    resolvedPathDepth = 0;

  $: current = path.at(-1) || null;
  $: requestKey = current
    ? JSON.stringify({ context, lensRef, focus: current.focus, groupId: current.groupId, limit, kristal })
    : '';
  $: if (requestKey && requestKey !== requestedKey) load(requestKey, path.length);

  $: rootSatellites = rows.slice(0, limit).map((r) => ({
    id: r.entityId,
    kind: 'entity',
    label: labels[r.entityId] || r.entityId,
    count: null,
    target: { focus: { kind: 'entity', id: r.entityId }, groupId: null },
    salience: null,
    evidence: null,
  }));
  $: rootModel = {
    center: { label: rootLabel, kind: 'group', description: 'Sélection courante' },
    satellites: rootSatellites,
    totalCandidates: rows.length,
    truncated: rows.length > rootSatellites.length,
  };
  $: if (!current) data = rootModel;

  $: model = data || rootModel;
  $: previousEntry = resolvedPathDepth > 1 ? path[resolvedPathDepth - 2] : null;
  $: centerX = previousEntry ? HISTORY_CENTER_X : BASE_CENTER_X;
  $: positioned = layoutConstellation(
    model?.satellites || [],
    VIEW_WIDTH,
    VIEW_HEIGHT,
    centerX,
    CENTER_Y,
  );

  async function load(key, depth) {
    controller?.abort();
    requestedKey = key;
    controller = new AbortController();
    busy = true;
    error = '';
    try {
      const { kristal: _kristal, ...payload } = JSON.parse(key);
      const response = await fetch('/api/constellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(kristal ? { 'X-Konstellation-Kristal': kristal } : {}) },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.error?.message || 'Constellation indisponible.');
      if (requestedKey === key) {
        data = value;
        resolvedKey = key;
        resolvedPathDepth = depth;
        resolvedCenterKey = JSON.stringify({ focus: payload.focus, groupId: payload.groupId });
      }
    } catch (e) {
      if (e.name !== 'AbortError' && requestedKey === key) error = e.message;
    } finally {
      if (requestedKey === key) busy = false;
    }
  }

  function navigate(node) {
    const entry = { focus: node.target.focus, groupId: node.target.groupId, label: node.label };
    path = [...path, entry];
    if (entry.focus.kind === 'entity' && !entry.groupId) inspect(entry.focus.id);
  }

  function go(index) {
    const nextPath = index < 0 ? [] : path.slice(0, index + 1);
    const nextDepth = nextPath.length;
    path = nextPath;

    if (!nextDepth) {
      controller?.abort();
      requestedKey = '';
      resolvedKey = '';
      resolvedPathDepth = 0;
      resolvedCenterKey = 'root';
      busy = false;
      error = '';
      data = rootModel;
      return;
    }

    const entry = path.at(-1);
    if (entry?.focus.kind === 'entity' && !entry.groupId) inspect(entry.focus.id);
  }

  function radius(node) {
    if (node.kind === 'group') return 41;
    if (node.kind === 'source') return 34;
    return 31;
  }
  function nodeClass(node) {
    return `constellation-node kind-${node.kind}`;
  }
  function nodeKey(node) {
    return JSON.stringify({ id: node.id, kind: node.kind, target: node.target });
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
  {:else if model}
    <svg class:loading={busy} class="constellation-canvas" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={'Constellation autour de ' + model.center.label}>
      {#if previousEntry}
        <path
          class="constellation-history-edge"
          d={`M ${HISTORY_X + 27} ${CENTER_Y} C 215 ${CENTER_Y}, ${centerX - 150} ${CENTER_Y}, ${centerX - 72} ${CENTER_Y}`}
          pathLength="1"
        />
      {/if}

      {#each positioned as node (nodeKey(node))}
        <line
          class="constellation-edge"
          x1={centerX}
          y1={CENTER_Y}
          x2={node.x}
          y2={node.y}
          pathLength="1"
        />
      {/each}

      {#if previousEntry}
        <g
          class="constellation-history-node"
          role="button"
          tabindex="0"
          aria-label={'Revenir à ' + previousEntry.label}
          transform={`translate(${HISTORY_X} ${CENTER_Y})`}
          on:click={() => go(resolvedPathDepth - 2)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go(resolvedPathDepth - 2);
            }
          }}
        >
          <circle r="24" />
          <text class="history-mark" y="5" text-anchor="middle">‹</text>
          <text class="history-kicker" y="-35" text-anchor="middle">précédent</text>
          {#each splitLabel(previousEntry.label, 15) as line, i}<text class="history-label" y={44 + i * 16} text-anchor="middle">{line}</text>{/each}
          <title>Revenir à {previousEntry.label}</title>
        </g>
      {/if}

      <g class="constellation-center-frame" transform={`translate(${centerX} ${CENTER_Y})`}>
        {#key resolvedCenterKey}
          <g class="constellation-center constellation-center-motion">
            <circle r="76" />
            {#each splitLabel(model.center.label, 18) as line, i}<text y={-5 + i * 20} text-anchor="middle">{line}</text>{/each}
            {#if model.center.kind !== 'group'}<text class="node-kind" y="42" text-anchor="middle">{model.center.kind}</text>{/if}
          </g>
        {/key}
      </g>

      {#each positioned as node (nodeKey(node))}
        <g
          class={nodeClass(node)}
          role="button"
          tabindex="0"
          transform={`translate(${node.x} ${node.y})`}
          aria-label={'Explorer ' + node.label}
          on:click={() => navigate(node)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(node);
            }
          }}
        >
          <g class="constellation-node-motion">
            <circle r={radius(node)} />
            {#if node.count !== null}<text class="node-count" y="4" text-anchor="middle">{node.count}</text>{:else}<text class="node-mark" y="5" text-anchor="middle">{node.kind === 'source' ? '◫' : node.kind === 'group' ? '✦' : '•'}</text>{/if}
            {#each splitLabel(node.label) as line, i}<text class="node-label" y={radius(node) + 22 + i * 19} text-anchor="middle">{line}</text>{/each}
            <title>{node.label}{node.salience ? ` · score ${node.salience.score} · ${node.evidence.assertionCount} assertion(s)` : ''}</title>
          </g>
        </g>
      {/each}
    </svg>
    <div class="constellation-footer">
      <span>{model.satellites.length} satellite{model.satellites.length > 1 ? 's' : ''}{model.truncated ? ` sur ${model.totalCandidates}` : ''}</span>
      <span>{busy ? 'Transition vers le nouveau centre…' : 'Classement déterministe · sources et politique de lecture préservées'}</span>
    </div>
    {#if !current}<p class="hint constellation-hint">Cliquez sur une entité pour la placer au centre. Les niveaux suivants regroupent relations, thèmes et sources sans créer de nouvelles assertions.</p>{/if}
  {/if}
</div>
