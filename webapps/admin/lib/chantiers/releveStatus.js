export const RELEVE_STATUS_DEFAULT = 'E';

export const RELEVE_STATUS_CYCLE = ['E', 'V', 'N'];

export const RELEVE_STATUS_OPTIONS = [...RELEVE_STATUS_CYCLE];

export const RELEVE_STATUS_LABELS = {
  E: 'En attente',
  V: 'Validé',
  N: 'Non-validé',
};

export const RELEVE_STATUS_COLORS = {
  E: '#F59E0B',
  V: '#2B9348',
  N: '#DC2626',
};

export function getReleveStatusLabel(status) {
  return RELEVE_STATUS_LABELS[status] || status || RELEVE_STATUS_LABELS[RELEVE_STATUS_DEFAULT];
}

export function getReleveStatusColor(status) {
  return RELEVE_STATUS_COLORS[status] || RELEVE_STATUS_COLORS[RELEVE_STATUS_DEFAULT];
}

export function normalizeReleveStatus(status) {
  const value = String(status || '').trim().toUpperCase();
  if (value === 'V' || value === 'N' || value === 'E') return value;
  return RELEVE_STATUS_DEFAULT;
}

/** Clic : E -> V -> N -> E */
export function getNextReleveStatus(currentStatus) {
  const status = normalizeReleveStatus(currentStatus);
  const index = RELEVE_STATUS_CYCLE.indexOf(status);
  if (index === -1) {
    return RELEVE_STATUS_CYCLE[0];
  }
  return RELEVE_STATUS_CYCLE[(index + 1) % RELEVE_STATUS_CYCLE.length];
}
