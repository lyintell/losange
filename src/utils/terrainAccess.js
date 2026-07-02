export const ROLE_ADMIN = 'A';
export const ROLE_COMMERCIAL = 'C';
export const ROLE_COMMERCIAL_S = 'S';
export const ROLE_ATELIER = 'T';
export const ROLES_HIDING_PRICE_UI = new Set(['C', 'T']);
export const ROLES_WITH_RAPPORTS = new Set([ROLE_ADMIN]);
export const ROLES_CREATING_OUVRAGE_IN_RELEVE = new Set(['A', 'C', 'T']);
export const ROLES_MODIFY_ANY_CHANTIER = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S]);
export const ROLES_SEE_ALL_CHANTIERS = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S, ROLE_ATELIER]);
export const ROLES_DATABASE_OUVRAGES = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S]);
export const ROLES_CHANGE_CHANTIER_STATUS = new Set([ROLE_ADMIN, ROLE_COMMERCIAL_S, ROLE_ATELIER]);

export const isAdminRole = (role) => role === ROLE_ADMIN;

export const hidesPriceUiForRole = (role) => ROLES_HIDING_PRICE_UI.has(role);

/** P.U. et prix de revient catalogue (ouvrages / articles). */
export const canSeeCataloguePrices = (profil) => !hidesPriceUiForRole(profil?.role);

/** Saisie prix de revient à la création / édition catalogue (admin). */
export const canEditPrixRevient = (profil) => isAdminRole(profil?.role);

export const canEditPrixUnitaireApplique = (profil) =>
  !ROLES_HIDING_PRICE_UI.has(profil?.role);

export const canAccessRapports = (profil) =>
  Boolean(profil?.is_pro) && ROLES_WITH_RAPPORTS.has(profil?.role);

export const canAccessDatabaseMetiers = (profil) => isAdminRole(profil?.role);

export const canAccessDatabaseSections = (profil) => isAdminRole(profil?.role);

/** Menu Plus → Base de données (admin seulement). */
export const canAccessDatabase = (profil) => isAdminRole(profil?.role);

export const canAccessDatabaseOuvrages = (profil) =>
  ROLES_DATABASE_OUVRAGES.has(profil?.role);

export const canManageDatabaseOuvrages = (profil) =>
  ROLES_DATABASE_OUVRAGES.has(profil?.role);

export const canToggleOuvrageActif = (profil) => isAdminRole(profil?.role);

export const canReorderOuvrages = (profil) => isAdminRole(profil?.role);

export const canDeleteOuvrage = (profil) => isAdminRole(profil?.role);

export const canEditOuvrageNomAndUnite = (profil) => isAdminRole(profil?.role);

export const canManageClients = (profil) => isAdminRole(profil?.role);

export const canSeeClientPhone = (profil) => !ROLES_HIDING_PRICE_UI.has(profil?.role);

/** Statut chantier : A, S et T. */
export const canChangeChantierStatus = (profil) =>
  ROLES_CHANGE_CHANTIER_STATUS.has(profil?.role);

/** Statut devis / relevé : A et S seulement (pas C ni T). */
export const canChangeReleveStatus = (profil) =>
  profil?.role === ROLE_ADMIN || profil?.role === ROLE_COMMERCIAL_S;

const isProProfil = (profil) => Number(profil?.ind_pro ?? profil?.is_pro) === 1;

/** Double-tap OK sur ligne (ind_complete) : Pro requis ; T sur tout chantier, autres si droit relevé. */
export const canToggleLigneIndCompleteOnReleve = (profil, releve) => {
  if (!profil || !isProProfil(profil)) return false;
  if (profil.role === ROLE_ATELIER) return true;
  return canModifyReleveForProfil(profil, releve);
};

export const canCreateReleveOrLigne = (profil) =>
  profil?.role !== ROLE_COMMERCIAL_S && profil?.role !== ROLE_ATELIER;

export const canEditChantierCotesInPave = (profil) => profil?.role !== ROLE_COMMERCIAL_S;

export const canSeeAllChantiers = (profil) => ROLES_SEE_ALL_CHANTIERS.has(profil?.role);

/** Compte C : liste chantiers / relevés limités à ceux qu'il a saisis. */
export const filtersChantiersToOwnRelevesForProfil = (profil) =>
  profil?.role === ROLE_COMMERCIAL;

export const canAccessReleveForProfil = (profil, releve) => {
  if (!profil || !releve) return false;
  if (profil.role === ROLE_ATELIER) return true;
  if (ROLES_MODIFY_ANY_CHANTIER.has(profil.role) || isAdminRole(profil.role)) return true;
  if (!releve.prise_par_id) return false;
  return String(profil.id) === String(releve.prise_par_id);
};

/** Atelier (T) : consultation seule des chantiers. */
export const canModifyChantiersForProfil = (profil) => profil?.role !== ROLE_ATELIER;

export const canCreateOuvrageInReleveFlow = (profil) =>
  ROLES_CREATING_OUVRAGE_IN_RELEVE.has(profil?.role);

export const canEditReleveRemise = (profil) => ROLES_MODIFY_ANY_CHANTIER.has(profil?.role);

export const canModifyReleveForProfil = (profil, releve) => {
  if (!profil) return false;
  if (!canModifyChantiersForProfil(profil)) return false;
  if (ROLES_MODIFY_ANY_CHANTIER.has(profil.role)) return true;
  if (!releve?.prise_par_id) return false;
  return String(profil.id) === String(releve.prise_par_id);
};
