<script>
  import { localizedLabel } from '../lib/i18n.mjs';
  import { uiFinish as ui } from '../lib/i18n-finish.mjs';
  export let locale = 'fr';
  export let selection;
  export let registry;
  export let labels;
  export let depth = 0;
  const types = { human: 'Personnes', work: 'Œuvres', place: 'Lieux', concept: 'Concepts' };
  function filterLabel(f) {
    const relation = localizedLabel(registry.find((r) => r.id === f.relation)?.label,locale) || f.relation;
    const ops = {
      exists: ui(locale,'queryExists'),
      missing_in_view: ui(locale,'queryMissing'),
      in: ui(locale,'queryIn'),
      none_of: ui(locale,'queryNoneOf'),
      overlaps: ui(locale,'queryOverlaps'),
    };
    return (
      relation +
      ' · ' +
      ops[f.op] +
      ' ' +
      (f.values
        ? f.values.map((v) => labels[v.id] || v.value || v.id).join(', ')
        : f.interval
          ? `${f.interval.from}–${f.interval.to}`
          : '')
    );
  }
</script>

<div class={`query-branch query-depth-${Math.min(depth, 3)}`}>
  <div class="query-node">
    <span class="node-dot"></span><strong
      >{selection.entityType === 'human' ? ui(locale,'typeHuman') : selection.entityType === 'work' ? ui(locale,'typeWork') : selection.entityType === 'place' ? ui(locale,'typePlace') : selection.entityType === 'concept' ? ui(locale,'typeConcept') : selection.entityType}</strong
    >{#if selection.ids}<span class="subtle"
        >{selection.ids.map((id) => labels[id] || id).join(', ')}</span
      >{/if}
  </div>
  {#each selection.filters as f}<div class="query-condition">{filterLabel(f)}</div>{/each}
  {#each selection.links as link}<div class="query-link">
      <span>{localizedLabel(registry.find((r) => r.id === link.relation)?.label,locale) || link.relation} →</span
      ><svelte:self {locale} selection={link.target} {registry} {labels} depth={depth + 1} />
    </div>{/each}
</div>
