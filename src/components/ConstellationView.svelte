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

  const VIEW_WIDTH = 960;
  const VIEW_HEIGHT = 560;
  const BASE_CENTER_X = 480;
  const HISTORY_CENTER_X = 540;
  const CENTER_Y = 280;
  const HISTORY_X = 76;

  let data = null,
    busy = false,
    error = '',
    controller,
    requestedKey = '',
    resolvedKey = '',
    resolvedCenterKey = 'root',
    resolvedPathDepth = 0,
    arrival = { dx: 0, dy: 0 };

  $: current = path.at(-1) || null;
  $: requestKey = current
    ? JSON.stringify({ context, lensRef, focus: current.focus, groupId: current.groupId, limit })
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
      const payload = JSON.parse(key);
      const response = await fetch('/api/constellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  function targetCenterX(depth) {
    return depth > 1 ? HISTORY_CENTER_X : BASE_CENTER_X;
  }

  function navigate(node) {
    const nextDepth = path.length + 1;
    arrival = {
      dx: node.x - targetCenterX(nextDepth),
      dy: node.y - CENTER_Y,
    };
    const entry = { focus: node.target.focus, groupId: node.target.groupId, label: node.label };
    path = [...path, entry];
    if (entry.focus.kind === 'entity' && !entry.groupId) inspect(entry.focus.id);
  }

  function go(index, fromHistory = false) {
    const nextPath = index < 0 ? [] : path.slice(0, index + 1);
    const nextDepth = nextPath.length;
    arrival = fromHistory
      ? { dx: HISTORY_X - targetCenterX(nextDepth), dy: 0 }
      : { dx: 0, dy: 0 };
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
    if (node.kind === 'group') return 38;
    if (node.kind === 'source') return 31;
    return 28;
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

      {#each positioned as node, i (nodeKey(node))}
        <line
          class="constellation-edge"
          x1={centerX}
          y1={CENTER_Y}
          x2={node.x}
          y2={node.y}
          pathLength="1"
          style={`--edge-delay:${Math.min(i * 18, 160)}ms`}
        />
      {/each}

      {#if previousEntry}
        <g
          class="constellation-history-node"
          role="button"
          tabindex="0"
          aria-label={'Revenir à ' + previousEntry.label}
          style={`transform:translate(${HISTORY_X}px, ${CENTER_Y}px)`}
          on:click={() => go(resolvedPathDepth - 2, true)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go(resolvedPathDepth - 2, true);
            }
          }}
        >
          <circle r="24" />
          <text class="history-mark" y="5" text-anchor="middle">‹</text>
          <text class="history-kicker" y="-35" text-anchor="middle">précédent</text>
          {#each splitLabel(previousEntry.label, 15) as line, i}<text class="history-label" y={43 + i * 13} text-anchor="middle">{line}</text>{/each}
          <title>Revenir à {previousEntry.label}</title>
        </g>
      {/if}

      <g class="constellation-center-frame" style={`transform:translate(${centerX}px, ${CENTER_Y}px)`}>
        {#key resolvedCenterKey}
          <g
            class="constellation-center constellation-center-motion"
            style={`--from-x:${arrival.dx}px;--from-y:${arrival.dy}px`}
          >
            <circle r="70" />
            {#each splitLabel(model.center.label, 18) as line, i}<text y={-5 + i * 17} text-anchor="middle">{line}</text>{/each}
            {#if model.center.kind !== 'group'}<text class="node-kind" y="42" text-anchor="middle">{model.center.kind}</text>{/if}
          </g>
        {/key}
      </g>

      {#each positioned as node, i (nodeKey(node))}
        <g
          class={nodeClass(node)}
          role="button"
          tabindex="0"
          style={`transform:translate(${node.x}px, ${node.y}px);--enter-delay:${Math.min(i * 22, 190)}ms`}
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
            {#each splitLabel(node.label) as line, i}<text class="node-label" y={radius(node) + 18 + i * 14} text-anchor="middle">{line}</text>{/each}
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
