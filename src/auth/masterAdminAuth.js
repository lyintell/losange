import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../db/supabaseClient';

const MASTER_SESSION_KEY = 'losange_master_session';

const getSessionStorage = () => {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.sessionStorage || null;
};

export const getMasterSessionToken = () => {
  const storage = getSessionStorage();
  if (!storage) return null;
  return storage.getItem(MASTER_SESSION_KEY);
};

export const setMasterSessionToken = (token) => {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(MASTER_SESSION_KEY, token);
};

export const clearMasterSession = () => {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(MASTER_SESSION_KEY);
};

const readFunctionErrorMessage = async (error, data) => {
  if (data?.error) return String(data.error);

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch (parseError) {
      console.warn('Impossible de lire le corps erreur Edge Function:', parseError);
    }
  }

  const rawMessage = String(error?.message || '');
  if (rawMessage.includes('non-2xx')) {
    return 'Connexion refusee. Verifiez identifiant/mot de passe, les secrets Supabase et que Verify JWT est desactive sur les fonctions.';
  }

  return rawMessage || 'Erreur Edge Function.';
};

const invokeMasterFunction = async (functionName, body) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: 'Supabase non configure. Verifiez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    const message = await readFunctionErrorMessage(error, data);
    return { ok: false, error: message };
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error || 'Authentification refusee.' };
  }

  return { ok: true, token: data.token };
};

export const loginMasterAdmin = async (identifiant, motDePasse) => {
  const result = await invokeMasterFunction('master-admin-login', { identifiant, motDePasse });
  if (!result.ok) return result;

  if (result.token) {
    setMasterSessionToken(result.token);
  }

  return { ok: true };
};

export const verifyMasterSession = async () => {
  const token = getMasterSessionToken();
  if (!token) {
    return { ok: false };
  }

  const result = await invokeMasterFunction('master-admin-verify', { token });
  if (!result.ok) {
    clearMasterSession();
  }
  return result;
};

export const logoutMasterAdmin = () => {
  clearMasterSession();
};
