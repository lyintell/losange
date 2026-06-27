export function matchesMetierSearch(row, query) {
  const term = String(query || '')
    .trim()
    .toLowerCase();
  if (!term) return true;

  const haystack = [row.nom, row.abbrev].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(term);
}
