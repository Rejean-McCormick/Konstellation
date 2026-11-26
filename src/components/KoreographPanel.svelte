<script>
  import { onDestroy } from 'svelte';
  import KoreographPlayer from './KoreographPlayer.svelte';
  import { SCORE_BYTES, targetKey, targetOf, validateScore } from '../lib/koreograph/contracts.mjs';
  import { prepare } from '../lib/koreograph/prepare.mjs';
  import KoreographExports from './KoreographExports.svelte';

  export let locale = 'fr';
  export let visit;
  export let available;
  export let reader;
  let opened = false;
  let title = '';
  let ratio = '16:9';
  let style = 'minimal';
  let density = 6;
  let revealLimit = 10;
  let scriptLimit = 6;
  let hops = 3;
  let recipe = 'exploration';
  let sourceText = '';
  let steps = [];
  let capturing = false;
  let lastVisit = null;
  let scriptVisit = null;
  let scriptIndex = 0;
  let scriptRequest;
  let request;
  let prepared;
  let error = '';
  let notice = '';
  let time = 0;
  let operation = 0;
  $: en = locale === 'en';
  $: if (capturing) record(visit);
  $: if (capturing && !available && !visit) stop();

  const diagnostics = {
    KOR_INVALID_SCORE: ['Partition invalide ou trop volumineuse.', 'Invalid or oversized Score.'],
    KOR_CONTEXT_CHANGED: ['Le contexte de lecture a changé.', 'The reading context changed.'],
    KOR_TARGET_UNAVAILABLE: ['Cette cible est indisponible depuis la scène précédente.', 'This target is unavailable from the previous scene.'],
    KOR_READ_REFUSED: ['Lecture refusée.', 'Reading denied.'],
    KOR_DURATION: ['La durée demandée est incompatible avec les étapes.', 'The requested duration does not fit the steps.'],
    KOR_PREPARE_TIMEOUT: ['Délai de préparation dépassé.', 'Preparation timed out.'],
    KOR_BUDGET_EXCEEDED: ['Budget de lecture dépassé.', 'Reading budget exceeded.'],
    KOR_EXPORT_UNSUPPORTED: ['Format hors des limites de cet export.', 'This export exceeded the format limits.'],
    EARLY_STOP: ['Parcours automatique arrêté faute de suite visible.', 'The automatic route ended when no next step was visible.'],
    SOURCE_TRUNCATED: ['La source a tronqué une vue.', 'The source truncated a view.'],
    PRESENTATION_TRUNCATED: ['La présentation a réduit une vue.', 'The presentation reduced a view.'],
    NEUTRAL_FADE: ['Un fondu neutre signale une correspondance ambiguë.', 'A neutral fade marks an ambiguous match.'],
  };
  function diagnostic(code) {
    return diagnostics[code]?.[en ? 1 : 0] || (en ? 'Koreograph could not complete this operation.' : 'Koreograph n’a pas pu terminer cette opération.');
  }
  function base(mode) {
    const current = reader.currentContext();
    return {
      format: 'koreograph.score/0.1',
      title: title.trim() || (en ? 'Constellation route' : 'Parcours Constellation'),
      locale: en ? 'en' : 'fr', source: current.source,
      presentation: { style, aspectRatio: ratio, durationMs: 'auto', density: mode === 'capture' ? 10 : density },
      mode,
    };
  }
  function write(mode, extra) {
    sourceText = JSON.stringify({ ...base(mode), ...extra }, null, 2);
  }
  function start(mode) {
    if (!available || !visit) return;
    scriptRequest?.abort();
    error = '';
    notice = '';
    steps = [{ action: 'focus', target: targetOf(visit) }];
    capturing = mode === 'capture';
    lastVisit = visit;
    scriptVisit = mode === 'script' ? visit : null;
    scriptLimit = density;
    scriptIndex = 0;
    write(mode, { steps });
  }
  function record(next) {
    if (!next || next === lastVisit) return;
    const target = targetOf(next);
    if (targetKey(target) === targetKey(lastVisit)) { lastVisit = next; return; }
    if (steps.length >= 12 || !lastVisit.satellites.slice(0, 10).some(node => targetKey(node.target) === targetKey(target))) {
      stop();
      notice = en ? 'Capture stopped at the last replayable scene.' : 'Capture arrêtée à la dernière scène rejouable.';
      return;
    }
    steps = [...steps, { action: 'follow', target }];
    lastVisit = next;
    write('capture', { steps });
  }
  function stop() {
    capturing = false;
  }
  async function readScriptScene(target, limit, action) {
    if (!scriptVisit || steps.length >= 12 || !target) return;
    const current = ++scriptIndex;
    const scope = reader.currentContext();
    scriptRequest?.abort();
    scriptRequest = new AbortController();
    const signal = AbortSignal.any([scriptRequest.signal, AbortSignal.timeout(5000)]);
    try {
      const next = await reader.constellation(target, limit, signal);
      if (scriptIndex !== current || reader.currentContext() !== scope || signal.aborted) return;
      if (targetKey(next) !== targetKey(target)) throw Error('KOR_TARGET_UNAVAILABLE');
      scriptVisit = next;
      scriptLimit = limit;
      steps = [...steps, action];
      write('script', { steps });
    } catch { if (current === scriptIndex) error = diagnostic('KOR_TARGET_UNAVAILABLE'); }
  }
  function appendFollow(event) {
    const index = event.currentTarget.value;
    event.currentTarget.value = '';
    const target = index === '' ? undefined : scriptVisit.satellites[Number(index)]?.target;
    if (target) void readScriptScene(target, density, { action: 'follow', target });
  }
  function appendReveal() {
    if (revealLimit > scriptLimit) {
      void readScriptScene(targetOf(scriptVisit), revealLimit, { action: 'reveal', limit: revealLimit });
    }
  }
  function addHold() {
    if (!scriptVisit || steps.length >= 12) return;
    steps = [...steps, { action: 'hold', durationMs: 1800 }];
    write('script', { steps });
  }
  async function readScore(event) {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!file) return;
    const current = ++operation;
    if (file.size > SCORE_BYTES) { error = diagnostic('KOR_INVALID_SCORE'); return; }
    try {
      const parsed = validateScore(await file.text());
      if (operation !== current) return;
      stop();
      scriptVisit = null;
      scriptIndex++;
      scriptRequest?.abort();
      sourceText = JSON.stringify(parsed, null, 2);
      error = '';
    } catch { if (operation === current) error = diagnostic('KOR_INVALID_SCORE'); }
  }
  function cancel() {
    operation += 1;
    request?.abort();
    request = null;
  }
  async function run(auto = false) {
    if (auto && (!available || !visit)) return;
    stop();
    if (auto) {
      scriptVisit = null;
      scriptIndex++;
      scriptRequest?.abort();
      write('auto', { auto: { start: targetOf(visit), recipe, maxHops: hops, seed: 0 } });
    }
    cancel();
    prepared = undefined;
    error = '';
    time = 0;
    const active = new AbortController();
    request = active;
    try {
      const result = await prepare(sourceText, reader, { signal: active.signal });
      if (request === active) prepared = result;
    } catch (cause) {
      if (request === active) error = diagnostic(cause.code) + (cause.step ? ' (' + cause.step + ')' : '');
    } finally {
      if (request === active) request = null;
    }
  }
  function toggle() {
    opened = !opened;
    if (!opened) {
      cancel();
      stop();
      scriptIndex++;
      scriptRequest?.abort();
      scriptVisit = null;
      lastVisit = null;
      prepared = undefined;
      sourceText = '';
      steps = [];
      error = '';
      notice = '';
    }
  }
  onDestroy(() => {
    cancel();
    scriptIndex++;
    scriptRequest?.abort();
  });
</script>

<section class="koreograph" aria-label="Koreograph">
  <button type="button" on:click={toggle} aria-expanded={opened}>{opened ? (en ? 'Close Koreograph' : 'Fermer Koreograph') : 'Koreograph'}</button>
  {#if opened}
    <div class="settings">
      <label>{en ? 'Title' : 'Titre'}<input bind:value={title} maxlength="500" /></label>
      <label>Format<select bind:value={ratio}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
      <label>Style<select bind:value={style}><option value="minimal">Minimal</option><option value="cinematic">{en ? 'Cinematic' : 'Cinématique'}</option><option value="didactic">{en ? 'Didactic' : 'Didactique'}</option></select></label>
      <label>{en ? 'Neighbors' : 'Voisins'}<select bind:value={density} disabled={capturing || Boolean(scriptVisit)}>
        {#each [3, 4, 5, 6, 7, 8, 9, 10] as count}<option value={count}>{count}</option>{/each}
      </select></label>
    </div>
    {#if !available}<p>{en ? 'Open a resolved constellation to start a route.' : 'Ouvrez une constellation résolue pour commencer un parcours.'}</p>{/if}
    <div class="buttons">
      <button type="button" disabled={!available || !visit || capturing} on:click={() => start('script')}>Script</button>
      <button type="button" disabled={!capturing && (!available || !visit)} on:click={() => capturing ? stop() : start('capture')}>
        {capturing ? (en ? 'Stop capture' : 'Terminer la capture') : 'Kapture'}
      </button>
      <select bind:value={recipe} aria-label={en ? 'Automatic recipe' : 'Recette automatique'}><option value="exploration">Exploration</option><option value="association">Association</option></select>
      <input type="number" min="1" max="6" bind:value={hops} aria-label={en ? 'Maximum hops' : 'Sauts maximum'} />
      <button type="button" disabled={!available || !visit || !hops || hops > 6} on:click={() => run(true)}>Auto</button>
    </div>
    {#if scriptVisit}
      <div class="buttons">
        <select aria-label={en ? 'Add a visible neighbor' : 'Ajouter un voisin visible'} disabled={steps.length >= 12} on:change={appendFollow}>
          <option value="">{en ? 'Follow a neighbor…' : 'Suivre un voisin…'}</option>
          {#each scriptVisit.satellites.slice(0, scriptLimit) as node, index}<option value={index}>{node.label}</option>{/each}
        </select>
        <select bind:value={revealLimit} aria-label={en ? 'Reveal up to' : 'Révéler jusqu’à'}>
          {#each [3, 4, 5, 6, 7, 8, 9, 10] as count}<option value={count}>{count}</option>{/each}
        </select>
        <button type="button" disabled={steps.length >= 12 || revealLimit <= scriptLimit} on:click={appendReveal}>{en ? 'Reveal' : 'Révéler'}</button>
        <button type="button" disabled={steps.length >= 12} on:click={addHold}>{en ? 'Add pause' : 'Ajouter une pause'}</button>
      </div>
    {/if}
    <label>{en ? 'Score JSON' : 'Partition JSON'}<textarea bind:value={sourceText} rows="7" maxlength={SCORE_BYTES} disabled={capturing}></textarea></label>
    <div class="buttons">
      <label>{en ? 'Import a Score' : 'Importer une partition'}<input type="file" accept=".json,application/json" on:change={readScore} /></label>
      <button type="button" disabled={!sourceText || Boolean(request)} on:click={() => run()}>{en ? 'Prepare replay' : 'Préparer le rejeu'}</button>
      {#if request}<button type="button" on:click={cancel}>{en ? 'Cancel' : 'Annuler'}</button>{/if}
    </div>
    {#if error}<p role="alert">{error}</p>{/if}
    {#if notice}<p role="status">{notice}</p>{/if}
    {#if prepared}
      {#key prepared}<KoreographPlayer bundle={prepared.bundle} bind:time />{/key}
      {#if prepared.bundle.warnings.length}<ul>{#each prepared.bundle.warnings as warning}<li>{diagnostic(warning)}</li>{/each}</ul>{/if}
      {#if prepared.score.mode === 'auto'}
        <button type="button" on:click={() => { sourceText = JSON.stringify(prepared.explicitScore, null, 2); }}>
          {en ? 'Edit generated route as Script' : 'Modifier le parcours généré en Script'}
        </button>
      {/if}
      {#key prepared}<KoreographExports {prepared} {time} {locale} />{/key}
    {/if}
  {/if}
</section>

<style>
  .koreograph { padding: 1rem; margin-top: .75rem; border: 1px solid currentColor; border-radius: .75rem; }
  .settings, .buttons { display: flex; flex-wrap: wrap; align-items: end; gap: .6rem; margin-block: .75rem; }
  label { display: grid; gap: .25rem; }
  input, select, textarea, button { font: inherit; }
  button, select, input { padding: .35rem .55rem; }
  input[type='number'] { width: 5em; }
  textarea { width: 100%; resize: vertical; font-family: monospace; }
</style>
