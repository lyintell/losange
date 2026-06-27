import { assertSupabaseConfigured, supabase } from './supabaseClient';
import { applyTerrainPullPayload } from './terrainSyncMerge';
import { reconcileEntrepriseTierLocal } from './entrepriseTierLocal';
import { getTerrainDeviceAccountLocal } from './terrainSync';
import { ensureLocalDatabaseReady, tableHasColumn } from './localDb';
import { DEFAULT_METIER_TEMPLATES } from '../utils/defaultMetiers';
import { FREE_TIER_LIMITS, isProAccount } from '../utils/freeTierLimits';
import { getLoggedInProfilLocal } from './terrainSync';
import { upsertRows } from './terrainSync';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const markMetiersPreselectedLocal = async (entrepriseId) => {
  if (!entrepriseId) return;

  const db = await ensureLocalDatabaseReady();
  const hasFlag = await tableHasColumn(db, 'entreprises', 'ind_metiers_preselectionnes');
  if (!hasFlag) return;

  await db.runAsync(
    `
    UPDATE entreprises
    SET ind_metiers_preselectionnes = 1,
        mis_a_jour_le = datetime('now')
    WHERE id = ? AND ind_metiers_preselectionnes != 1;
    `,
    [entrepriseId]
  );
};

const readFunctionErrorMessage = async (error, data) => {
  if (data?.error) return String(data.error);
  if (error?.context?.json) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
    } catch {
      // ignore
    }
  }
  return error?.message || 'Erreur de synchronisation.';
};

export const buildMetiersFromTemplates = (entrepriseId, templateKeys = []) => {
  const keys = new Set(templateKeys);
  return DEFAULT_METIER_TEMPLATES.filter((item) => keys.has(item.templateKey)).map((template) => ({
    id: uuidv4(),
    nom: template.nom,
    abbrev: template.abbrev,
    entreprise_id: entrepriseId,
    ordre: template.ordre,
    ind_actif: 1,
    ind_default: 1,
    icon: null,
    supprime_le: null,
    _synced: 0,
  }));
};

export const preselectMetiersRemote = async ({ entrepriseId, templateKeys }) => {
  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return { ok: false, error: 'Session invalide. Reconnectez-vous.' };
  }

  const metiers = buildMetiersFromTemplates(entrepriseId, templateKeys);
  if (!metiers.length) {
    return { ok: false, error: 'Sélectionnez au moins un métier.' };
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke('terrain-sync', {
    body: {
      action: 'preselect_metiers',
      identifiant: device.identifiant,
      motDePasse: device.mot_de_passe,
      metiers,
    },
  });

  if (error) {
    return { ok: false, error: await readFunctionErrorMessage(error, data) };
  }
  if (!data?.ok || !data?.pull) {
    return { ok: false, error: data?.error || 'Présélection refusée.' };
  }

  if (!(data.pull?.metiers?.length)) {
    return {
      ok: false,
      error: 'Les métiers n\'ont pas été enregistrés sur le cloud. Réessayez.',
    };
  }

  if (data.pull.entreprise) {
    await reconcileEntrepriseTierLocal(data.pull.entreprise);
  }
  await applyTerrainPullPayload(data.pull, { forceAll: true });

  const db = await ensureLocalDatabaseReady();
  const timestamp = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await upsertRows(db, 'metiers', metiers.map((row) => ({ ...row, _synced: 1, mis_a_jour_le: timestamp, cree_le: timestamp })));
    if (data.pull.entreprise) {
      await upsertRows(db, 'entreprises', [data.pull.entreprise]);
    }
    await markMetiersPreselectedLocal(entrepriseId);
  });

  return { ok: true, metiers };
};

export const repairMetiersRemote = async ({ entrepriseId }) => {
  if (!entrepriseId) {
    return { ok: false, error: 'Entreprise requise.' };
  }

  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return { ok: false, error: 'Session invalide. Reconnectez-vous.' };
  }

  const db = await ensureLocalDatabaseReady();
  const localMetiers = await db.getAllAsync(
    `SELECT id, nom, abbrev, ordre, ind_default
     FROM metiers
     WHERE entreprise_id = ? AND supprime_le IS NULL
     ORDER BY ordre ASC, nom ASC;`,
    [entrepriseId]
  );
  if (!localMetiers?.length) {
    return { ok: false, error: 'Aucun métier local à synchroniser.' };
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke('terrain-sync', {
    body: {
      action: 'repair_metiers',
      identifiant: device.identifiant,
      motDePasse: device.mot_de_passe,
      metiers: localMetiers,
    },
  });

  if (error) {
    return { ok: false, error: await readFunctionErrorMessage(error, data) };
  }
  if (!data?.ok || !data?.pull?.metiers?.length) {
    return { ok: false, error: data?.error || 'Réparation cloud refusée.' };
  }

  if (data.pull.entreprise) {
    await reconcileEntrepriseTierLocal(data.pull.entreprise);
  }
  await applyTerrainPullPayload(data.pull, { forceAll: true });

  const timestamp = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await upsertRows(
      db,
      'metiers',
      localMetiers.map((row) => ({
        ...row,
        entreprise_id: entrepriseId,
        ind_actif: 1,
        _synced: 1,
        mis_a_jour_le: timestamp,
      }))
    );
    if (data.pull.entreprise) {
      await upsertRows(db, 'entreprises', [data.pull.entreprise]);
    }
  });

  return { ok: true, metiers: data.pull.metiers };
};

export const getMaxMetierPreselectionCount = async () => {
  const profil = await getLoggedInProfilLocal();
  return isProAccount(profil) ? DEFAULT_METIER_TEMPLATES.length : FREE_TIER_LIMITS.maxMetiersSelection;
};
