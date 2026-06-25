export const CHANTIER_STATUS_DEVIS = 'V';

export const CHANTIER_STATUS_LABELS = {
  D: 'Relevé',
  V: 'Devis',
  E: 'En cours',
  X: 'Terminé',
  Z: 'Annulé',
};

export const CHANTIER_STATUS_OPTIONS = ['D', 'V', 'E', 'X', 'Z'];

export const CHANTIER_STATUS_COLORS = {
  D: '#6C757D',
  V: '#1D4ED8',
  E: '#F59E0B',
  X: '#2B9348',
  Z: '#000000',
};

export function getChantierStatusLabel(status) {
  return CHANTIER_STATUS_LABELS[status] || status || CHANTIER_STATUS_LABELS.D;
}

export function getChantierStatusColor(status) {
  return CHANTIER_STATUS_COLORS[status] || CHANTIER_STATUS_COLORS.D;
}
