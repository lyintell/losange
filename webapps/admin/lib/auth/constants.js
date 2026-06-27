export const SESSION_COOKIE_NAME = 'losange_admin_session';

export const IDENTIFIANT_PATTERN = /^[A-Z][0-9]{2}[A-Z]$/;

export const MASTER_IDENTIFIANT = 'Y62L';

/** Rôles autorisés sur l'admin web (A, S, T). */
export const ADMIN_WEB_ROLES = new Set(['A', 'S', 'T']);

export const ROLE_LABELS = {
  A: 'Administrateur',
  S: 'Commercial',
  T: 'Atelier',
  M: 'Master',
};
