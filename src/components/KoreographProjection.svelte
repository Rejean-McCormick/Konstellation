<script>
  import { onMount, onDestroy } from 'svelte';
  import '../styles/koreograph.css';
  import { bindPresentationMode } from '../lib/koreograph/layout-mode.mjs';
  import { compileSpecialized, renderSpecialized, chapterAt, specializedHtml } from '../lib/koreograph/specialized.mjs';
  import { sha256Portable } from '../lib/koreograph/presentation.mjs';
  import { THEMES } from '../lib/koreograph/themes.mjs';

  // This component receives only the current, already filtered DTO from its parent.
  // It does not fetch, reconstruct a Bundle, or grant publication rights.
  export let data;
  export let locale = 'fr';
  let story, stage, svg, root, presentationButton, presentation;
  let themeId = 'signature', encoding = 'default', ratio = '16:9';
  let reduced = false, playing = false, time = 0, request;
  let error = false, consent = false, files = [], busy = false, generation = 0;
  $: en = locale === 'en';
  $: options = { themeId, ...(encoding === 'default' ? {} : { encoding }), motion: reduced ? 'reduced' : 'standard' };
  $: chapter = story ? chapterAt(story, time) : 0;
  $: if (story && stage) mountSvg(stage, story, options);

  function pause() {
    globalThis.cancelAnimationFrame?.(request);
    svg?.pauseAnimations?.();
    playing = false;
  }
  function clearFiles() {
    generation++;
    busy = false;
    for (const f of files) URL.revokeObjectURL(f.url);
    files = [];
  }
  function close() {
    presentation?.close(false); pause(); clearFiles(); consent = false; story = undefined; svg = undefined; time = 0;
  }
  function toggle() {
    if (story) return close();
    error = false;
    try { story = compileSpecialized(data, { aspectRatio: ratio }); time = 0; }
    catch { error = true; }
  }
  function mountSvg(element, current, opts) {
    pause(); clearFiles();
    try {
      const parsed = new DOMParser().parseFromString(renderSpecialized(current, opts), 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw Error('SVG invalide');
      const next = document.importNode(parsed.documentElement, true);
      element.replaceChildren(next);
      svg = next;
      svg.pauseAnimations?.();
      svg.setCurrentTime?.(time / 1000);
    } catch { element.replaceChildren(); svg = undefined; error = true; }
  }
  function seek(value) {
    pause();
    time = Math.max(0, Math.min(story.durationMs, value));
    svg?.setCurrentTime?.(time / 1000);
  }
  function step(offset) {
    const index = Math.max(0, Math.min(story.pages.length - 1, chapterAt(story,time) + offset));
    seek(story.pages[index].startMs);
  }
  function animate() {
    if (!playing || !svg) return;
    time = Math.min(story.durationMs, svg.getCurrentTime() * 1000);
    if (time >= story.durationMs) pause();
    else request = requestAnimationFrame(animate);
  }
  function play() {
    if (playing) return pause();
    if (reduced || !svg?.unpauseAnimations) return;
    if (time >= story.durationMs) seek(0);
    svg.unpauseAnimations(); playing = true; request = requestAnimationFrame(animate);
  }
  function changeRatio(event) {
    const value = event.currentTarget.value;
    try {
      const current = compileSpecialized(data, { aspectRatio: value });
      pause(); clearFiles(); ratio = value; time = 0; story = current;
    } catch { error = true; }
  }
  function localFile(name, content, mime) {
    return { name, url: URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime })) };
  }
  async function exportFile(format) {
    if (!story || !consent || busy) return;
    clearFiles(); error = false; busy = true;
    const active = generation, current = story, opts = { ...options }, index = chapterAt(story,time);
    try {
      let name, content, mime;
      if (format === 'html') { name = 'koreograph-projection.html'; mime = 'text/html'; content = specializedHtml(current, opts); }
      else if (format === 'animated') { name = 'koreograph-projection.animated.svg'; mime = 'image/svg+xml'; content = renderSpecialized(current, opts); }
      else if (format === 'storyboard') { name = 'koreograph-projection.storyboard.json'; mime = 'application/json'; content = JSON.stringify(current,null,2); }
      else {
        const markup = renderSpecialized(current,{ ...opts, chapterIndex:index });
        if (format === 'svg') { name = 'koreograph-projection.chapter.svg'; mime = 'image/svg+xml'; content = markup; }
        else if (format === 'png') {
          const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup); await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          canvas.getContext('2d').drawImage(image,0,0); content = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
          if (!content) throw Error('PNG indisponible'); name = 'koreograph-projection.chapter.png'; mime = 'image/png';
        } else throw Error('Format invalide');
      }
      if (active !== generation || !consent || current !== story) return;
      // For binary output, hash the bytes directly; text uses the shared portable digest.
      const hash = typeof content === 'string' ? sha256Portable(content) : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await content.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
      if (active !== generation || !consent || current !== story) return;
      const receipt = { format:'koreograph.specialized-receipt/0.1', sourceMode:'current-private-projection', publicationAuthorized:false, state:'review', runtimeQualified:false, compiler:current.compilerVersion, projectionSha256:current.projectionSha256, projectionKind:current.projectionKind, partial:current.partial, themeId:opts.themeId, encoding:opts.encoding || 'default', motion:opts.motion, aspectRatio:current.aspectRatio, output:{name,format,sha256:hash,...(['svg','png'].includes(format)?{chapter:index+1}: {})} };
      files = [localFile(name,content,mime),localFile(name+'.receipt.json',JSON.stringify(receipt,null,2),'application/json')];
    } catch { if (active === generation) error = true; }
    finally { if (active === generation) busy = false; }
  }
  onMount(() => {
    presentation = bindPresentationMode(root, presentationButton, { enterLabel:en ? 'Presentation mode' : 'Mode présentation', exitLabel:en ? 'Exit presentation' : 'Quitter la présentation' });
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = media.matches; if (reduced) pause(); };
    update(); media.addEventListener('change',update);
    return () => media.removeEventListener('change',update);
  });
  onDestroy(() => { presentation?.destroy(); pause(); clearFiles(); });
</script>

<section class="kg-specialized" aria-label="Koreograph" bind:this={root}>
  <div class="kg-header">
  <button type="button" aria-expanded={Boolean(story)} on:click={toggle}>{story ? (en ? 'Close Koreograph' : 'Fermer Koreograph') : 'Koreograph'}</button>
  <button type="button" class="kg-present-toggle" disabled={!story} bind:this={presentationButton}>{en ? 'Presentation mode' : 'Mode présentation'}</button>
  </div>
  {#if error}<p role="alert">{en ? 'The projection or export could not be rendered.' : 'La projection ou l’export n’a pas pu être rendu.'}</p>{/if}
  {#if story}
    <div class="kg-setup">
    <p class="kg-meta">{story.title} · {story.pages.length} / {story.totalPages} {en ? 'chapters' : 'chapitres'} · {story.partial ? (en ? 'Partial view' : 'Vue partielle') : (en ? 'Derived view' : 'Vue dérivée')}</p>
    <div class="kg-controls">
      <label>{en ? 'Theme' : 'Thème'} <select bind:value={themeId}>{#each THEMES as theme}<option value={theme.id}>{theme.name}</option>{/each}</select></label>
      <label>Coloration <select bind:value={encoding}><option value="default">{en ? 'Theme default' : 'Selon le thème'}</option><option value="mono">Monochrome</option><option value="by-kind">{en ? 'By type' : 'Par type'}</option></select></label>
      <label>Format <select value={ratio} on:change={changeRatio}><option>16:9</option><option>1:1</option><option>9:16</option></select></label>
    </div>
    </div>
    <div class="kg-stage" bind:this={stage}></div>
    <div class="kg-player">
      <button type="button" disabled={reduced || !svg} aria-pressed={playing} on:click={play}>{playing ? 'Pause' : en ? 'Play' : 'Lecture'}</button>
      <button type="button" disabled={chapter===0} on:click={() => step(-1)}>{en ? 'Previous chapter' : 'Chapitre précédent'}</button>
      <button type="button" disabled={chapter===story.pages.length-1} on:click={() => step(1)}>{en ? 'Next chapter' : 'Chapitre suivant'}</button>
      <input type="range" aria-label={en ? 'Timeline position' : 'Position temporelle'} min="0" max={story.durationMs} value={time} on:input={e=>seek(Number(e.currentTarget.value))}/>
      <output>{(time/1000).toFixed(1)} / {(story.durationMs/1000).toFixed(1)} s</output>
    </div>
    <div class="kg-footer">
    <details><summary>{en ? 'Chapter transcript and visible references' : 'Transcription des chapitres et références visibles'}</summary><ol>
      {#each story.pages as page}<li><strong>{page.label}</strong><ul>
        {#each page.cards as card}<li>{card.label} — {card.detail}</li>{/each}
        {#each page.transcript || [] as line}<li>{line}</li>{/each}
        {#each page.refs as ref}<li>{ref}</li>{/each}
      </ul>{page.note}</li>{/each}
    </ol></details>
    <label><input type="checkbox" bind:checked={consent} on:change={e=>{if(!e.currentTarget.checked)clearFiles();}}/> {en ? 'Private local copy, not revocable or authorized for publication.' : 'Copie locale privée, non révocable et sans autorisation de publication.'}</label>
    <div class="kg-controls">
      {#each [['html','HTML'],['animated','SVG animé'],['svg','SVG du chapitre'],['png','PNG du chapitre'],['storyboard','Storyboard JSON']] as entry}
        <button type="button" disabled={!consent || busy || !svg} on:click={()=>exportFile(entry[0])}>{entry[1]}</button>
      {/each}
    </div>
    {#if files.length}<ul>{#each files as file}<li><a href={file.url} download={file.name}>{file.name}</a></li>{/each}</ul>{/if}
    </div>
  {/if}
</section>

