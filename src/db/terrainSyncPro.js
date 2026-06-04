import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from './supabaseClient';
import { ensureLocalDatabaseReady } from './localDb';
import {
  forceLogoutInactiveEntreprise,
  getTerrainDeviceAccountLocal,
  getLoggedInProfilLocal,
  isInactiveEntrepriseError,
  revokeTerrainSessionIfEntrepriseInactive,
  upsertRows,
} from './terrainSync';
import { applyTerrainPullPayload } from './terrainSyncMerge';
import { hasInternetConnection } from '../utils/network';

const CATALOGUE_PUSH_TABLES = ['ouvrages', 'ouvrage_unites'];
const TRANSACTIONAL_TABLES = ['clients', 'chantiers', 'releves', 'ligne_releves'];
const PUSH_ORDER = [...CATALOGUE_PUSH_TABLES, ...TRANSACTIONAL_TABLES];

let syncInProgress = false;

const readFunctionErrorMessage = async (error, data) => {
  if (data?.error) return String(data.error);

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch {
      // ignore
    }
  }

  return String(error?.message || 'Erreur de synchronisation.');
};

const guardSyncResultForInactiveEntreprise = async (result, entrepriseId) => {
  if (result && !result.ok && isInactiveEntrepriseError(result.error)) {
    return forceLogoutInactiveEntreprise(entrepriseId);
  }

  const revoked = await revokeTerrainSessionIfEntrepriseInactive();
  if (revoked.inactive) {
    return { ok: false, forcedLogout: true, error: revoked.error };
  }

  return result;
};

export const isProEntrepriseLocal = async () => {
  const profil = await getLoggedInProfilLocal();
  return Number(profil?.ind_pro) === 1;
};

export const getPendingSyncCount = async () => {
  const db = await ensureLocalDatabaseReady();
  let total = 0;

  for (const tableName of TRANSACTIONAL_TABLES) {
    const row = await db.getFirstAsync(
      `SELECT COUNT(*) AS count FROM ${tableName} WHERE _synced = 0;`
    );
    total += Number(row?.count || 0);
  }

  return total;
};

const selectUnsyncedRows = async (db, tableName, entrepriseId) => {
  if (tableName === 'ouvrages') {
    return db.getAllAsync(
      `SELECT * FROM ouvrages WHERE entreprise_id = ? AND _synced = 0;`,
      [entrepriseId]
    );
  }

  if (tableName === 'ouvrage_unites') {
    return db.getAllAsync(
      `
      SELECT ouvrage_unites.*
      FROM ouvrage_unites
      JOIN ouvrages ON ouvrages.id = ouvrage_unites.ouvrage_id
      WHERE ouvrages.entreprise_id = ? AND ouvrage_unites._synced = 0;
      `,
      [entrepriseId]
    );
  }

  if (tableName === 'clients') {
    return db.getAllAsync(
      `SELECT * FROM clients WHERE entreprise_id = ? AND _synced = 0;`,
      [entrepriseId]
    );
  }

  if (tableName === 'chantiers') {
    return db.getAllAsync(
      `
      SELECT chantiers.*
      FROM chantiers
      JOIN clients ON clients.id = chantiers.client_id
      WHERE clients.entreprise_id = ? AND chantiers._synced = 0;
      `,
      [entrepriseId]
    );
  }

  if (tableName === 'releves') {
    return db.getAllAsync(
      `
      SELECT releves.*
      FROM releves
      JOIN chantiers ON chantiers.id = releves.chantier_id
      JOIN clients ON clients.id = chantiers.client_id
      WHERE clients.entreprise_id = ? AND releves._synced = 0;
      `,
      [entrepriseId]
    );
  }

  if (tableName === 'ligne_releves') {
    return db.getAllAsync(
      `
      SELECT ligne_releves.*
      FROM ligne_releves
      JOIN releves ON releves.id = ligne_releves.releve_id
      JOIN chantiers ON chantiers.id = releves.chantier_id
      JOIN clients ON clients.id = chantiers.client_id
      WHERE clients.entreprise_id = ? AND ligne_releves._synced = 0;
      `,
      [entrepriseId]
    );
  }

  return [];
};

export const collectPushPayload = async (entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  const push = {};

  for (const tableName of PUSH_ORDER) {
    push[tableName] = await selectUnsyncedRows(db, tableName, entrepriseId);
  }

  return push;
};

const markTableSynced = async (db, tableName, rows = []) => {
  if (!rows.length) return;
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE ${tableName} SET _synced = 1 WHERE id IN (${placeholders});`,
    ids
  );
};

export const runTerrainSyncPushPull = async ({ skipPull = false } = {}) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configure.' };
  }

  if (!(await isProEntrepriseLocal())) {
    return { ok: false, error: 'Synchronisation cloud reservee aux comptes Pro.' };
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour synchroniser.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation deja en cours.' };
  }

  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return {
      ok: false,
      error: 'Reconnectez-vous en ligne une fois pour activer la synchronisation.',
    };
  }

  const session = await getLoggedInProfilLocal();
  const entrepriseId = session?.entreprise_id;
  if (!entrepriseId) {
    return { ok: false, error: 'Session terrain invalide.' };
  }

  syncInProgress = true;

  const emptyPush = {
    ouvrages: [],
    ouvrage_unites: [],
    clients: [],
    chantiers: [],
    releves: [],
    ligne_releves: [],
  };

  try {
    assertSupabaseConfigured();
    const pendingBefore = await getPendingSyncCount();

    // 1. Telecharger d'abord le cloud (applique si mis_a_jour_le plus recent)
    const pullFirst = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push: emptyPush,
      },
    });

    if (pullFirst.error) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: await readFunctionErrorMessage(pullFirst.error, pullFirst.data) },
        entrepriseId
      );
    }
    if (!pullFirst.data?.ok) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: pullFirst.data?.error || 'Telechargement refuse.' },
        entrepriseId
      );
    }
    if (!skipPull && pullFirst.data.pull) {
      await applyTerrainPullPayload(pullFirst.data.pull);
    }

    // 2. Envoyer les modifications locales encore en attente
    const push = await collectPushPayload(entrepriseId);

    const { data, error } = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push,
      },
    });

    if (error) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: await readFunctionErrorMessage(error, data) },
        entrepriseId
      );
    }

    if (!data?.ok) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: data?.error || 'Synchronisation refusee.' },
        entrepriseId
      );
    }

    const db = await ensureLocalDatabaseReady();
    await db.withTransactionAsync(async () => {
      for (const tableName of PUSH_ORDER) {
        await markTableSynced(db, tableName, push[tableName] || []);
      }
    });

    if (!skipPull && data.pull) {
      await applyTerrainPullPayload(data.pull);
    }

    const pendingAfter = await getPendingSyncCount();

    return guardSyncResultForInactiveEntreprise(
      {
        ok: true,
        entrepriseId,
        mode: skipPull ? 'push' : 'push_pull',
        pushedCounts: data.pushedCounts || {},
        pendingBefore,
        pendingAfter,
        catalogue: skipPull
          ? null
          : {
              metiersCount: data.pull?.metiers?.length ?? 0,
              unitesCount: data.pull?.unites?.length ?? 0,
              ouvragesCount: data.pull?.ouvrages?.length ?? 0,
            },
      },
      entrepriseId
    );
  } catch (syncError) {
    console.error('Erreur runTerrainSyncPushPull:', syncError);
    return { ok: false, error: syncError.message || 'Synchronisation impossible.' };
  } finally {
    syncInProgress = false;
  }
};

/** Telecharge Supabase vers le local (sans envoyer de modifications locales). */
export const runTerrainSyncPullOnly = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configure.' };
  }

  if (!(await isProEntrepriseLocal())) {
    return { ok: false, error: 'Synchronisation cloud reservee aux comptes Pro.' };
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour synchroniser.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation deja en cours.' };
  }

  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return {
      ok: false,
      error: 'Reconnectez-vous en ligne une fois pour activer la synchronisation.',
    };
  }

  const session = await getLoggedInProfilLocal();
  const entrepriseId = session?.entreprise_id;
  if (!entrepriseId) {
    return { ok: false, error: 'Session terrain invalide.' };
  }

  syncInProgress = true;

  try {
    assertSupabaseConfigured();

    const { data, error } = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push: {
          ouvrages: [],
          ouvrage_unites: [],
          clients: [],
          chantiers: [],
          releves: [],
          ligne_releves: [],
        },
      },
    });

    if (error) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: await readFunctionErrorMessage(error, data) },
        entrepriseId
      );
    }

    if (!data?.ok) {
      return guardSyncResultForInactiveEntreprise(
        { ok: false, error: data?.error || 'Synchronisation refusee.' },
        entrepriseId
      );
    }

    if (data.pull) {
      await applyTerrainPullPayload(data.pull);
    }

    const pendingAfter = await getPendingSyncCount();

    return guardSyncResultForInactiveEntreprise(
      {
        ok: true,
        entrepriseId,
        mode: 'pull',
        pendingAfter,
        catalogue: {
          metiersCount: data.pull?.metiers?.length ?? 0,
          unitesCount: data.pull?.unites?.length ?? 0,
          ouvragesCount: data.pull?.ouvrages?.length ?? 0,
        },
      },
      entrepriseId
    );
  } catch (syncError) {
    console.error('Erreur runTerrainSyncPullOnly:', syncError);
    return { ok: false, error: syncError.message || 'Telechargement impossible.' };
  } finally {
    syncInProgress = false;
  }
};

export const runTerrainSyncOnLogin = async () => {
  const pending = await getPendingSyncCount();
  if (pending > 0) {
    return runTerrainSyncPushPull();
  }
  return runTerrainSyncPullOnly();
};

export const runTerrainSyncPushOnly = async () => runTerrainSyncPushPull({ skipPull: true });
