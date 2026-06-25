export const CHANTIER_STATUS_CYCLE = ['D', 'V', 'E', 'X'];

export const CHANTIER_STATUS_LABELS = {
  D: 'Relevé',
  V: 'Devis',
  E: 'En cours',
  X: 'Terminé',
  Z: 'Annulé',
};

export const CHANTIER_STATUS_COLORS = {
  D: '#6C757D',
  V: '#1D4ED8',
  E: '#F59E0B',
  X: '#2B9348',
  Z: '#000000',
};

export const CHANTIER_STATUS_DEVIS = 'V';

export const getChantierStatusLabel = (status) =>
  CHANTIER_STATUS_LABELS[status] || status || CHANTIER_STATUS_LABELS.D;

export const getChantierStatusColor = (status) =>
  CHANTIER_STATUS_COLORS[status] || CHANTIER_STATUS_COLORS.D;

/** Double-clic : D -> V -> E -> X -> D (hors Annulé). */
export const getNextChantierStatusOnDoubleTap = (currentStatus) => {
  const status = currentStatus || 'D';
  if (status === 'Z') {
    return CHANTIER_STATUS_CYCLE[0];
  }

  const index = CHANTIER_STATUS_CYCLE.indexOf(status);
  if (index === -1) {
    return CHANTIER_STATUS_CYCLE[0];
  }

  return CHANTIER_STATUS_CYCLE[(index + 1) % CHANTIER_STATUS_CYCLE.length];
};
