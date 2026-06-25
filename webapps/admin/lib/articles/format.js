import { formatArticleNomAvecFournisseur } from '@/lib/format/formatLigneMesures';

export { formatUniteChoiceLabel } from '@/lib/ouvrages/format';

export function formatArticleDisplayName(article) {
  return formatArticleNomAvecFournisseur(article?.nom, article?.fournisseur_nom);
}

export function matchesArticleSearch(row, query, { includeMetier = true } = {}) {
  const term = String(query || '')
    .trim()
    .toLowerCase();
  if (!term) return true;

  const parts = [row.nom, row.fournisseur_nom];
  if (includeMetier) parts.push(row.metier_nom);
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(term);
}
