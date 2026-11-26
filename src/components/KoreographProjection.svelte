<script>
  import { onDestroy } from 'svelte';
  import KoreographPlayer from './KoreographPlayer.svelte';
  import { prepareProjection } from '../lib/koreograph/specialized.mjs';
  import KoreographExports from './KoreographExports.svelte';

  export let data;
  export let source;
  export let revision;
  export let locale = 'fr';
  let prepared;
  let busy = false;
  let error = false;
  let time = 0;
  let generation = 0;
  $: en = locale === 'en';

  async function toggle() {
    const active = ++generation;
    if (prepared) { prepared = undefined; return; }
    busy = true;
    error = false;
    time = 0;
    try {
      const result = await prepareProjection(data, source, locale, revision);
      if (active === generation) prepared = result;
    } catch { if (active === generation) error = true; }
    finally { if (active === generation) busy = false; }
  }
  onDestroy(() => { generation++; });
</script>

<section aria-label="Koreograph">
  <button type="button" disabled={busy} aria-expanded={Boolean(prepared)} on:click={toggle}>
    {prepared ? (en ? 'Close Koreograph' : 'Fermer Koreograph') : 'Koreograph'}
  </button>
  {#if error}<p role="alert">{en ? 'This projection could not be rendered.' : 'Cette projection n’a pas pu être rendue.'}</p>{/if}
  {#if prepared}
    <KoreographPlayer bundle={prepared.bundle} bind:time />
    <KoreographExports {prepared} {time} {locale} />
  {/if}
</section>
