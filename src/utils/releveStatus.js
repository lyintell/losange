export const RELEVE_STATUS_DEFAULT = 'E';

export const RELEVE_STATUS_CYCLE = ['E', 'V', 'N'];

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

export const getReleveStatusLabel = (status) =>
  RELEVE_STATUS_LABELS[status] || status || RELEVE_STATUS_LABELS[RELEVE_STATUS_DEFAULT];

export const getReleveStatusColor = (status) =>
  RELEVE_STATUS_COLORS[status] || RELEVE_STATUS_COLORS[RELEVE_STATUS_DEFAULT];

export const normalizeReleveStatus = (status) => {
  const value = String(status || '').trim().toUpperCase();
  if (value === 'V' || value === 'N' || value === 'E') return value;
  return RELEVE_STATUS_DEFAULT;
};

/** Double-clic : E -> V -> N -> E */
export const getNextReleveStatusOnDoubleTap = (currentStatus) => {
  const status = normalizeReleveStatus(currentStatus);
  const index = RELEVE_STATUS_CYCLE.indexOf(status);
  if (index === -1) {
    return RELEVE_STATUS_CYCLE[0];
  }
  return RELEVE_STATUS_CYCLE[(index + 1) % RELEVE_STATUS_CYCLE.length];
};
