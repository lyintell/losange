/** Date du devis PDF mobile : date du jour, format long. */
export function formatDevisDocumentDate(date = new Date()) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Date pied de page relevé PDF mobile. */
export function formatReleveDocumentDate(dateValue) {
  if (!dateValue) return '';
  const parsed = new Date(`${String(dateValue).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(dateValue);
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
