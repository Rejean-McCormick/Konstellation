<script>
  export let entities = [];
  export let corpusTitle = '';
  export let onNavigate = () => {};
  let term = '';

  function normalize(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_–—-]+/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
  function humanize(value) { const text=String(value||'').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_:./-]+/g,' ').replace(/\s+/g,' ').trim(); return text?text[0].toUpperCase()+text.slice(1):''; }
  function distance(a,b){a=normalize(a);b=normalize(b);const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
  function score(entity, raw){const q=normalize(raw);if(!q)return 0;const label=normalize(entity.label),aliases=(entity.aliases||[]).map(normalize),description=normalize(entity.description),id=normalize(entity.id);if(label===q)return 150;if(aliases.includes(q))return 145;if(label.startsWith(q))return 120;if(label.includes(q))return 105;if(aliases.some(a=>a.includes(q)))return 95;if(description.includes(q))return 70;if(id.includes(q))return 55;let fuzzy=0;for(const qt of q.split(' ')){if(qt.length<4)continue;for(const lt of label.split(' ')){const d=distance(qt,lt);if(d<=(qt.length>=9?2:1))fuzzy=Math.max(fuzzy,58-d*10);}}return fuzzy;}
  function rank(raw){return entities.map(entity=>({entity,score:score(entity,raw)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.entity.label.localeCompare(b.entity.label,'fr')).slice(0,16);}
  $: examples=[...new Map(entities.filter(e=>e?.label&&e.label.length>=3&&e.label.length<=42).map(e=>[e.type,e.label])).values()].slice(0,5);
  $: results=rank(term);
  function surprise(){if(!entities.length)return;onNavigate(entities[Math.floor(Math.random()*entities.length)]);}
  function submit(){if(results[0])onNavigate(results[0].entity);}
</script>
<section class="astrolabe" id="astrolabe" data-testid="astrolabe" aria-labelledby="astrolabe-title">
  <div class="astrolabe-orbit" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="astrolabe-star">✦</span></div>
  <div class="astrolabe-copy"><div class="eyebrow">ASTROLABE</div><h2 id="astrolabe-title">Donnez un mot. Trouvez un cap.</h2><p>Recherche d’orientation générique dans {corpusTitle || 'le Kristal courant'}. Elle rapproche labels, alias, descriptions et identifiants sans inventer de relation sémantique.</p>
    <form class="astrolabe-search" on:submit|preventDefault={submit}><span aria-hidden="true">⌖</span><input aria-label="Orienter l’Astrolabe" bind:value={term} placeholder={examples.length?`Ex. ${examples.slice(0,3).join(', ')}…`:'Chercher dans le Kristal…'} autocomplete="off"/><button class="button primary" type="submit" disabled={!results.length}>Prendre le cap →</button></form>
    <div class="astrolabe-examples" aria-label="Exemples de mots-clés">{#each examples as example}<button class:active={normalize(term)===normalize(example)} on:click={()=>term=example}>{example}</button>{/each}<button class="surprise" on:click={surprise}>✦ Cap au hasard</button></div>
  </div>
  {#if term.trim()}<div class="astrolabe-reading" data-testid="astrolabe-reading" aria-live="polite"><div class="astrolabe-reading-head"><div><small>LECTURE DE L’ASTROLABE</small><strong>{term}</strong></div><span class:direct={results.length} class:empty={!results.length} class="astrolabe-status">{results.length} correspondance{results.length>1?'s':''}</span></div>
    {#if results.length}<div class="astrolabe-caps" data-testid="astrolabe-caps">{#each results.slice(0,12) as item}<button class="astrolabe-cap" data-entity-id={item.entity.id} data-entity-type={item.entity.type} on:click={()=>onNavigate(item.entity)}><span class="cap-mark" aria-hidden="true">✦</span><span class="cap-copy"><small>Correspondance · {humanize(item.entity.type)}</small><strong>{item.entity.label}</strong>{#if item.entity.description}<em>{item.entity.description}</em>{/if}</span><span class="cap-arrow" aria-hidden="true">→</span></button>{/each}</div>{:else}<p class="astrolabe-note">Aucun ancrage net dans le vocabulaire visible de ce Kristal.</p>{/if}
  </div>{/if}
</section>
