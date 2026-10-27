<script>
  import { onMount } from 'svelte';
  let catalog=null, dataset='', locale='', view=null, selected=null, query='', error='', busy=false, token='';
  const label=p=>p?.lexical?.status==='missing' ? `${p.semantic_id} (sans traduction)` : `${p?.lexical?.term||p?.semantic_id} (${p?.semantic_id})`;
  const status=p=>p?.lexical?.status==='direct'?'direct':p?.lexical?.status==='fallback'?'repli':'manquant';
  $: entries=(view?.presentation||[]).filter(x=>x.kind==='entity'&&(`${x.semantic_id} ${x.lexical.term||''}`).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,250);
  $: neighborhood=selected&&view?view.assertions.filter(a=>a.subject===selected||(a.object.kind==='entity'&&a.object.id===selected)):[];
  $: presentations=Object.fromEntries((view?.presentation||[]).map(p=>[p.semantic_id,p]));
  async function request(url){
    const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store'});
    const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Lecture indisponible.');return j;
  }
  async function start(){busy=true;error='';try{catalog=await request('/api/v11/catalog');dataset=catalog.datasets[0]?.id||'';locale=catalog.datasets[0]?.locales[0]||'';if(dataset)await refresh();}
    catch(e){error=e.message;}finally{busy=false;}}
  function chooseDataset(event){dataset=event.currentTarget.value;locale=catalog.datasets.find(d=>d.id===dataset)?.locales[0]||'';refresh();}
  function chooseLocale(event){locale=event.currentTarget.value;refresh();}
  async function refresh(){if(!dataset||!locale)return;busy=true;error='';view=null;selected=null;try{view=await request(`/api/v11/view?dataset=${encodeURIComponent(dataset)}&locale=${encodeURIComponent(locale)}`);}
    catch(e){error=e.message;}finally{busy=false;}}
  onMount(start);
</script>
<svelte:head><title>Lecteur local Kristal v11 — Konstellation</title></svelte:head>
<div class="v11-shell">
  <header><a href="/">← Konstellation</a><h1>Kristal v11 · Lecture dérivée</h1></header>
  <p>Consultation locale explicitement autorisée. Ni le vocabulaire affiché ni les assertions visibles ne constituent une permission de publier.</p>
  {#if !catalog}<section><label for="v11-token">Jeton d'accès (si configuré)</label><input id="v11-token" type="password" bind:value={token} autocomplete="off"/><button type="button" on:click={start}>Ouvrir le lecteur local</button></section>{/if}
  {#if error}<p role="alert">{error}</p>{/if}
  {#if catalog}
    <section class="controls">
      <label for="v11-dataset">Données vérifiées</label><select id="v11-dataset" value={dataset} on:change={chooseDataset}>{#each catalog.datasets as d}<option value={d.id}>{d.title}</option>{/each}</select>
      <label for="v11-locale">Langue</label><select id="v11-locale" value={locale} on:change={chooseLocale}>{#each catalog.datasets.find(d=>d.id===dataset)?.locales||[] as l}<option value={l}>{l}</option>{/each}</select>
      <button type="button" on:click={refresh} disabled={busy}>Vérifier à nouveau</button>
    </section>
  {/if}
  {#if busy}<p role="status">Validation Framework v11 en cours…</p>{/if}
  {#if view}
    <section><strong>Namespace : {view.source.namespace_id}</strong><p>Graphe : {view.source.graph_id} · Framework : {view.source.framework_version} · Traductions directes : {view.coverage_counts.direct} · Replis : {view.coverage_counts.fallback} · Manquantes : {view.coverage_counts.missing}</p><p class="warning">Lecture non canonique · Source / empreintes vérifiées · Publication non autorisée</p></section>
    <section class="layout">
      <div><h2>Entités</h2><label for="v11-search">Recherche dans la vue autorisée</label><input id="v11-search" type="search" bind:value={query} placeholder="Identité KQ ou terme"/>
      <ul>{#each entries as item (item.semantic_id)}<li><button class:selected={selected===item.semantic_id} type="button" on:click={()=>selected=item.semantic_id}>{label(item)} <small>· {status(item)}</small></button></li>{/each}</ul><p>250 résultats affichés au maximum.</p></div>
      <div><h2>Détail</h2>{#if selected}
        <h3>{label(presentations[selected])}</h3>
        {#if presentations[selected]?.accepted_external_exact}<p>Correspondance exacte externe : {presentations[selected].accepted_external_exact.system} {presentations[selected].accepted_external_exact.id}</p>{/if}
        <ul>{#each neighborhood as a (a.id)}<li><strong>{label(presentations[a.predicate])}</strong> : {a.object.kind==='entity'?label(presentations[a.object.id]):String(a.object.value)}<p>Assertion {a.id} · Sujet {a.subject}</p><p>Sources : {a.sources.join(', ')||'Aucune référence'}</p>{#if a.qualifiers?.length}<p>Qualificatifs conservés : {JSON.stringify(a.qualifiers)}</p>{/if}</li>{/each}</ul>
        {#if !neighborhood.length}<p>Aucune assertion associée à cette entité.</p>{/if}
      {:else}<p>Sélectionne une entité pour afficher ses assertions et références KS.</p>{/if}</div>
    </section>
  {/if}
</div>
<style>
  .v11-shell{max-width:1100px;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.5}
  header{display:flex;gap:2rem;align-items:center;flex-wrap:wrap}
  section{border:1px solid #bcc8c1;border-radius:10px;padding:1rem;margin:1rem 0}
  .controls{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
  label{font-weight:600}
  input,select,button{padding:.5rem;max-width:100%;font:inherit}
  .layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:1.25rem}
  .layout>div{min-width:0}
  ul{list-style:none;padding:0;max-height:70vh;overflow:auto}
  li{padding:.6rem 0;border-bottom:1px solid #bbc6be;overflow-wrap:anywhere}
  li button{width:100%;text-align:left;cursor:pointer}
  .selected{font-weight:700;outline:2px solid currentColor}
  .warning{font-weight:700}
  small{font-size:.75rem}
  @media(max-width:720px){.layout{grid-template-columns:minmax(0,1fr)}}
</style>
