export const ROLE_ADMIN = 'A';
export const ROLE_COMMERCIAL = 'C';
export const ROLE_COMMERCIAL_S = 'S';
export const ROLES_HIDING_PRICE_UI = new Set(['C', 'T']);
export const ROLES_WITH_RAPPORTS = new Set([ROLE_ADMIN]);
export const ROLES_CREATING_OUVRAGE_IN_RELEVE = new Set(['A', 'C', 'T']);
export const ROLES_MODIFY_ANY_CHANTIER = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S]);
export const ROLES_DATABASE_OUVRAGES = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S]);

export const isAdminRole = (role) => role === ROLE_ADMIN;

export const hidesPriceUiForRole = (role) => ROLES_HIDING_PRICE_UI.has(role);

export const canEditPrixUnitaireApplique = (profil) =>
  !ROLES_HIDING_PRICE_UI.has(profil?.role);

export const canAccessRapports = (profil) =>
  Boolean(profil?.is_pro) && ROLES_WITH_RAPPORTS.has(profil?.role);

export const canAccessDatabaseMetiers = (profil) => isAdminRole(profil?.role);

export const canAccessDatabaseOuvrages = (profil) =>
  ROLES_DATABASE_OUVRAGES.has(profil?.role);

export const canManageDatabaseOuvrages = (profil) =>
  ROLES_DATABASE_OUVRAGES.has(profil?.role);

export const canManageClients = (profil) => isAdminRole(profil?.role);

export const canCreateReleveOrLigne = (profil) => profil?.role !== ROLE_COMMERCIAL_S;

export const canEditChantierCotesInPave = (profil) => profil?.role !== ROLE_COMMERCIAL_S;

export const canSeeAllChantiers = (profil) => ROLES_MODIFY_ANY_CHANTIER.has(profil?.role);

export const canCreateOuvrageInReleveFlow = (profil) =>
  ROLES_CREATING_OUVRAGE_IN_RELEVE.has(profil?.role);

export const canModifyReleveForProfil = (profil, releve) => {
  if (!profil) return false;
  if (ROLES_MODIFY_ANY_CHANTIER.has(profil.role)) return true;
  if (!releve?.prise_par_id) return false;
  return String(profil.id) === String(releve.prise_par_id);
};
