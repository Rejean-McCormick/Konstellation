<script>
  import { tick } from 'svelte';
  import { catalogueStatus, filterCatalogue } from '../lib/reader-presentation.mjs';
  export let visible = false;
  export let items = [];
  export let opening = false;
  export let hasCurrent = false;
  export let locale = 'fr';
  export let aboutOpen = false;
  export let onOpen = async () => {};
  export let onExploreCurrent = () => {};
  let search = '', source = 'all', availability = 'all', selectedKey = null;
  let expert = false, selectedHeading;
  $: t = (fr, en) => locale === 'fr' ? fr : en;
  $: filtered = filterCatalogue(items, { search, source, availability, expert });
  $: selected = filtered.find(item => item.key === selectedKey) || null;
  $: if (!visible) selectedKey = null;
  async function choose(item) {
    selectedKey = item.key;
    await tick();
    selectedHeading?.focus();
  }
  function status(item, translate) {
    return catalogueStatus(item) === 'available' ? translate('Disponible', 'Available') :
      catalogueStatus(item) === 'unavailable' ? translate('Indisponible', 'Unavailable') :
      translate('Inventaire seulement', 'Inventory only');
  }
</script>

<section class="fleet fleet-simple" hidden={!visible} aria-label={t('Mes Kristals', 'My Kristals')}>
  <header class="fleet-heading">
    <div>
      <h1>{t('Mes Kristals', 'My Kristals')}<span class="fleet-accent">.</span></h1>
      <p>{t('Choisissez un Kristal à explorer. Le contenu accessible dépend du lecteur disponible.', 'Choose a Kristal to explore. Accessible content depends on the available reader.')}</p>
    </div>
    {#if hasCurrent}<button class="button" on:click={onExploreCurrent}>{t('Reprendre mon exploration', 'Resume exploration')} →</button>{/if}
  </header>
  <div class="fleet-filters">
    <label>{t('Rechercher un Kristal', 'Search Kristals')}<input type="search" bind:value={search} placeholder={expert ? t('Nom, référence ou archétype', 'Name, reference or archetype') : t('Nom du Kristal…', 'Kristal name…')} /></label>
    <label>{t('Disponibilité', 'Availability')}<select bind:value={availability}>
      <option value="all">{t('Tous', 'All')}</option><option value="available">{t('Disponibles', 'Available')}</option>
      <option value="unavailable">{t('Indisponibles', 'Unavailable')}</option><option value="inventory">{t('Inventaire seulement', 'Inventory only')}</option>
    </select></label>
  </div>
  <details class="fleet-options" bind:open={expert}>
    <summary>{t('Filtres techniques', 'Technical filters')}</summary>
    <label>{t('Source', 'Source')} <select bind:value={source}>
      <option value="all">{t('Toutes les sources autorisées', 'All permitted sources')}</option>
      <option value="local_manager_preview">{t('Inventaire Manager local', 'Local Manager inventory')}</option>
      <option value="github_v10_checkout">GitHub v10</option>
      <option value="local_v10_reader">{t('Lecteur local v10', 'Local v10 reader')}</option>
      <option value="legacy_reader">{t('Lecteur historique', 'Legacy reader')}</option>
    </select></label>
  </details>
  <p class="fleet-count" aria-live="polite">{filtered.length}{filtered.length !== items.length ? ' / ' + items.length : ''} {filtered.length === 1 ? 'Kristal' : 'Kristals'}</p>
  <div class="fleet-layout" class:has-selection={!!selected}>
    {#if selected}
      <aside class="fleet-detail" aria-label={t('Kristal sélectionné', 'Selected Kristal')}>
        <button type="button" class="text-button fleet-dismiss" on:click={() => selectedKey = null}>{t('Fermer', 'Close')} ×</button>
        <h2 tabindex="-1" bind:this={selectedHeading}>{selected.title}</h2>
        <p class="fleet-indicator">{status(selected,t)}</p>
        {#if selected.openable === true && selected.availability === 'available' && selected.readerId}
          <button class="button primary" disabled={opening} on:click={() => onOpen(selected.readerId)}>{opening ? t('Ouverture…', 'Opening…') : t('Ouvrir dans l’explorateur', 'Open in Explorer') + ' →'}</button>
          <p class="fleet-detail-note">{t('Le contenu disponible est déterminé à l’ouverture. Certains Kristals ne proposent qu’une vue de leur structure.', 'Available content is determined on opening. Some Kristals expose only their structure.')}</p>
        {:else}<p class="fleet-detail-note">{t('Aucun lecteur compatible autorisé n’est disponible pour cette entrée.', 'No authorized compatible reader is available for this entry.')}</p>{/if}
        {#key selected.key}<details class="fleet-technical">
          <summary>{t('Informations techniques', 'Technical information')}</summary>
        <dl>
          <dt>{t("Source", "Source")}</dt><dd>{selected.source.replaceAll('_', ' ')}</dd>
          <dt>{t("Référence", "Reference")}</dt><dd>{selected.stateRef || t('Non fourni', 'Not supplied')}</dd>
          <dt>{t("Engagement déclaré", "State commitment")}</dt><dd>{selected.stateCommitment || t('Non fourni', 'Not supplied')}</dd>
          <dt>{t("Disponibilité", "Availability")}</dt><dd>{selected.availability}</dd>
          <dt>{t("Maturité déclarée", "Readiness (declared)")}</dt><dd>{selected.readiness.replaceAll('_', ' ')}</dd>
          <dt>{t("Vérification", "Verification")}</dt><dd>{selected.verification.replaceAll('_', ' ')}</dd>
          {#if selected.managerAssessment}
            <dt>{t("Manager local", "Manager (local)")}</dt><dd>{selected.managerAssessment.result.replaceAll('_', ' ')}</dd>
            <dt>{t("Discovery (Manager)", "Discovery (Manager)")}</dt><dd>{selected.managerAssessment.discovery.replaceAll('_', ' ')}</dd>
            <dt>{t("État Framework (Manager)", "Framework state (Manager)")}</dt><dd>{selected.managerAssessment.frameworkState.replaceAll('_', ' ')}</dd>
          {/if}
          <dt>{t("Vue", "View")}</dt><dd>{selected.viewKind.replaceAll('_', ' ')}</dd>
          <dt>{t("Archétype déclaré", "Archetype (declared)")}</dt><dd>{selected.discovery?.classification?.primary_archetype || selected.archetype || t('Inconnu', 'Unknown')}</dd>
          {#if selected.discovery}
            <dt>{t("Usage déclaré", "Usage Arketype (declared)")}</dt><dd>{selected.discovery.classification?.primary_usage || t('Non déclaré', 'Not declared')}</dd>
            <dt>{t("Organisation des données", "Data organization")}</dt><dd>{selected.discovery.organization}</dd>
            <dt>{t("Lecteur recommandé", "Reader recommendation")}</dt><dd>{selected.discovery.readerProfile}</dd>
            {#if selected.discovery.accessPattern}<dt>{t("Accès suggéré", "Suggested access")}</dt><dd>{selected.discovery.accessPattern}</dd>{/if}
            <dt>{t("Octets enregistrés mesurés", "Measured registered bytes")}</dt><dd>{selected.discovery.trackedLocalBytes.toLocaleString()} ({selected.discovery.sizeClass}; {selected.discovery.completeness.replaceAll('_',' ')})</dd>
            <dt>{t("Statut Discovery", "Discovery status")}</dt><dd>{t('Déclaré, non canonique, non vérifié indépendamment', 'Declared, noncanonical, not independently verified')}</dd>
          {/if}
        </dl>
          <p class="fleet-detail-note">{t('L’inventaire Manager ne donne pas accès au contenu canonique. Les métadonnées déclarées ne prouvent ni qualification ni publication.', 'Manager inventory does not grant canonical content access. Declared metadata does not prove qualification or publication.')}</p>
        </details>{/key}
      </aside>
    {/if}
    <div class="fleet-grid" aria-label={t('Kristals accessibles dans le catalogue', 'Permitted Kristals')}>
      {#each filtered as item (item.key)}
        <button class="fleet-card" class:selected={selected?.key === item.key} aria-pressed={selected?.key === item.key} disabled={opening} on:click={() => choose(item)} aria-label={t('Choisir ', 'Choose ') + item.title}>
          <strong>{item.title}</strong>
          <span class="fleet-card-bottom"><span class="fleet-indicator" class:available={catalogueStatus(item) === 'available'}>{status(item,t)}</span><span aria-hidden="true">→</span></span>
        </button>
      {:else}<div class="fleet-empty">{t('Aucun Kristal autorisé ne correspond à ces filtres.', 'No permitted Kristals match these filters.')}</div>{/each}
    </div>
  </div>
  <details class="fleet-about" bind:open={aboutOpen}>
    <summary>{t('À propos des Kristals et de leur disponibilité', 'About Kristals and availability')}</summary>
    <p>{t('Le catalogue affiche uniquement les entrées autorisées, en lecture seule. Une entrée disponible signifie qu’un lecteur est configuré, pas que son contenu est qualifié ou publié.', 'The catalogue shows permitted entries only, in read-only mode. Available means a reader is configured, not that its content is qualified or published.')}</p>
    <p>{t('L’inventaire Manager local exige une autorisation explicite. Discovery 3.3 est indicatif. Les métadonnées d’un index hébergé ne sont pas une preuve de publication.', 'Local Manager inventory requires explicit authorization. Discovery 3.3 is advisory. Hosted index metadata is not a publication receipt.')}</p>
  </details>
</section>
