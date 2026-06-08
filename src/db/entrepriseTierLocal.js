import { ensureLocalDatabaseReady } from './localDb';
import { deleteImageFileLocal } from './terrainImageStorage';
import { upsertRows } from './terrainSync';
import { applyTerrainPullPayloadAccountOnly, mergeCatalogueFromPull } from './terrainSyncMerge';
import { FREE_TIER_LIMITS } from '../utils/freeTierLimits';

const sortByMisAJourLeDesc = (rows) =>
  [...rows].sort(
    (left, right) =>
      Date.parse(String(right.mis_a_jour_le ?? '')) - Date.parse(String(left.mis_a_jour_le ?? ''))
  );

const activeRows = (rows) => rows.filter((row) => !row.supprime_le);

const tombstoneByIds = async (db, tableName, ids, deletedAt) => {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE ${tableName} SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now') WHERE id IN (${placeholders});`,
    [deletedAt, ...ids]
  );
};

const tombstoneRelevesCascade = async (db, releveIds, deletedAt) => {
  if (!releveIds.length) return;
  const placeholders = releveIds.map(() => '?').join(', ');
  const lignes = await db.getAllAsync(
    `SELECT id FROM ligne_releves WHERE releve_id IN (${placeholders}) AND supprime_le IS NULL;`,
    releveIds
  );
  await tombstoneByIds(
    db,
    'ligne_releves',
    lignes.map((row) => String(row.id)),
    deletedAt
  );
  await tombstoneByIds(db, 'releves', releveIds, deletedAt);
};

const tombstoneChantiersCascade = async (db, chantierIds, deletedAt) => {
  if (!chantierIds.length) return;
  const placeholders = chantierIds.map(() => '?').join(', ');
  const releves = await db.getAllAsync(
    `SELECT id FROM releves WHERE chantier_id IN (${placeholders}) AND supprime_le IS NULL;`,
    chantierIds
  );
  await tombstoneRelevesCascade(
    db,
    releves.map((row) => String(row.id)),
    deletedAt
  );
  await tombstoneByIds(db, 'chantiers', chantierIds, deletedAt);
};

const tombstoneClientsCascade = async (db, clientIds, deletedAt) => {
  if (!clientIds.length) return;
  const placeholders = clientIds.map(() => '?').join(', ');
  const chantiers = await db.getAllAsync(
    `SELECT id FROM chantiers WHERE client_id IN (${placeholders}) AND supprime_le IS NULL;`,
    clientIds
  );
  await tombstoneChantiersCascade(
    db,
    chantiers.map((row) => String(row.id)),
    deletedAt
  );
  await tombstoneByIds(db, 'clients', clientIds, deletedAt);
};

const tombstoneOuvragesCascade = async (db, ouvrageIds, deletedAt) => {
  if (!ouvrageIds.length) return;
  const placeholders = ouvrageIds.map(() => '?').join(', ');
  const ouvrageUnites = await db.getAllAsync(
    `SELECT id FROM ouvrage_unites WHERE ouvrage_id IN (${placeholders}) AND supprime_le IS NULL;`,
    ouvrageIds
  );
  await tombstoneByIds(
    db,
    'ouvrage_unites',
    ouvrageUnites.map((row) => String(row.id)),
    deletedAt
  );
  await tombstoneByIds(db, 'ouvrages', ouvrageIds, deletedAt);
};

const clearChantierPhotosLocal = async (db, chantierIds) => {
  if (!chantierIds.length) return;
  const placeholders = chantierIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync(
    `SELECT id, photo_1, photo_2, photo_3 FROM chantiers WHERE id IN (${placeholders});`,
    chantierIds
  );
  for (const row of rows) {
    for (const slot of ['photo_1', 'photo_2', 'photo_3']) {
      if (row[slot]) {
        await deleteImageFileLocal(row[slot]);
      }
    }
  }
  await db.runAsync(
    `UPDATE chantiers SET photo_1 = NULL, photo_2 = NULL, photo_3 = NULL, _synced = 0, mis_a_jour_le = datetime('now') WHERE id IN (${placeholders});`,
    chantierIds
  );
};

const clearLignePhotosLocal = async (db, releveIds) => {
  if (!releveIds.length) return;
  const placeholders = releveIds.map(() => '?').join(', ');
  const lignes = await db.getAllAsync(
    `SELECT id, photo FROM ligne_releves WHERE releve_id IN (${placeholders}) AND photo IS NOT NULL;`,
    releveIds
  );
  for (const ligne of lignes) {
    if (ligne.photo) {
      await deleteImageFileLocal(ligne.photo);
    }
  }
  await db.runAsync(
    `UPDATE ligne_releves SET photo = NULL, _synced = 0, mis_a_jour_le = datetime('now') WHERE releve_id IN (${placeholders});`,
    releveIds
  );
};

export const applyFreeTierDowngradeLocal = async (entrepriseId, { proDowngradedLe = null } = {}) => {
  if (!entrepriseId) return { ok: false, error: 'Entreprise invalide.' };

  const db = await ensureLocalDatabaseReady();
  const deletedAt = proDowngradedLe || new Date().toISOString();

  const entreprise = await db.getFirstAsync('SELECT logo FROM entreprises WHERE id = ?;', [entrepriseId]);
  if (entreprise?.logo) {
    await deleteImageFileLocal(entreprise.logo);
  }

  const profils = await db.getAllAsync(
    'SELECT id, role FROM profils WHERE entreprise_id = ?;',
    [entrepriseId]
  );
  const adminProfil = profils.find((row) => String(row.role) === 'A') ?? profils[0];
  const adminId = adminProfil ? String(adminProfil.id) : null;
  const profilIdsToDelete = profils
    .map((row) => String(row.id))
    .filter((id) => id !== adminId);
  if (profilIdsToDelete.length) {
    const placeholders = profilIdsToDelete.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM profils WHERE id IN (${placeholders});`, profilIdsToDelete);
  }

  const clients = await db.getAllAsync(
    'SELECT id, mis_a_jour_le, supprime_le FROM clients WHERE entreprise_id = ?;',
    [entrepriseId]
  );
  const activeClients = sortByMisAJourLeDesc(activeRows(clients));
  const clientsToKeep = new Set(
    activeClients.slice(0, FREE_TIER_LIMITS.maxClients).map((row) => String(row.id))
  );
  const clientsToRemove = activeClients
    .filter((row) => !clientsToKeep.has(String(row.id)))
    .map((row) => String(row.id));
  await tombstoneClientsCascade(db, clientsToRemove, deletedAt);

  const keptClientIds = [...clientsToKeep];
  let chantiers = [];
  if (keptClientIds.length) {
    const placeholders = keptClientIds.map(() => '?').join(', ');
    chantiers = await db.getAllAsync(
      `SELECT id, mis_a_jour_le, supprime_le FROM chantiers WHERE client_id IN (${placeholders});`,
      keptClientIds
    );
  }

  const activeChantiers = sortByMisAJourLeDesc(activeRows(chantiers));
  const chantiersToKeep = new Set(
    activeChantiers.slice(0, FREE_TIER_LIMITS.maxChantiers).map((row) => String(row.id))
  );
  const chantiersToRemove = activeChantiers
    .filter((row) => !chantiersToKeep.has(String(row.id)))
    .map((row) => String(row.id));
  await tombstoneChantiersCascade(db, chantiersToRemove, deletedAt);

  const keptChantierIds = [...chantiersToKeep];
  await clearChantierPhotosLocal(db, keptChantierIds);

  if (keptChantierIds.length) {
    const placeholders = keptChantierIds.map(() => '?').join(', ');
    const releves = await db.getAllAsync(
      `SELECT id FROM releves WHERE chantier_id IN (${placeholders}) AND supprime_le IS NULL;`,
      keptChantierIds
    );
    await clearLignePhotosLocal(
      db,
      releves.map((row) => String(row.id))
    );
  }

  const ouvrages = await db.getAllAsync(
    'SELECT id, metier_id, mis_a_jour_le, supprime_le FROM ouvrages WHERE entreprise_id = ?;',
    [entrepriseId]
  );
  const ouvragesByMetier = new Map();
  for (const ouvrage of activeRows(ouvrages)) {
    const metierId = String(ouvrage.metier_id);
    const list = ouvragesByMetier.get(metierId) ?? [];
    list.push(ouvrage);
    ouvragesByMetier.set(metierId, list);
  }

  const ouvragesToRemove = [];
  ouvragesByMetier.forEach((rows) => {
    sortByMisAJourLeDesc(rows)
      .slice(FREE_TIER_LIMITS.maxOuvragesPerMetier)
      .forEach((row) => {
        ouvragesToRemove.push(String(row.id));
      });
  });
  await tombstoneOuvragesCascade(db, ouvragesToRemove, deletedAt);

  await db.runAsync(
    `
    UPDATE entreprises
    SET logo = NULL,
        ind_tva = 0,
        pro_downgraded_le = ?,
        mis_a_jour_le = datetime('now'),
        _synced = 0
    WHERE id = ?;
    `,
    [deletedAt, entrepriseId]
  );

  return { ok: true, proDowngradedLe: deletedAt };
};

export const markTransactionalRowsPendingSyncLocal = async (entrepriseId) => {
  if (!entrepriseId) return;

  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE ouvrages
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE entreprise_id = ? AND supprime_le IS NULL;
    `,
    [entrepriseId]
  );
  await db.runAsync(
    `
    UPDATE ouvrage_unites
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE ouvrage_id IN (SELECT id FROM ouvrages WHERE entreprise_id = ? AND supprime_le IS NULL);
    `,
    [entrepriseId]
  );
  await db.runAsync(
    `
    UPDATE clients
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE entreprise_id = ? AND supprime_le IS NULL;
    `,
    [entrepriseId]
  );
  await db.runAsync(
    `
    UPDATE chantiers
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE client_id IN (SELECT id FROM clients WHERE entreprise_id = ? AND supprime_le IS NULL);
    `,
    [entrepriseId]
  );
  await db.runAsync(
    `
    UPDATE releves
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE chantier_id IN (
      SELECT chantiers.id
      FROM chantiers
      JOIN clients ON clients.id = chantiers.client_id
      WHERE clients.entreprise_id = ? AND chantiers.supprime_le IS NULL
    );
    `,
    [entrepriseId]
  );
  await db.runAsync(
    `
    UPDATE ligne_releves
    SET _synced = 0, mis_a_jour_le = datetime('now')
    WHERE releve_id IN (
      SELECT releves.id
      FROM releves
      JOIN chantiers ON chantiers.id = releves.chantier_id
      JOIN clients ON clients.id = chantiers.client_id
      WHERE clients.entreprise_id = ? AND releves.supprime_le IS NULL
    );
    `,
    [entrepriseId]
  );
};

export const reconcileEntrepriseTierLocal = async (remoteEntreprise) => {
  if (!remoteEntreprise?.id) {
    return { changed: false };
  }

  const db = await ensureLocalDatabaseReady();
  const localEntreprise = await db.getFirstAsync('SELECT * FROM entreprises WHERE id = ?;', [
    remoteEntreprise.id,
  ]);

  const localIndPro = Number(localEntreprise?.ind_pro ?? 0);
  const remoteIndPro = Number(remoteEntreprise.ind_pro ?? 0);
  const localDowngraded = String(localEntreprise?.pro_downgraded_le ?? '');
  const remoteDowngraded = String(remoteEntreprise.pro_downgraded_le ?? '');
  const localActivated = String(localEntreprise?.pro_activated_le ?? '');
  const remoteActivated = String(remoteEntreprise.pro_activated_le ?? '');

  if (localIndPro === 1 && remoteIndPro === 0) {
    await applyFreeTierDowngradeLocal(remoteEntreprise.id, {
      proDowngradedLe: remoteEntreprise.pro_downgraded_le,
    });
    await upsertRows(db, 'entreprises', [remoteEntreprise]);
    return { changed: true, kind: 'downgrade' };
  }

  if (remoteDowngraded && remoteDowngraded !== localDowngraded) {
    await applyFreeTierDowngradeLocal(remoteEntreprise.id, {
      proDowngradedLe: remoteEntreprise.pro_downgraded_le,
    });
    await upsertRows(db, 'entreprises', [remoteEntreprise]);
    return { changed: true, kind: 'downgrade' };
  }

  if (localIndPro === 0 && remoteIndPro === 1) {
    await upsertRows(db, 'entreprises', [remoteEntreprise]);
    if (remoteActivated && remoteActivated !== localActivated) {
      await markTransactionalRowsPendingSyncLocal(remoteEntreprise.id);
      return { changed: true, kind: 'upgrade' };
    }
  }

  await upsertRows(db, 'entreprises', [remoteEntreprise]);
  return { changed: false };
};

export const syncTerrainBootstrapAccountLocal = async (payload) => {
  await applyTerrainPullPayloadAccountOnly({
    entreprise: payload?.entreprise,
    profil: payload?.profil,
    profils: payload?.profils,
  });
  await mergeCatalogueFromPull({
    metiers: payload?.metiers,
    unites: payload?.unites,
  });
};
