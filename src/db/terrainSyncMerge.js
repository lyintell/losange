import { ensureLocalDatabaseReady } from './localDb';
import { upsertRows } from './terrainSync';

const TRANSACTIONAL_TABLES = [
  'metiers',
  'sections',
  'fournisseurs',
  'ouvrages',
  'ouvrage_unites',
  'clients',
  'chantiers',
  'releves',
  'section_releves',
  'ligne_releves',
];
const CATALOGUE_TABLES = ['unites'];

export const parseSyncTimestamp = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const shouldApplyRemoteRow = (localRow, remoteRow) => {
  if (!remoteRow) return false;
  if (!localRow) return true;

  const localPendingDelete = Boolean(localRow.supprime_le) && Number(localRow._synced) === 0;
  if (localPendingDelete && !remoteRow.supprime_le) {
    return false;
  }

  if (remoteRow.supprime_le && !localRow.supprime_le) {
    return parseSyncTimestamp(remoteRow.mis_a_jour_le) >= parseSyncTimestamp(localRow.mis_a_jour_le);
  }

  const remoteTs = parseSyncTimestamp(remoteRow.mis_a_jour_le);
  const localTs = parseSyncTimestamp(localRow.mis_a_jour_le);

  if (remoteTs > localTs) return true;
  if (remoteTs < localTs) return false;

  return Number(localRow._synced) === 1;
};

export const mergeCatalogueFromPull = async (pull = {}) => {
  const db = await ensureLocalDatabaseReady();

  await db.withTransactionAsync(async () => {
    for (const tableName of CATALOGUE_TABLES) {
      const key = tableName === 'ouvrage_unites' ? 'ouvrage_unites' : tableName;
      const rows = Array.isArray(pull[key]) ? pull[key] : [];
      if (!rows.length) continue;
      await upsertRows(db, tableName, rows);
    }
  });
};

export const mergeTransactionalFromPull = async (pull = {}, { forceAll = false } = {}) => {
  const db = await ensureLocalDatabaseReady();

  await db.withTransactionAsync(async () => {
    for (const tableName of TRANSACTIONAL_TABLES) {
      const remoteRows = Array.isArray(pull[tableName]) ? pull[tableName] : [];
      const toApply = [];

      for (const remoteRow of remoteRows) {
        if (forceAll) {
          toApply.push(remoteRow);
          continue;
        }

        const localRow = await db.getFirstAsync(`SELECT * FROM ${tableName} WHERE id = ?;`, [
          remoteRow.id,
        ]);

        if (shouldApplyRemoteRow(localRow, remoteRow)) {
          toApply.push(remoteRow);
        }
      }

      if (toApply.length) {
        await upsertRows(db, tableName, toApply);
      }
    }
  });
};

export const applyTerrainPullPayload = async (pull = {}, { forceAll = false } = {}) => {
  if (!pull) return;

  const db = await ensureLocalDatabaseReady();

  await db.withTransactionAsync(async () => {
    if (pull.entreprise) {
      const localEntreprise = await db.getFirstAsync('SELECT * FROM entreprises WHERE id = ?;', [
        pull.entreprise.id,
      ]);
      if (shouldApplyRemoteRow(localEntreprise, pull.entreprise)) {
        await upsertRows(db, 'entreprises', [pull.entreprise]);
      }
    }
    if (pull.profil) {
      await upsertRows(db, 'profils', [pull.profil]);
    }
    if (pull.profils?.length) {
      await upsertRows(db, 'profils', pull.profils);
    }
  });

  await mergeCatalogueFromPull(pull);
  await mergeTransactionalFromPull(pull, { forceAll });
};

/** Sync compte gratuit : entreprise et profil uniquement. */
export const applyTerrainPullPayloadAccountOnly = async (pull = {}) => {
  if (!pull) return;

  const db = await ensureLocalDatabaseReady();

  await db.withTransactionAsync(async () => {
    if (pull.entreprise) {
      const localEntreprise = await db.getFirstAsync('SELECT * FROM entreprises WHERE id = ?;', [
        pull.entreprise.id,
      ]);
      if (shouldApplyRemoteRow(localEntreprise, pull.entreprise)) {
        await upsertRows(db, 'entreprises', [pull.entreprise]);
      }
    }
    if (pull.profil) {
      await upsertRows(db, 'profils', [pull.profil]);
    }
    if (pull.profils?.length) {
      await upsertRows(db, 'profils', pull.profils);
    }
  });
};

export const countLocalClientsForEntreprise = async (entrepriseId) => {
  if (!entrepriseId) return 0;
  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM clients WHERE entreprise_id = ? AND supprime_le IS NULL;`,
    [entrepriseId]
  );
  return Number(row?.count || 0);
};
