export const ROLE_ADMIN = 'A';
export const ROLE_COMMERCIAL = 'C';
export const ROLES_HIDING_PRICE_UI = new Set(['C', 'T']);
export const ROLES_WITH_RAPPORTS = new Set([ROLE_ADMIN, ROLE_COMMERCIAL]);

export const hidesPriceUiForRole = (role) => ROLES_HIDING_PRICE_UI.has(role);

export const canAccessRapports = (profil) =>
  Boolean(profil?.is_pro) && ROLES_WITH_RAPPORTS.has(profil?.role);

export const canModifyReleveForProfil = (profil, releve) => {
  if (!profil) return false;
  if (profil.role === ROLE_ADMIN) return true;
  if (!releve?.prise_par_id) return false;
  return String(profil.id) === String(releve.prise_par_id);
};
