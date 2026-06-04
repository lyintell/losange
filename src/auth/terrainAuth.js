import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../db/supabaseClient';
import {
  clearLocalTerrainData,
  clearTerrainSessionLocal,
  forceLogoutInactiveEntreprise,
  getTerrainDeviceAccountLocal,
  getTerrainSessionLocal,
  INACTIVE_ENTREPRISE_ERROR,
  isEntrepriseActiveLocal,
  isInactiveEntrepriseError,
  isLocalTerrainDataEmpty,
  isSameTerrainAccountRegisteredLocally,
  loginTerrainOfflineLocal,
  markEntrepriseInactiveLocal,
  revokeTerrainSessionIfEntrepriseInactive,
  saveTerrainSessionLocal,
  syncTerrainBootstrapLocal,
  upsertRows,
  willSwitchTerrainAccount,
} from '../db/terrainSync';
import { ensureLocalDatabaseReady } from '../db/localDb';
import { runTerrainSyncOnLogin, runTerrainSyncPullOnly, runTerrainSyncPushOnly, runTerrainSyncPushPull } from '../db/terrainSyncPro';
import { applyTerrainPullPayload, countLocalClientsForEntreprise } from '../db/terrainSyncMerge';
import { hasInternetConnection } from '../utils/network';
import { ensureCatalogueLocal } from '../db/querries';

const FIRST_LOGIN_OFFLINE_ERROR = 'Veuillez vous connecter pour une première connexion.';

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
    return 'Connexion refusee. Verifiez identifiant/mot de passe et la configuration Supabase.';
  }

  return rawMessage || 'Erreur de connexion.';
};

export const assessTerrainLogin = async (identifiant) => {
  const emptyLocalData = await isLocalTerrainDataEmpty();

  if (emptyLocalData) {
    const online = await hasInternetConnection();
    if (!online) {
      return {
        canProceed: false,
        error: FIRST_LOGIN_OFFLINE_ERROR,
      };
    }

    return { canProceed: true, isFirstLogin: true, needsAccountSwitchConfirm: false };
  }

  const needsAccountSwitchConfirm = await willSwitchTerrainAccount(identifiant);
  if (needsAccountSwitchConfirm) {
    return { canProceed: false, needsAccountSwitchConfirm: true };
  }

  return { canProceed: true, isFirstLogin: false, needsAccountSwitchConfirm: false };
};

export const loginTerrain = async (identifiant, motDePasse, { wipeLocal = false } = {}) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: 'Supabase non configure. Verifiez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (wipeLocal) {
    await clearLocalTerrainData();
    const online = await hasInternetConnection();
    if (!online) {
      return { ok: false, error: FIRST_LOGIN_OFFLINE_ERROR };
    }
  } else {
    const assessment = await assessTerrainLogin(identifiant);
    if (!assessment.canProceed) {
      if (assessment.needsAccountSwitchConfirm) {
        return { ok: false, needsAccountSwitchConfirm: true };
      }
      return { ok: false, error: assessment.error || FIRST_LOGIN_OFFLINE_ERROR };
    }
  }

  const online = await hasInternetConnection();
  const sameAccountRegistered = await isSameTerrainAccountRegisteredLocally(identifiant);

  if (!online) {
    if (sameAccountRegistered) {
      const offlineResult = await loginTerrainOfflineLocal(identifiant, motDePasse);
      if (!offlineResult.ok) {
        return offlineResult;
      }

      const catalogue = await ensureCatalogueLocal(offlineResult.entrepriseId);
      if (!catalogue.ok) {
        await clearTerrainSessionLocal();
        return {
          ok: false,
          error:
            'Catalogue metiers/unites absent. Connectez-vous en ligne pour synchroniser depuis Supabase.',
        };
      }

      return offlineResult;
    }
    return { ok: false, error: FIRST_LOGIN_OFFLINE_ERROR };
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke('terrain-login', {
    body: { identifiant, motDePasse },
  });

  if (error) {
    return { ok: false, error: await readFunctionErrorMessage(error, data) };
  }

  if (!data?.ok || !data?.payload?.profil || !data?.payload?.entreprise) {
    return { ok: false, error: data?.error || 'Authentification refusee.' };
  }

  if (Number(data.payload.entreprise.ind_active) !== 1) {
    return { ok: false, error: INACTIVE_ENTREPRISE_ERROR };
  }

  const remoteClientCount = data.payload.clients?.length ?? 0;

  try {
    await syncTerrainBootstrapLocal(data.payload);
    await saveTerrainSessionLocal({
      profilId: data.payload.profil.id,
      entrepriseId: data.payload.entreprise.id,
      identifiant: data.payload.profil.identifiant,
      motDePasse,
    });

    const entrepriseId = data.payload.entreprise.id;
    let localClientCount = await countLocalClientsForEntreprise(entrepriseId);

    if (remoteClientCount > 0 && localClientCount === 0) {
      await applyTerrainPullPayload(data.payload, { forceAll: true });
      localClientCount = await countLocalClientsForEntreprise(entrepriseId);
    }

    const catalogue = await ensureCatalogueLocal(entrepriseId);
    if (!catalogue.ok) {
      console.warn('Catalogue incomplet apres synchronisation Supabase:', catalogue);
    }

    if (remoteClientCount > 0 && localClientCount === 0) {
      throw new Error(
        'Les clients Supabase n ont pas pu etre enregistres localement. Verifiez les migrations SQLite (supprime_le, notes).'
      );
    }
  } catch (syncError) {
    console.error('Erreur synchronisation locale:', syncError);
    await clearTerrainSessionLocal();
    return {
      ok: false,
      error: syncError.message || 'Impossible de stocker les donnees localement.',
    };
  }

  if (Number(data.payload.entreprise.ind_pro) === 1) {
    const syncResult = await runTerrainSyncOnLogin();
    if (syncResult.forcedLogout) {
      return { ok: false, error: syncResult.error || INACTIVE_ENTREPRISE_ERROR };
    }
    if (!syncResult.ok) {
      console.warn('Sync Pro apres connexion:', syncResult.error);
    }
  } else if (remoteClientCount === 0 && (data.payload.chantiers?.length ?? 0) > 0) {
    console.warn(
      'Chantiers Supabase sans clients locaux: verifiez entreprise_id des clients dans Supabase.'
    );
  }

  return {
    ok: true,
    entrepriseId: data.payload.entreprise.id,
    profilId: data.payload.profil.id,
  };
};

export const restoreTerrainSession = async () => {
  try {
    const session = await getTerrainSessionLocal();
    if (!session?.entreprise_id || !session?.profil_id) {
      return { ok: false };
    }

    if (!(await isEntrepriseActiveLocal(session.entreprise_id))) {
      await clearTerrainSessionLocal();
      return { ok: false, error: INACTIVE_ENTREPRISE_ERROR };
    }

    return {
      ok: true,
      entrepriseId: session.entreprise_id,
      profilId: session.profil_id,
    };
  } catch (error) {
    console.error('Erreur restauration session terrain:', error);
    return { ok: false };
  }
};

/** Verifie l'etat du compte (local + Supabase si en ligne) et force la deconnexion si inactif. */
export const ensureTerrainSessionAllowed = async ({ verifyRemote = false } = {}) => {
  const revoked = await revokeTerrainSessionIfEntrepriseInactive();
  if (revoked.inactive) {
    return { ok: false, forcedLogout: true, error: revoked.error };
  }

  const session = await getTerrainSessionLocal();
  if (!session?.entreprise_id) {
    return { ok: true };
  }

  if (!verifyRemote || !(await hasInternetConnection()) || !isSupabaseConfigured()) {
    return { ok: true, entrepriseId: session.entreprise_id };
  }

  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return { ok: true, entrepriseId: session.entreprise_id };
  }

  try {
    const { data, error } = await supabase.functions.invoke('terrain-login', {
      body: { identifiant: device.identifiant, motDePasse: device.mot_de_passe },
    });

    if (error) {
      const message = await readFunctionErrorMessage(error, data);
      if (isInactiveEntrepriseError(message) || isInactiveEntrepriseError(data?.error)) {
        return forceLogoutInactiveEntreprise(session.entreprise_id);
      }
      return { ok: true, entrepriseId: session.entreprise_id };
    }

    if (!data?.ok) {
      if (isInactiveEntrepriseError(data?.error)) {
        return forceLogoutInactiveEntreprise(session.entreprise_id);
      }
      return { ok: true, entrepriseId: session.entreprise_id };
    }

    const entreprise = data.payload?.entreprise;
    if (!entreprise || Number(entreprise.ind_active) !== 1) {
      if (entreprise) {
        const db = await ensureLocalDatabaseReady();
        await upsertRows(db, 'entreprises', [entreprise]);
      } else {
        await markEntrepriseInactiveLocal(session.entreprise_id);
      }
      await clearTerrainSessionLocal();
      return { ok: false, forcedLogout: true, error: INACTIVE_ENTREPRISE_ERROR };
    }

    if (entreprise) {
      const db = await ensureLocalDatabaseReady();
      await upsertRows(db, 'entreprises', [entreprise]);
    }

    return { ok: true, entrepriseId: session.entreprise_id };
  } catch (verifyError) {
    console.warn('Verification compte entreprise:', verifyError);
    return { ok: true, entrepriseId: session.entreprise_id };
  }
};

export const logoutTerrain = async () => {
  try {
    await runTerrainSyncPushOnly();
  } catch (error) {
    console.warn('Sync avant deconnexion:', error);
  }
  await clearTerrainSessionLocal();
};

export const syncTerrainDataFromSupabase = async () => runTerrainSyncPushPull();
