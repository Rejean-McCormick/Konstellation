// Presentation only. The server remains the authority for visible data and access.
const structuralTypes = new Set(['v9_state', 'v9_artifact']);
export function technicalReaderView(boot, entityType) {
  const adapter = boot?.capabilities?.packAdapter;
  if (adapter === 'kristal-github-collection-v10') return true;
  if (adapter !== 'kristal-local-v10') return false;
  // These are the two exact code-owned types emitted by the local v10 reader
  // for state membership, not domain types guessed from labels or identifiers.
  const types = boot?.registry?.entityTypes;
  return structuralTypes.has(entityType) ||
    (Array.isArray(types) && types.length > 0 && types.every(type => structuralTypes.has(type)));
}
export function catalogueStatus(item) {
  if (item?.openable === true && item.availability === 'available') return 'available';
  if (item?.availability === 'unavailable') return 'unavailable';
  return 'inventory';
}
export function filterCatalogue(items, { search = '', source = 'all', availability = 'all', expert = false } = {}) {
  const lower = value => String(value || '').toLocaleLowerCase();
  const q = lower(search.trim());
  return items.filter(item => {
    const values = expert ? [item.title, item.stateRef, item.archetype, item.id,
      item.discovery?.classification?.primary_archetype, item.discovery?.classification?.primary_usage] : [item.title];
    return (!expert || source === 'all' || item.source === source) &&
      (availability === 'all' || catalogueStatus(item) === availability) &&
      (!q || values.some(value => lower(value).includes(q)));
  });
}
