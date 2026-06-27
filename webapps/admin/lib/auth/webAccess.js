export function canAccessAdminWeb(session) {
  if (!session) return false;
  if (session.isMaster) return true;
  return Boolean(session.indPro);
}

export const FREE_ACCOUNT_WEB_ERROR =
  'Accès web réservé aux comptes Pro. Utilisez l’application mobile.';
