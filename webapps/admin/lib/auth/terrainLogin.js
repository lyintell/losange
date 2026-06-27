import { ADMIN_WEB_ROLES } from './constants';
import { FREE_ACCOUNT_WEB_ERROR } from './webAccess';
import { createServerSupabaseClient } from '../supabase/server';

const INACTIVE_ENTREPRISE_ERROR = 'Compte inactif.';

async function readFunctionErrorMessage(error, data) {
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  if (error?.context?.json) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
    } catch {
      // ignore parse errors
    }
  }

  return error?.message || 'Erreur de connexion.';
}

export async function loginTerrainAdmin(identifiant, motDePasse) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.functions.invoke('terrain-login', {
    body: { identifiant, motDePasse },
  });

  if (error) {
    return { ok: false, error: await readFunctionErrorMessage(error, data) };
  }

  if (!data?.ok || !data?.payload?.profil || !data?.payload?.entreprise) {
    return { ok: false, error: data?.error || 'Identifiant ou mot de passe incorrect.' };
  }

  const { profil, entreprise } = data.payload;

  if (Number(entreprise.ind_active) !== 1) {
    return { ok: false, error: INACTIVE_ENTREPRISE_ERROR };
  }

  if (Number(entreprise.ind_pro) !== 1) {
    return { ok: false, error: FREE_ACCOUNT_WEB_ERROR };
  }

  const role = String(profil.role || '').toUpperCase();
  if (!ADMIN_WEB_ROLES.has(role)) {
    return {
      ok: false,
      error: 'Accès réservé aux comptes administrateur, commercial et atelier.',
    };
  }

  const entrepriseLogo = String(entreprise.logo || '').trim() || null;

  return {
    ok: true,
    session: {
      isMaster: false,
      profilId: String(profil.id),
      prenom: String(profil.prenom || ''),
      nom: String(profil.nom || ''),
      role,
      identifiant: String(profil.identifiant || identifiant),
      entrepriseId: String(entreprise.id),
      entrepriseNom: String(entreprise.nom || ''),
      entrepriseLogo,
      indPro: true,
    },
  };
}
