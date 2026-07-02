/** Aligné sur `src/utils/terrainAccess.js` (mobile). */

export const ROLE_ATELIER = 'T';

const ROLES_SEE_ALL_CHANTIERS = new Set(['A', 'S', 'T']);
const ROLES_CHANGE_CHANTIER_STATUS = new Set(['A', 'S', 'T']);

export function canSeeAllChantiers(role) {
  return ROLES_SEE_ALL_CHANTIERS.has(role);
}

/** Infos chantier, lignes devis, etc. — pas pour T (atelier). */
export function canModifyChantiers(role) {
  return role !== ROLE_ATELIER;
}

/** Statut chantier : A, S et T. */
export function canChangeChantierStatus(role) {
  return ROLES_CHANGE_CHANTIER_STATUS.has(role);
}

/** Statut devis / relevé : A et S seulement (pas C ni T). */
export function canChangeDevisStatus(role) {
  return role === 'A' || role === 'S';
}
