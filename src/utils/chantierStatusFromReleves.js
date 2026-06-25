import { CHANTIER_STATUS_DEVIS } from './chantierStatus';
import { normalizeReleveStatus } from './releveStatus';

export const CHANTIER_STATUS_EN_COURS = 'E';

/**
 * Déduit le statut chantier à partir des relevés actifs.
 * - Au moins un relevé validé (V) → En cours (E)
 * - Tous non-validés (N) → Devis (V)
 * - Sinon → pas de changement automatique
 */
export const computeChantierStatusFromReleves = (releves = []) => {
  const rows = (releves || []).filter(Boolean);
  if (!rows.length) return null;

  const statuses = rows.map((releve) => normalizeReleveStatus(releve.status));

  if (statuses.some((status) => status === 'V')) {
    return CHANTIER_STATUS_EN_COURS;
  }

  if (statuses.every((status) => status === 'N')) {
    return CHANTIER_STATUS_DEVIS;
  }

  return null;
};
