/** Rôles A et S — même règle que mobile (`canEditReleveRemise`). */
export function canEditReleveRemise(role) {
  return role === 'A' || role === 'S';
}

export function parseRemiseInput(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatRemiseDisplay(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '';
  return String(num).replace('.', ',');
}
