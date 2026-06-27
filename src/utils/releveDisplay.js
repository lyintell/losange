export const formatPriseLe = (dateValue) => {
  if (!dateValue) return '';
  const normalized = String(dateValue).includes('T')
    ? dateValue
    : String(dateValue).replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatPriseParLine = (dateValue, priseParNom) => {
  const date = formatPriseLe(dateValue);
  const prisePar = String(priseParNom || '').trim();
  if (date && prisePar) return `${date} (prise par ${prisePar})`;
  if (date) return date;
  if (prisePar) return `(prise par ${prisePar})`;
  return '';
};

export const formatReleveCountLabel = (count) => {
  const value = Number(count) || 0;
  if (value <= 1) return '';
  return `${value} Relevés`;
};
