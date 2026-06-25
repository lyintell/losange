import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from './supabaseClient';
import { ensureLocalDatabaseReady, runWithLocalDatabase, tableHasColumn } from './localDb';
import {
  enforceEntrepriseExpiryLocal,
  forceLogoutInactiveEntreprise,
  getTerrainDeviceAccountLocal,
  getLoggedInProfilLocal,
  isInactiveEntrepriseError,
  revokeTerrainSessionIfEntrepriseInactive,
  serializeRowsForCloudPush,
  upsertRows,
} from './terrainSync';
import { applyTerrainPullPayload, applyTerrainPullPayloadAccountOnly, mergeCatalogueFromPull } from './terrainSyncMerge';
import { reconcileEntrepriseTierLocal } from './entrepriseTierLocal';
import {
  hydrateTerrainImagesFromPull,
  syncPendingTerrainImagesToCloud,
} from './terrainImageStorage';
import { hasInternetConnection } from '../utils/network';

const ENTREPRISE_PUSH_TABLES = ['entreprises'];
const CATALOGUE_PUSH_TABLES = [
  'metiers',
  'metiers_entreprise',
  'fournisseurs',
  'ouvrages',
  'ouvrage_unites',
];
const TRANSACTIONAL_TABLES = ['clients', 'chantiers', 'releves', 'ligne_releves'];
const PUSH_ORDER = [...ENTREPRISE_PUSH_TABLES, ...CATALOGUE_PUSH_TABLES, ...TRANSACTIONAL_TABLES];

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

  const expiry = await enforceEntrepriseExpiryLocal(entrepriseId);
  if (expiry.expired) {
    return forceLogoutInactiveEntreprise(entrepriseId);
  }

  const revoked = await revokeTerrainSessionIfEntrepriseInactive();
  if (revoked.inactive) {
    return { ok: false, forcedLogout: true, error: revoked.error };
  }

  return result;
};

const assertEntrepriseStillActive = async (entrepriseId) => {
  const expiry = await enforceEntrepriseExpiryLocal(entrepriseId);
  if (expiry.expired) {
    return forceLogoutInactiveEntreprise(entrepriseId);
  }

  const revoked = await revokeTerrainSessionIfEntrepriseInactive();
  if (revoked.inactive) {
    return { ok: false, forcedLogout: true, error: revoked.error };
  }

  return null;
};

export const isProEntrepriseLocal = async () => {
  const profil = await getLoggedInProfilLocal();
  return Number(profil?.ind_pro) === 1;
};

export const getPendingSyncCount = async () => {
  const db = await ensureLocalDatabaseReady();
  const session = await getLoggedInProfilLocal();
  const entrepriseId = session?.entreprise_id;
  let total = 0;

  for (const tableName of PUSH_ORDER) {
    if (tableName === 'entreprises') {
      if (!entrepriseId) continue;
      const row = await db.getFirstAsync(
        `SELECT COUNT(*) AS count FROM entreprises WHERE id = ? AND _synced = 0;`,
        [entrepriseId]
      );
      total += Number(row?.count || 0);
      continue;
    }

    const row = await db.getFirstAsync(
      `SELECT COUNT(*) AS count FROM ${tableName} WHERE _synced = 0;`
    );
    total += Number(row?.count || 0);
  }

  if (entrepriseId) {
    const pendingDeletes = await db.getFirstAsync(
      `SELECT COUNT(*) AS count FROM pending_cloud_deletes WHERE entreprise_id = ?;`,
      [entrepriseId]
    );
    total += Number(pendingDeletes?.count || 0);
  }

  return total;
};

const selectUnsyncedRows = async (db, tableName, entrepriseId) => {
  if (tableName === 'entreprises') {
    return db.getAllAsync(`SELECT * FROM entreprises WHERE id = ? AND _synced = 0;`, [entrepriseId]);
  }

  if (tableName === 'metiers') {
    return db.getAllAsync(
      `SELECT * FROM metiers WHERE entreprise_id = ? AND _synced = 0;`,
      [entrepriseId]
    );
  }

  if (tableName === 'metiers_entreprise') {
    return db.getAllAsync(
      `SELECT * FROM metiers_entreprise WHERE entreprise_id = ? AND _synced = 0;`,
      [entrepriseId]
    );
  }

  if (tableName === 'fournisseurs') {
    return db.getAllAsync(
      `SELECT * FROM fournisseurs WHERE entreprise_id = ? AND _synced = 0;`,
      [entrepriseId]
    );
  }

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

const collectPendingCloudDeletes = async (entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  const rows = await db.getAllAsync(
    `SELECT table_name, record_id FROM pending_cloud_deletes WHERE entreprise_id = ?;`,
    [entrepriseId]
  );
  const pending = { ouvrages: [] };
  rows.forEach((row) => {
    if (row.table_name === 'ouvrages') {
      pending.ouvrages.push(String(row.record_id));
    }
  });
  return pending;
};

const clearPendingCloudDeletes = async (entrepriseId, deletePayload = {}) => {
  const db = await ensureLocalDatabaseReady();
  const ouvrageIds = Array.isArray(deletePayload.ouvrages) ? deletePayload.ouvrages : [];
  if (!ouvrageIds.length) return;

  const placeholders = ouvrageIds.map(() => '?').join(', ');
  await db.runAsync(
    `
    DELETE FROM pending_cloud_deletes
    WHERE entreprise_id = ?
      AND table_name = 'ouvrages'
      AND record_id IN (${placeholders});
    `,
    [entrepriseId, ...ouvrageIds]
  );
};

const migrateLegacyPendingOuvrageDeletes = async (db, entrepriseId) => {
  const rows = await db.getAllAsync(
    `SELECT record_id FROM pending_cloud_deletes WHERE entreprise_id = ? AND table_name = 'ouvrages';`,
    [entrepriseId]
  );
  if (!rows.length) return;

  const hasOuvrageSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  if (!hasOuvrageSupprimeLe) return;

  const deletedAt = new Date().toISOString();
  for (const row of rows) {
    const ouvrageId = String(row.record_id);
    const localOuvrage = await db.getFirstAsync('SELECT id FROM ouvrages WHERE id = ?;', [ouvrageId]);
    if (localOuvrage) {
      await db.runAsync(
        `
        UPDATE ouvrage_unites
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE ouvrage_id = ? AND supprime_le IS NULL;
        `,
        [deletedAt, ouvrageId]
      );
      await db.runAsync(
        `
        UPDATE ouvrages
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE id = ?;
        `,
        [deletedAt, ouvrageId]
      );
      await db.runAsync(
        `
        DELETE FROM pending_cloud_deletes
        WHERE entreprise_id = ? AND table_name = 'ouvrages' AND record_id = ?;
        `,
        [entrepriseId, ouvrageId]
      );
    }
  }
};

export const collectPushPayload = async (entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  await migrateLegacyPendingOuvrageDeletes(db, entrepriseId);
  const push = {};

  for (const tableName of PUSH_ORDER) {
    const rows = await selectUnsyncedRows(db, tableName, entrepriseId);
    push[tableName] = serializeRowsForCloudPush(tableName, rows);
  }

  return {
    push,
    delete: await collectPendingCloudDeletes(entrepriseId),
  };
};

const markTableSynced = async (db, tableName, rows = []) => {
  if (!rows.length) return;

  if (tableName === 'metiers_entreprise') {
    for (const row of rows) {
      if (!row?.entreprise_id || !row?.metier_id) continue;
      await db.runAsync(
        `
        UPDATE metiers_entreprise
        SET _synced = 1
        WHERE entreprise_id = ? AND metier_id = ?;
        `,
        [row.entreprise_id, row.metier_id]
      );
    }
    return;
  }

  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE ${tableName} SET _synced = 1 WHERE id IN (${placeholders});`,
    ids
  );
};

const FREE_PUSH_ORDER = ['entreprises'];

export const getPendingAccountSyncCount = async () => {
  const db = await ensureLocalDatabaseReady();
  const session = await getLoggedInProfilLocal();
  const entrepriseId = session?.entreprise_id;
  if (!entrepriseId) return 0;

  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM entreprises WHERE id = ? AND _synced = 0;`,
    [entrepriseId]
  );
  return Number(row?.count || 0);
};

const collectFreeTierPushPayload = async (entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  return {
    entreprises: await selectUnsyncedRows(db, 'entreprises', entrepriseId),
  };
};

export const runTerrainSyncFreePushPull = async ({ skipPull = false } = {}) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré.' };
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour synchroniser.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation déjà en cours.' };
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
    entreprises: [],
    ouvrages: [],
    ouvrage_unites: [],
    fournisseurs: [],
    clients: [],
    chantiers: [],
    releves: [],
    ligne_releves: [],
  };

  try {
    assertSupabaseConfigured();
    const pendingBefore = await getPendingAccountSyncCount();

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
        { ok: false, error: pullFirst.data?.error || 'Téléchargement refusé.' },
        entrepriseId
      );
    }
    if (!skipPull && pullFirst.data.pull) {
      if (pullFirst.data.pull.entreprise) {
        await reconcileEntrepriseTierLocal(pullFirst.data.pull.entreprise);
      }
      await applyTerrainPullPayloadAccountOnly(pullFirst.data.pull);
      const activeAfterPull = await assertEntrepriseStillActive(entrepriseId);
      if (activeAfterPull) return activeAfterPull;
    }

    const push = await collectFreeTierPushPayload(entrepriseId);
    const { data, error } = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push: { ...emptyPush, ...push },
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
        { ok: false, error: data?.error || 'Synchronisation refusée.' },
        entrepriseId
      );
    }

    await runWithLocalDatabase(async (db) => {
      await db.withTransactionAsync(async () => {
        for (const tableName of FREE_PUSH_ORDER) {
          await markTableSynced(db, tableName, push[tableName] || []);
        }
      });
    });

    if (!skipPull && data.pull) {
      if (data.pull.entreprise) {
        await reconcileEntrepriseTierLocal(data.pull.entreprise);
      }
      await applyTerrainPullPayloadAccountOnly(data.pull);
      const activeAfterPull = await assertEntrepriseStillActive(entrepriseId);
      if (activeAfterPull) return activeAfterPull;
    }

    const pendingAfter = await getPendingAccountSyncCount();

    return guardSyncResultForInactiveEntreprise(
      {
        ok: true,
        entrepriseId,
        mode: skipPull ? 'push_account' : 'push_pull_account',
        pushedCounts: data.pushedCounts || {},
        pendingBefore,
        pendingAfter,
      },
      entrepriseId
    );
  } catch (syncError) {
    console.error('Erreur runTerrainSyncFreePushPull:', syncError);
    return { ok: false, error: syncError.message || 'Synchronisation impossible.' };
  } finally {
    syncInProgress = false;
  }
};

export const refreshCatalogueFromCloudLocal = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré.' };
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour charger le catalogue.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation déjà en cours.' };
  }

  const device = await getTerrainDeviceAccountLocal();
  if (!device?.identifiant || !device?.mot_de_passe) {
    return {
      ok: false,
      error: 'Reconnectez-vous en ligne une fois pour charger le catalogue.',
    };
  }

  const session = await getLoggedInProfilLocal();
  const entrepriseId = session?.entreprise_id;
  if (!entrepriseId) {
    return { ok: false, error: 'Session terrain invalide.' };
  }

  syncInProgress = true;

  const emptyPush = {
    entreprises: [],
    ouvrages: [],
    ouvrage_unites: [],
    fournisseurs: [],
    clients: [],
    chantiers: [],
    releves: [],
    ligne_releves: [],
  };

  try {
    assertSupabaseConfigured();

    const { data, error } = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push: emptyPush,
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
        { ok: false, error: data?.error || 'Téléchargement du catalogue refusé.' },
        entrepriseId
      );
    }

    if (data.pull) {
      await mergeCatalogueFromPull(data.pull);
    }

    return guardSyncResultForInactiveEntreprise(
      {
        ok: true,
        entrepriseId,
        catalogue: {
          metiersCount: data.pull?.metiers?.length ?? 0,
          unitesCount: data.pull?.unites?.length ?? 0,
          ouvragesCount: data.pull?.ouvrages?.length ?? 0,
        },
      },
      entrepriseId
    );
  } catch (syncError) {
    console.error('Erreur refreshCatalogueFromCloudLocal:', syncError);
    return { ok: false, error: syncError.message || 'Impossible de charger le catalogue.' };
  } finally {
    syncInProgress = false;
  }
};

export const runTerrainSyncPushPull = async ({ skipPull = false } = {}) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase non configuré.' };
  }

  if (!(await isProEntrepriseLocal())) {
    return runTerrainSyncFreePushPull({ skipPull });
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour synchroniser.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation déjà en cours.' };
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
    entreprises: [],
    ouvrages: [],
    ouvrage_unites: [],
    fournisseurs: [],
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
        { ok: false, error: pullFirst.data?.error || 'Téléchargement refusé.' },
        entrepriseId
      );
    }
    if (!skipPull && pullFirst.data.pull) {
      if (pullFirst.data.pull.entreprise) {
        await reconcileEntrepriseTierLocal(pullFirst.data.pull.entreprise);
      }
      await applyTerrainPullPayload(pullFirst.data.pull);
      await hydrateTerrainImagesFromPull(pullFirst.data.pull);
      const activeAfterPull = await assertEntrepriseStillActive(entrepriseId);
      if (activeAfterPull) return activeAfterPull;
    }

    // 2. Envoyer les images locales, puis les modifications SQLite
    await syncPendingTerrainImagesToCloud(entrepriseId);
    const { push, delete: deletePayload } = await collectPushPayload(entrepriseId);

    const { data, error } = await supabase.functions.invoke('terrain-sync', {
      body: {
        identifiant: device.identifiant,
        motDePasse: device.mot_de_passe,
        push,
        delete: deletePayload,
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
        { ok: false, error: data?.error || 'Synchronisation refusée.' },
        entrepriseId
      );
    }

    await runWithLocalDatabase(async (db) => {
      await db.withTransactionAsync(async () => {
        for (const tableName of PUSH_ORDER) {
          await markTableSynced(db, tableName, push[tableName] || []);
        }
      });
    });
    await clearPendingCloudDeletes(entrepriseId, deletePayload);

    if (!skipPull && data.pull) {
      if (data.pull.entreprise) {
        await reconcileEntrepriseTierLocal(data.pull.entreprise);
      }
      await applyTerrainPullPayload(data.pull);
      await hydrateTerrainImagesFromPull(data.pull);
      const activeAfterPull = await assertEntrepriseStillActive(entrepriseId);
      if (activeAfterPull) return activeAfterPull;
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
    return { ok: false, error: 'Supabase non configuré.' };
  }

  if (!(await isProEntrepriseLocal())) {
    return { ok: false, error: 'Synchronisation cloud réservée aux comptes Pro.' };
  }

  if (!(await hasInternetConnection())) {
    return { ok: false, error: 'Connexion internet requise pour synchroniser.' };
  }

  if (syncInProgress) {
    return { ok: false, error: 'Synchronisation déjà en cours.' };
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
          entreprises: [],
          fournisseurs: [],
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
        { ok: false, error: data?.error || 'Synchronisation refusée.' },
        entrepriseId
      );
    }

    if (data.pull) {
      if (data.pull.entreprise) {
        await reconcileEntrepriseTierLocal(data.pull.entreprise);
      }
      await applyTerrainPullPayload(data.pull);
      await hydrateTerrainImagesFromPull(data.pull);
      const activeAfterPull = await assertEntrepriseStillActive(entrepriseId);
      if (activeAfterPull) return activeAfterPull;
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
    return { ok: false, error: syncError.message || 'Téléchargement impossible.' };
  } finally {
    syncInProgress = false;
  }
};

export const runTerrainSyncOnLogin = async () => {
  const isPro = await isProEntrepriseLocal();
  if (!isPro) {
    return runTerrainSyncFreePushPull();
  }

  const pending = await getPendingSyncCount();
  if (pending > 0) {
    return runTerrainSyncPushPull();
  }
  return runTerrainSyncPullOnly();
};

export const runTerrainSyncPushOnly = async () => {
  if (await isProEntrepriseLocal()) {
    return runTerrainSyncPushPull({ skipPull: true });
  }
  return runTerrainSyncFreePushPull({ skipPull: true });
};
