export function formatUniteChoiceLabel(unite) {
  if (!unite) return 'Unité';

  if (Number(unite.ind_dimension) === 1) {
    const formule = String(unite.formule || '').trim() || unite.nom || 'Unité';
    const nomUnite = String(unite.nom_unite || '').trim();
    return nomUnite ? `${formule} (${nomUnite})` : formule;
  }

  const nom = unite.nom || unite.nom_unite || 'Unité';
  return nom;
}

export function matchesOuvrageSearch(row, query, { includeMetier = true } = {}) {
  const term = String(query || '')
    .trim()
    .toLowerCase();
  if (!term) return true;

  const parts = [row.nom];
  if (includeMetier) parts.push(row.metier_nom);
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(term);
}
