<script>
  import { onDestroy } from 'svelte';
  import { exportArtifact } from '../lib/koreograph/exports.mjs';
  export let prepared;
  export let time = 0;
  export let locale = 'fr';
  let consent = false;
  let generation = 0;
  let busy = false;
  let error = false;
  let files = [];
  $: en = locale === 'en';
  $: formats = [
    ...(prepared.score ? [['score', 'Score JSON']] : []),
    ['html', 'HTML'], ['svg', 'SVG'], ['png', 'PNG'],
    ['animated', en ? 'Animated SVG' : 'SVG animé'], ['bundle', 'Bundle JSON'],
  ];

  function clear() {
    generation++;
    busy = false;
    error = false;
    for (const file of files) URL.revokeObjectURL(file.url);
    files = [];
  }
  function file(name, data, mime) {
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mime }));
    return { url, name };
  }
  async function create(format) {
    if (!consent || busy) return;
    clear();
    const active = generation;
    busy = true;
    try {
      const artifact = await exportArtifact(prepared, format, time);
      if (active !== generation || !consent) return;
      files = [file(artifact.filename, artifact.data, artifact.mime),
        file(artifact.filename + '.receipt.json', JSON.stringify(artifact.receipt, null, 2), 'application/json')];
    } catch { if (active === generation) error = true; }
    finally { if (active === generation) busy = false; }
  }
  onDestroy(clear);
</script>

<div class="exports">
  <label><input type="checkbox" checked={consent} on:change={event => { consent = event.currentTarget.checked; if (!consent) clear(); }} />
    {en ? 'I understand these local files may contain private data. An exported file cannot be revoked.' :
      'Je comprends que ces fichiers locaux peuvent contenir des données privées. Un fichier exporté ne peut plus être révoqué.'}
  </label>
  <div class="actions">
    {#each formats as [format, label]}
      <button type="button" disabled={!consent || busy} on:click={() => create(format)}>{label}</button>
    {/each}
  </div>
  {#if busy}<p role="status">{en ? 'Preparing the export…' : 'Préparation de l’export…'}</p>{/if}
  {#if error}<p role="alert">{en ? 'This format could not be exported.' : 'Ce format n’a pas pu être exporté.'}</p>{/if}
  {#if files.length}
    <ul aria-label={en ? 'Files ready to download' : 'Fichiers à télécharger'}>
      {#each files as file}
        <li><a href={file.url} download={file.name}>{file.name}</a></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .exports { margin-block: 1rem; }
  .actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-block: .5rem; }
</style>
