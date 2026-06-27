import { APP_NAME } from '@/lib/theme/colors';
import { MASTER_IDENTIFIANT } from './constants';
import { createServerSupabaseClient } from '../supabase/server';

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

  const rawMessage = String(error?.message || '');
  if (rawMessage.includes('non-2xx')) {
    return 'Connexion refusée. Vérifiez identifiant/mot de passe et les secrets Supabase.';
  }

  return rawMessage || 'Erreur de connexion.';
}

export function isMasterIdentifiant(identifiant) {
  return String(identifiant || '')
    .trim()
    .toUpperCase() === MASTER_IDENTIFIANT;
}

export async function loginMasterAdmin(identifiant, motDePasse) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.functions.invoke('master-admin-login', {
    body: { identifiant, motDePasse },
  });

  if (error) {
    return { ok: false, error: await readFunctionErrorMessage(error, data) };
  }

  if (!data?.ok || !data?.token) {
    return { ok: false, error: data?.error || 'Identifiant ou mot de passe incorrect.' };
  }

  return {
    ok: true,
    session: {
      isMaster: true,
      masterToken: String(data.token),
      profilId: 'master',
      prenom: 'Master',
      nom: 'Admin',
      role: 'M',
      identifiant: MASTER_IDENTIFIANT,
      entrepriseId: '',
      entrepriseNom: APP_NAME,
      entrepriseLogo: null,
    },
  };
}
