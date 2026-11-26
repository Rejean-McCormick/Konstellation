<script>
  import { onMount } from 'svelte';
  import { frameAt, renderSvg } from '../lib/koreograph/frame.mjs';
  export let bundle;
  export let time = 0;
  let stage;
  let reduced = false;
  let playing = false;
  let request;
  let origin;
  $: en = bundle.locale === 'en';
  $: milestones = [...new Set([0, ...bundle.segments.map(segment => segment.endMs)])];
  $: frame = frameAt(bundle, time, reduced);
  $: if (stage) show(stage, bundle, frame);

  function show(element, bundle, frame) {
    const xml = new DOMParser().parseFromString(renderSvg(bundle, frame), 'image/svg+xml');
    element.replaceChildren(document.importNode(xml.documentElement, true));
  }
  function pause() {
    cancelAnimationFrame(request);
    playing = false;
  }
  function seek(value) {
    pause();
    time = value;
  }
  function tick(now) {
    time = Math.min(bundle.durationMs, now - origin);
    if (time === bundle.durationMs) pause();
    else request = requestAnimationFrame(tick);
  }
  function toggle() {
    if (playing) return pause();
    if (time === bundle.durationMs) time = 0;
    origin = performance.now() - time;
    playing = true;
    request = requestAnimationFrame(tick);
  }
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = media.matches; if (reduced) pause(); };
    update();
    media.addEventListener('change', update);
    return () => { pause(); media.removeEventListener('change', update); };
  });
</script>

<div class="stage" bind:this={stage}></div>
<div class="controls">
  <button type="button" disabled={reduced} aria-pressed={playing} on:click={toggle}>
    {playing ? 'Pause' : en ? 'Play' : 'Lecture'}
  </button>
  <button type="button" aria-label={en ? 'Previous scene' : 'Scène précédente'} on:click={() => seek(milestones.findLast(value => value < time) ?? 0)}>‹</button>
  <button type="button" aria-label={en ? 'Next scene' : 'Scène suivante'} on:click={() => seek(milestones.find(value => value > time) ?? bundle.durationMs)}>›</button>
  <input aria-label={en ? 'Timeline position' : 'Position temporelle'} type="range" min="0" max={bundle.durationMs} value={time} on:input={event => seek(Number(event.currentTarget.value))} />
  <output>{(time / 1000).toFixed(1)} / {(bundle.durationMs / 1000).toFixed(1)} s</output>
</div>
{#if bundle.specialization}
  <p>{en ? 'Projection audit' : 'Audit de la projection'} · {bundle.specialization.status}</p>
  {#if bundle.specialization.assertionRefs.length}
    <details><summary>{en ? 'Visible evidence' : 'Preuves visibles'}</summary><ul>
      {#each bundle.specialization.assertionRefs as ref}<li>{ref}</li>{/each}
    </ul></details>
  {/if}
{/if}
<details>
  <summary>{en ? 'Scenes as text' : 'Scènes en texte'}</summary>
  <ol>
    {#each bundle.scenes as scene}
      <li>
        <strong>{scene.objects[0].label}</strong>
        {#if scene.truncated} ({en ? 'partial view' : 'vue partielle'}){/if}
        {#if scene.objects.length > 1}
          <ul>{#each scene.objects.slice(1) as node}<li>{node.label}</li>{/each}</ul>
        {/if}
      </li>
    {/each}
  </ol>
</details>

<style>
  .stage :global(svg) { display: block; width: 100%; max-height: 66vh; height: auto; background: #101c26; border-radius: .75rem; }
  .controls { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-block: .75rem; }
  .controls input { flex: 1; min-width: 8rem; }
</style>
