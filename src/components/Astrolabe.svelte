<script>
  export let entities = [];
  export let onNavigate = () => {};

  let term = '';

  const typeLabels = {
    author: 'Auteur',
    human: 'Personne',
    position: 'Position',
    editorial: 'Question',
    theme: 'Thème',
    doctrine: 'Doctrine',
    tradition: 'Tradition',
    concept: 'Concept',
    argument: 'Argument',
    work: 'Œuvre',
    source: 'Source',
  };

  const examples = ['eudiste', 'Saint-Esprit', 'résurrection', 'parousie', 'iconoclaste'];

  // The Astrolabe is intentionally broader than the corpus vocabulary. These routes
  // translate common historical/theological entry words into concepts actually present
  // in the current pack. They never pretend that an absent term is explicitly documented.
  const semanticRoutes = [
    {
      aliases: ['eudiste', 'eudistes', 'jean eudes', 'saint jean eudes'],
      title: 'Spiritualité eudiste',
      note: 'Le terme n’est pas encore une entrée directe du corpus. L’Astrolabe ouvre des pistes voisines plutôt que d’inventer une correspondance.',
      anchors: ['eudes', 'mystique', 'contemplation', 'amour', 'christologie', 'trinite', 'mission', 'grace'],
    },
    {
      aliases: ['saint esprit', 'st esprit', 'esprit saint', 'pneumatologie'],
      title: 'Saint-Esprit',
      note: 'Cap vers les textes et notions du corpus qui parlent de l’Esprit, de la Trinité, de la grâce et du salut.',
      anchors: ['esprit', 'pneumatologie', 'trinite', 'grace', 'salut', 'mission'],
    },
    {
      aliases: ['parousie', 'second avenement', 'avenement du christ', 'retour du christ'],
      title: 'Parousie',
      note: 'Le mot n’est pas indexé directement; l’orientation passe par l’eschatologie, l’espérance, la résurrection et le salut.',
      anchors: ['eschatologie', 'esperance', 'resurrection', 'salut', 'christologie'],
    },
    {
      aliases: ['iconoclaste', 'iconoclastes', 'iconoclasme', 'icone', 'icones'],
      title: 'Images et iconoclasme',
      note: 'Le corpus ne possède pas encore une entrée « iconoclasme ». L’Astrolabe rapproche les thèmes disponibles liés à l’image, au Christ, au culte et à la beauté.',
      anchors: ['image', 'christologie', 'incarnation', 'art et beaute', 'culte', 'mystere et presence'],
    },
    {
      aliases: ['resurrection', 'ressurection', 'resurection'],
      title: 'Résurrection',
      note: 'Correspondances directes et pistes immédiatement voisines dans le corpus.',
      anchors: ['resurrection', 'esperance', 'eschatologie', 'salut'],
    },
  ];

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_–—-]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function distance(a, b) {
    a = normalize(a);
    b = normalize(b);
    if (!a) return b.length;
    if (!b) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = old;
      }
    }
    return row[b.length];
  }

  function score(entity, rawQuery) {
    const q = normalize(rawQuery);
    if (!q) return 0;
    const label = normalize(entity.label);
    const description = normalize(entity.description);
    const id = normalize(entity.id);
    if (label === q) return 140;
    if (label.startsWith(q)) return 110;
    if (label.includes(q)) return 95;
    if (description.includes(q)) return 70;
    if (id.includes(q)) return 55;

    const qTokens = q.split(' ');
    const labelTokens = label.split(' ');
    let fuzzy = 0;
    for (const qt of qTokens) {
      if (qt.length < 4) continue;
      for (const lt of labelTokens) {
        const d = distance(qt, lt);
        const tolerance = qt.length >= 9 ? 2 : 1;
        if (d <= tolerance) fuzzy = Math.max(fuzzy, 58 - d * 10);
      }
    }
    return fuzzy;
  }

  function routeFor(rawQuery) {
    const q = normalize(rawQuery);
    if (!q) return null;
    return (
      semanticRoutes.find((route) =>
        route.aliases.some((alias) => {
          const a = normalize(alias);
          return a === q || a.includes(q) || q.includes(a) || (q.length >= 5 && distance(a, q) <= 2);
        }),
      ) || null
    );
  }

  function rank(rawQuery) {
    return entities
      .map((entity) => ({ entity, score: score(entity, rawQuery), reason: 'Correspondance' }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entity.label.localeCompare(b.entity.label, 'fr'));
  }

  function anchorMatches(route, directIds) {
    if (!route) return [];
    const seen = new Set(directIds);
    const matches = [];
    for (const anchor of route.anchors) {
      const ranked = rank(anchor);
      for (const item of ranked) {
        if (seen.has(item.entity.id)) continue;
        seen.add(item.entity.id);
        matches.push({ ...item, reason: 'Piste voisine', anchor });
        if (matches.length >= 10) return matches;
      }
    }
    return matches;
  }

  function orientation(rawQuery) {
    const direct = rank(rawQuery).slice(0, 8);
    const route = routeFor(rawQuery);
    const nearby = anchorMatches(route, direct.map((item) => item.entity.id));
    const merged = [...direct, ...nearby].slice(0, 12);
    return { direct, route, results: merged };
  }

  function surprise() {
    const candidates = entities.filter((entity) => ['editorial', 'theme', 'position'].includes(entity.type));
    if (!candidates.length) return;
    const entity = candidates[Math.floor(Math.random() * candidates.length)];
    onNavigate(entity);
  }

  function submit() {
    if (current.results[0]) onNavigate(current.results[0].entity);
  }

  $: current = orientation(term);
</script>

<section class="astrolabe" id="astrolabe" aria-labelledby="astrolabe-title">
  <div class="astrolabe-orbit" aria-hidden="true">
    <span class="orbit orbit-one"></span>
    <span class="orbit orbit-two"></span>
    <span class="astrolabe-star">✦</span>
  </div>
  <div class="astrolabe-copy">
    <div class="eyebrow">ASTROLABE</div>
    <h2 id="astrolabe-title">Donnez un mot. Trouvez un cap.</h2>
    <p>
      Une tradition, une doctrine, une intuition, même un mot imparfait. L’Astrolabe cherche où
      l’accrocher dans la constellation et propose des pistes à suivre.
    </p>
    <form class="astrolabe-search" on:submit|preventDefault={submit}>
      <span aria-hidden="true">⌖</span>
      <input
        aria-label="Orienter l’Astrolabe"
        bind:value={term}
        placeholder="Ex. parousie, Saint-Esprit, eudiste…"
        autocomplete="off"
      />
      <button class="button primary" type="submit" disabled={!current.results.length}>Prendre le cap →</button>
    </form>
    <div class="astrolabe-examples" aria-label="Exemples de mots-clés">
      {#each examples as example}
        <button class:active={normalize(term) === normalize(example)} on:click={() => (term = example)}>{example}</button>
      {/each}
      <button class="surprise" on:click={surprise}>✦ Cap au hasard</button>
    </div>
  </div>

  {#if term.trim()}
    <div class="astrolabe-reading" aria-live="polite">
      <div class="astrolabe-reading-head">
        <div>
          <small>LECTURE DE L’ASTROLABE</small>
          <strong>{current.route?.title || term}</strong>
        </div>
        {#if current.direct.length}
          <span class="astrolabe-status direct">{current.direct.length} correspondance{current.direct.length > 1 ? 's' : ''}</span>
        {:else if current.route}
          <span class="astrolabe-status nearby">orientation par proximité</span>
        {:else}
          <span class="astrolabe-status empty">aucun ancrage net</span>
        {/if}
      </div>

      {#if current.route}
        <p class="astrolabe-note">{current.route.note}</p>
      {:else if !current.results.length}
        <p class="astrolabe-note">
          Ce mot ne rencontre pas encore le vocabulaire du corpus. Essayez une notion voisine ou une forme plus générale.
        </p>
      {/if}

      {#if current.results.length}
        <div class="astrolabe-caps">
          {#each current.results.slice(0, 8) as item}
            <button class="astrolabe-cap" on:click={() => onNavigate(item.entity)}>
              <span class="cap-mark" aria-hidden="true">✦</span>
              <span class="cap-copy">
                <small>{item.reason} · {typeLabels[item.entity.type] || item.entity.type}</small>
                <strong>{item.entity.label}</strong>
              </span>
              <span class="cap-arrow" aria-hidden="true">→</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>
