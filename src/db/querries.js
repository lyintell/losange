import { ensureLocalDatabaseReady, runWithLocalDatabase, tableHasColumn } from './localDb';
import {
  buildChantierPhotoKey,
  buildEntrepriseLogoKey,
  buildLignePhotoKey,
  CHANTIER_PHOTO_SLOTS,
  deleteImageFileLocal,
  persistTerrainImage,
} from './terrainImageStorage';
import { getLoggedInProfilLocal, getTerrainSessionLocal } from './terrainSync';
import { scheduleTerrainSyncAfterWrite } from './terrainSyncScheduler';
import { canModifyReleveForProfil, canSeeAllChantiers } from '../utils/terrainAccess';
import { computeReleveFacturation } from '../utils/releveFacturation';
import { normalizeReleveStatus, RELEVE_STATUS_DEFAULT } from '../utils/releveStatus';
import { computeChantierStatusFromReleves } from '../utils/chantierStatusFromReleves';
import { DEFAULT_METIERS } from '../utils/defaultMetiers';
import { FREE_TIER_LIMITS, filterDefaultMetiers, isProAccount } from '../utils/freeTierLimits';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
  computeMontantLigneReleve,
  computeQuantiteLigneReleve,
} from '../utils/ligneReleveCalcul';

const nowIso = () => new Date().toISOString();

const todayFactureDate = () => new Date().toISOString().slice(0, 10);

const notifyLocalDataChanged = () => {
  scheduleTerrainSyncAfterWrite();
};

const RELEVE_ACCESS_DENIED_ERROR =
  "Vous ne pouvez pas modifier un chantier ou relevé que vous n'avez pas pris.";

const buildClientTombstoneFilter = (hasSupprimeLe) =>
  hasSupprimeLe ? ' AND supprime_le IS NULL' : '';

const countActiveClientsForEntrepriseLocal = async (entrepriseId) => {
  if (!entrepriseId) return 0;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'clients', 'supprime_le');
  const tombstoneFilter = buildClientTombstoneFilter(hasSupprimeLe);
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM clients WHERE entreprise_id = ?${tombstoneFilter};`,
    [entrepriseId]
  );
  return Number(row?.count || 0);
};

const countActiveChantiersForEntrepriseLocal = async (entrepriseId) => {
  if (!entrepriseId) return 0;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe =
    (await tableHasColumn(db, 'chantiers', 'supprime_le')) &&
    (await tableHasColumn(db, 'clients', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe
    ? ' AND chantiers.supprime_le IS NULL AND clients.supprime_le IS NULL'
    : '';
  const row = await db.getFirstAsync(
    `
    SELECT COUNT(*) AS count
    FROM chantiers
    JOIN clients ON clients.id = chantiers.client_id
    WHERE clients.entreprise_id = ?${tombstoneFilter};
    `,
    [entrepriseId]
  );
  return Number(row?.count || 0);
};

const countOuvragesForMetierLocal = async (entrepriseId, metierId) => {
  if (!entrepriseId || !metierId) return 0;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasIndArticle = await tableHasColumn(db, 'ouvrages', 'ind_article');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const articleFilter = hasIndArticle ? ' AND (ind_article = 0 OR ind_article IS NULL)' : '';
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM ouvrages WHERE entreprise_id = ? AND metier_id = ?${articleFilter}${tombstoneFilter};`,
    [entrepriseId, metierId]
  );
  return Number(row?.count || 0);
};

const assertFreeTierClientLimit = async (entrepriseId) => {
  const profil = await getLoggedInProfilLocal();
  if (isProAccount(profil)) return;

  const count = await countActiveClientsForEntrepriseLocal(entrepriseId);
  if (count >= FREE_TIER_LIMITS.maxClients) {
    throw new Error(
      `Compte gratuit : maximum ${FREE_TIER_LIMITS.maxClients} clients actifs.`
    );
  }
};

const assertFreeTierChantierLimit = async (entrepriseId) => {
  const profil = await getLoggedInProfilLocal();
  if (isProAccount(profil)) return;

  const count = await countActiveChantiersForEntrepriseLocal(entrepriseId);
  if (count >= FREE_TIER_LIMITS.maxChantiers) {
    throw new Error(
      `Compte gratuit : maximum ${FREE_TIER_LIMITS.maxChantiers} chantiers actifs.`
    );
  }
};

const assertFreeTierOuvrageLimit = async (entrepriseId, metierId) => {
  const profil = await getLoggedInProfilLocal();
  if (isProAccount(profil)) return;

  const count = await countOuvragesForMetierLocal(entrepriseId, metierId);
  if (count >= FREE_TIER_LIMITS.maxOuvragesPerMetier) {
    throw new Error(
      `Compte gratuit : maximum ${FREE_TIER_LIMITS.maxOuvragesPerMetier} ouvrages par métier.`
    );
  }
};

const assertCanModifyReleveLocal = async (releve) => {
  const profil = await getLoggedInProfilLocal();
  if (!canModifyReleveForProfil(profil, releve)) {
    throw new Error(RELEVE_ACCESS_DENIED_ERROR);
  }
};

export const canCurrentUserModifyChantierLocal = async (chantierId) => {
  if (!chantierId) return false;
  const profil = await getLoggedInProfilLocal();
  if (!profil) return false;
  const releve = await getReleveByChantierLocal(chantierId);
  return canModifyReleveForProfil(profil, releve);
};

const getCurrentProfilIdLocal = async () => {
  const profil = await getLoggedInProfilLocal();
  if (profil?.id) return profil.id;

  const session = await getTerrainSessionLocal();
  return session?.profil_id || null;
};

const ROLE_LABELS = {
  A: 'Admin',
  C: 'Chantier',
  S: 'Commercial',
  T: 'Atelier',
};

export const getLoggedInProfilViewLocal = async () => {
  const profil = await getLoggedInProfilLocal();
  if (!profil) return null;

  return {
    ...profil,
    role_label: ROLE_LABELS[profil.role] || profil.role,
    is_pro: Number(profil.ind_pro) === 1,
  };
};

export const getFirstEntrepriseIdLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync('SELECT id FROM entreprises ORDER BY cree_le ASC LIMIT 1;');
  return row?.id || null;
};

export const ensureEntrepriseLocale = async () => {
  const entrepriseId = await getFirstEntrepriseIdLocal();
  if (!entrepriseId) {
    throw new Error('Aucune entreprise locale. Synchronisez les données depuis Supabase.');
  }
  return entrepriseId;
};

export const ensureCatalogueLocal = async (entrepriseId = null) => {
  const db = await ensureLocalDatabaseReady();
  const metiersRow = await db.getFirstAsync('SELECT COUNT(*) AS count FROM metiers;');
  const unitesRow = await db.getFirstAsync('SELECT COUNT(*) AS count FROM unites;');
  const metiersCount = Number(metiersRow?.count || 0);
  const unitesCount = Number(unitesRow?.count || 0);

  let ouvragesCount = null;
  if (entrepriseId) {
    const hasOuvrageSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
    const ouvrageTombstoneFilter = hasOuvrageSupprimeLe ? ' AND supprime_le IS NULL' : '';
    const ouvragesRow = await db.getFirstAsync(
      `SELECT COUNT(*) AS count FROM ouvrages WHERE entreprise_id = ?${ouvrageTombstoneFilter};`,
      [entrepriseId]
    );
    ouvragesCount = Number(ouvragesRow?.count || 0);
  }

  return {
    ok: metiersCount > 0 && unitesCount > 0,
    metiersCount,
    unitesCount,
    ouvragesCount,
    hasOuvrages: entrepriseId ? ouvragesCount > 0 : null,
  };
};

/** Tous les metiers du catalogue local (sync Supabase), sans filtre par ouvrages entreprise. */
export const getMetiersForEntrepriseLocal = async (entrepriseId = null) => {
  const metiers = await loadMetiersWithCatalogueRefreshLocal(entrepriseId);
  const profil = await getLoggedInProfilLocal();
  if (isProAccount(profil)) return metiers;
  return filterDefaultMetiers(metiers);
};

/** Métiers disponibles lors du choix d'un ouvrage (3 métiers par défaut actifs max en compte gratuit). */
export const getMetiersForSelectionLocal = async (entrepriseId = null) => {
  const metiers = await loadMetiersWithCatalogueRefreshLocal(entrepriseId);
  const profil = await getLoggedInProfilLocal();
  let active = metiers.filter((m) => Number(m.ind_actif) !== 0);
  if (!isProAccount(profil)) {
    active = filterDefaultMetiers(active);
    return active.slice(0, FREE_TIER_LIMITS.maxMetiersSelection);
  }
  return active;
};

const hasMetiersEntrepriseTable = async (db) => {
  const row = await db.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'metiers_entreprise';"
  );
  return Boolean(row?.name);
};

const mapMetierRow = (row) => ({
  ...row,
  ind_custom: Number(row?.ind_custom) === 1 ? 1 : 0,
  ind_actif: Number(row?.ind_actif) === 0 ? 0 : 1,
});

const ouvrageActifFilterSql = (hasIndActif, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  return hasIndActif ? ` AND (${prefix}ind_actif = 1 OR ${prefix}ind_actif IS NULL)` : '';
};

const ouvrageOrderBySql = (hasOrdre, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  if (hasOrdre) {
    return ` ORDER BY ${prefix}ordre ASC, ${prefix}nom ASC`;
  }
  return ` ORDER BY ${prefix}nom ASC`;
};

const ensureGlobalDefaultMetiersLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  const timestamp = nowIso();
  const hasEntrepriseIdCol = await tableHasColumn(db, 'metiers', 'entreprise_id');
  const hasSupprimeLeCol = await tableHasColumn(db, 'metiers', 'supprime_le');

  await db.withTransactionAsync(async () => {
    for (const metier of DEFAULT_METIERS) {
      const existing = await db.getFirstAsync('SELECT id FROM metiers WHERE id = ?;', [metier.id]);
      if (existing?.id) {
        if (hasEntrepriseIdCol && hasSupprimeLeCol) {
          await db.runAsync(
            `UPDATE metiers
             SET nom = ?, abbrev = ?, entreprise_id = NULL, supprime_le = NULL, mis_a_jour_le = ?
             WHERE id = ?;`,
            [metier.nom, metier.abbrev, timestamp, metier.id]
          );
        } else {
          await db.runAsync(
            'UPDATE metiers SET nom = ?, abbrev = ?, mis_a_jour_le = ? WHERE id = ?;',
            [metier.nom, metier.abbrev, timestamp, metier.id]
          );
        }
        continue;
      }

      if (hasEntrepriseIdCol) {
        await db.runAsync(
          `INSERT INTO metiers (
            id, nom, abbrev, icon, entreprise_id, cree_le, mis_a_jour_le, _synced
          ) VALUES (?, ?, ?, NULL, NULL, ?, ?, 1);`,
          [metier.id, metier.nom, metier.abbrev, timestamp, timestamp]
        );
      } else {
        await db.runAsync(
          `INSERT INTO metiers (id, nom, abbrev, icon, cree_le, mis_a_jour_le, _synced)
           VALUES (?, ?, ?, NULL, ?, ?, 1);`,
          [metier.id, metier.nom, metier.abbrev, timestamp, timestamp]
        );
      }
    }
  });
};

const ensureMetiersEntrepriseSeededLocal = async (entrepriseId) => {
  if (!entrepriseId) return;

  const db = await ensureLocalDatabaseReady();
  if (!(await hasMetiersEntrepriseTable(db))) return;

  await ensureGlobalDefaultMetiersLocal();

  const linkedRows = await db.getAllAsync(
    'SELECT metier_id FROM metiers_entreprise WHERE entreprise_id = ? AND supprime_le IS NULL;',
    [entrepriseId]
  );
  const linkedIds = new Set((linkedRows || []).map((row) => row.metier_id));
  const missing = DEFAULT_METIERS.filter((metier) => !linkedIds.has(metier.id));
  if (missing.length === 0) return;

  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const metier of missing) {
      await db.runAsync(
        `INSERT OR IGNORE INTO metiers_entreprise (
          entreprise_id, metier_id, ordre, ind_actif, cree_le, mis_a_jour_le, _synced
        ) VALUES (?, ?, ?, 1, ?, ?, 0);`,
        [entrepriseId, metier.id, metier.ordre, timestamp, timestamp]
      );
    }
  });
};

export const getMetiersLocal = async (entrepriseId = null) => {
  const db = await ensureLocalDatabaseReady();

  if (entrepriseId && (await hasMetiersEntrepriseTable(db))) {
    await ensureMetiersEntrepriseSeededLocal(entrepriseId);

    const hasEntrepriseIdCol = await tableHasColumn(db, 'metiers', 'entreprise_id');
    const hasMetierSupprimeLe = await tableHasColumn(db, 'metiers', 'supprime_le');
    const customSelect = hasEntrepriseIdCol
      ? 'CASE WHEN m.entreprise_id IS NOT NULL AND m.entreprise_id != \'\' THEN 1 ELSE 0 END AS ind_custom'
      : '0 AS ind_custom';
    const metierTombstoneFilter = hasMetierSupprimeLe ? ' AND m.supprime_le IS NULL' : '';

    const rows = await db.getAllAsync(
      `
      SELECT m.*, me.ind_actif, ${customSelect}
      FROM metiers m
      INNER JOIN metiers_entreprise me ON me.metier_id = m.id
      WHERE me.entreprise_id = ?
        AND me.supprime_le IS NULL${metierTombstoneFilter}
      ORDER BY me.ordre ASC, m.nom ASC;
      `,
      [entrepriseId]
    );
    return (rows || []).map(mapMetierRow);
  }

  const orderedQuery = `
    SELECT m.*
    FROM metiers m
    LEFT JOIN metiers_ordre mo ON mo.metier_id = m.id
    ORDER BY
      CASE WHEN mo.ordre IS NULL THEN 1 ELSE 0 END,
      mo.ordre ASC,
      m.nom ASC;
  `;

  try {
    return await db.getAllAsync(orderedQuery);
  } catch (error) {
    console.warn('Chargement métiers sans ordre local:', error);
    return db.getAllAsync('SELECT * FROM metiers ORDER BY nom ASC;');
  }
};

/** Charge les métiers ; tente un pull catalogue Supabase si vide (compte Pro). */
export const loadMetiersWithCatalogueRefreshLocal = async (entrepriseId = null) => {
  let metiers = await getMetiersLocal(entrepriseId);
  if (metiers.length > 0) return metiers;

  const profil = await getLoggedInProfilLocal();
  if (!isProAccount(profil)) return metiers;

  try {
    const { refreshCatalogueFromCloudLocal } = await import('./terrainSyncPro');
    const result = await refreshCatalogueFromCloudLocal();
    if (!result.ok) {
      console.warn('Catalogue métiers non rechargé:', result.error);
    }
  } catch (error) {
    console.warn('Erreur rechargement catalogue métiers:', error);
  }

  metiers = await getMetiersLocal(entrepriseId);
  if (metiers.length === 0 && entrepriseId) {
    await ensureCatalogueLocal(entrepriseId);
    await ensureMetiersEntrepriseSeededLocal(entrepriseId);
    metiers = await getMetiersLocal(entrepriseId);
  }
  return metiers;
};

export const saveMetiersOrderLocal = async (entrepriseId, metierIds = []) => {
  if (!entrepriseId) {
    throw new Error('Entreprise requise.');
  }

  const db = await ensureLocalDatabaseReady();
  const ids = (metierIds || []).filter(Boolean);
  const timestamp = nowIso();

  if (await hasMetiersEntrepriseTable(db)) {
    await ensureMetiersEntrepriseSeededLocal(entrepriseId);
    await db.withTransactionAsync(async () => {
      for (let index = 0; index < ids.length; index += 1) {
        await db.runAsync(
          `
          UPDATE metiers_entreprise
          SET ordre = ?, mis_a_jour_le = ?, _synced = 0
          WHERE entreprise_id = ? AND metier_id = ? AND supprime_le IS NULL;
          `,
          [index, timestamp, entrepriseId, ids[index]]
        );
      }
    });
    notifyLocalDataChanged();
    return;
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM metiers_ordre;');
    for (let index = 0; index < ids.length; index += 1) {
      await db.runAsync('INSERT INTO metiers_ordre (metier_id, ordre) VALUES (?, ?);', [
        ids[index],
        index,
      ]);
    }
  });
  notifyLocalDataChanged();
};

export const insertMetierEntrepriseLocal = async ({ entrepriseId, nom }) => {
  const trimmedNom = String(nom || '').trim();
  if (!entrepriseId || !trimmedNom) {
    throw new Error('Entreprise et nom du métier sont requis.');
  }

  const profil = await getLoggedInProfilLocal();
  if (!isProAccount(profil)) {
    throw new Error('Ajout de métier personnalisé réservé aux comptes Pro.');
  }

  const db = await ensureLocalDatabaseReady();
  if (!(await hasMetiersEntrepriseTable(db))) {
    throw new Error('Catalogue métiers non disponible.');
  }

  await ensureMetiersEntrepriseSeededLocal(entrepriseId);

  const duplicate = await db.getFirstAsync(
    `
    SELECT m.id
    FROM metiers m
    INNER JOIN metiers_entreprise me ON me.metier_id = m.id
    WHERE me.entreprise_id = ?
      AND me.supprime_le IS NULL
      AND m.supprime_le IS NULL
      AND LOWER(TRIM(m.nom)) = LOWER(?);
    `,
    [entrepriseId, trimmedNom]
  );
  if (duplicate?.id) {
    throw new Error('Un métier avec ce nom existe déjà.');
  }

  const metierId = uuidv4();
  const timestamp = nowIso();
  const abbrev = trimmedNom.slice(0, 3).toUpperCase();
  const maxOrdreRow = await db.getFirstAsync(
    'SELECT MAX(ordre) AS max_ordre FROM metiers_entreprise WHERE entreprise_id = ? AND supprime_le IS NULL;',
    [entrepriseId]
  );
  const ordre = Number(maxOrdreRow?.max_ordre ?? -1) + 1;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
      INSERT INTO metiers (
        id, nom, abbrev, icon, entreprise_id, cree_le, mis_a_jour_le, _synced
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0);
      `,
      [metierId, trimmedNom, abbrev, entrepriseId, timestamp, timestamp]
    );
    await db.runAsync(
      `
      INSERT INTO metiers_entreprise (
        entreprise_id, metier_id, ordre, ind_actif, cree_le, mis_a_jour_le, _synced
      ) VALUES (?, ?, ?, 1, ?, ?, 0);
      `,
      [entrepriseId, metierId, ordre, timestamp, timestamp]
    );
  });

  notifyLocalDataChanged();

  return {
    id: metierId,
    nom: trimmedNom,
    abbrev,
    entreprise_id: entrepriseId,
    ind_custom: 1,
  };
};

export const setMetierActifLocal = async (entrepriseId, metierId, indActif) => {
  if (!entrepriseId || !metierId) {
    throw new Error('Entreprise et métier requis.');
  }

  const db = await ensureLocalDatabaseReady();
  if (!(await hasMetiersEntrepriseTable(db))) {
    throw new Error('Catalogue métiers non disponible.');
  }

  const profil = await getLoggedInProfilLocal();
  const value = Number(indActif) === 1 ? 1 : 0;

  if (!isProAccount(profil)) {
    const metierRow = await db.getFirstAsync(
      `
      SELECT m.entreprise_id
      FROM metiers m
      WHERE m.id = ?;
      `,
      [metierId]
    );
    if (metierRow?.entreprise_id) {
      throw new Error('Métier personnalisé non disponible en compte gratuit.');
    }

    if (value === 1) {
      const countRow = await db.getFirstAsync(
        `
        SELECT COUNT(*) AS count
        FROM metiers_entreprise me
        INNER JOIN metiers m ON m.id = me.metier_id
        WHERE me.entreprise_id = ?
          AND me.supprime_le IS NULL
          AND me.ind_actif = 1
          AND (m.entreprise_id IS NULL OR m.entreprise_id = '')
          AND me.metier_id != ?;
        `,
        [entrepriseId, metierId]
      );
      if (Number(countRow?.count) >= FREE_TIER_LIMITS.maxMetiersSelection) {
        throw new Error(
          `Compte gratuit : maximum ${FREE_TIER_LIMITS.maxMetiersSelection} métiers actifs.`
        );
      }
    }
  }

  const timestamp = nowIso();

  await db.runAsync(
    `
    UPDATE metiers_entreprise
    SET ind_actif = ?, mis_a_jour_le = ?, _synced = 0
    WHERE entreprise_id = ? AND metier_id = ? AND supprime_le IS NULL;
    `,
    [value, timestamp, entrepriseId, metierId]
  );

  notifyLocalDataChanged();
};

export const removeMetierEntrepriseLocal = async (entrepriseId, metierId) => {
  if (!entrepriseId || !metierId) {
    throw new Error('Entreprise et métier requis.');
  }

  const db = await ensureLocalDatabaseReady();
  if (!(await hasMetiersEntrepriseTable(db))) {
    throw new Error('Catalogue métiers non disponible.');
  }

  const usageRow = await db.getFirstAsync(
    `
    SELECT COUNT(*) AS count
    FROM ouvrages
    WHERE metier_id = ?
      AND entreprise_id = ?
      AND (supprime_le IS NULL OR supprime_le = '');
    `,
    [metierId, entrepriseId]
  );
  if (Number(usageRow?.count) > 0) {
    throw new Error('Impossible de retirer un métier utilisé par des ouvrages ou articles.');
  }

  const metier = await db.getFirstAsync('SELECT * FROM metiers WHERE id = ?;', [metierId]);
  if (!metier) {
    throw new Error('Métier introuvable.');
  }

  const isCustom = Boolean(metier.entreprise_id);
  const timestamp = nowIso();
  const hasMetierSupprimeLe = await tableHasColumn(db, 'metiers', 'supprime_le');

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
      UPDATE metiers_entreprise
      SET supprime_le = ?, mis_a_jour_le = ?, _synced = 0
      WHERE entreprise_id = ? AND metier_id = ?;
      `,
      [timestamp, timestamp, entrepriseId, metierId]
    );

    if (isCustom && hasMetierSupprimeLe) {
      await db.runAsync(
        `
        UPDATE metiers
        SET supprime_le = ?, mis_a_jour_le = ?, _synced = 0
        WHERE id = ?;
        `,
        [timestamp, timestamp, metierId]
      );
    } else if (isCustom) {
      await db.runAsync('DELETE FROM metiers WHERE id = ?;', [metierId]);
    }
  });

  notifyLocalDataChanged();
};

export const createClientChantierReleveFlowLocal = async ({
  clientNomComplet,
  clientTelephone,
  chantierNom,
  entrepriseId,
}) => {
  const resolvedEntrepriseId = entrepriseId || (await ensureEntrepriseLocale());
  await ensureCatalogueLocal(resolvedEntrepriseId);

  if (!clientNomComplet?.trim() || !clientTelephone?.trim() || !chantierNom?.trim()) {
    throw new Error('Le nom du client, le téléphone et le nom du chantier sont requis.');
  }

  const clientId = await insertClientLocal(
    resolvedEntrepriseId,
    clientNomComplet.trim(),
    clientTelephone.trim()
  );
  const chantierId = await insertChantierLocal(
    clientId,
    null,
    chantierNom.trim()
  );
  const priseParId = await getCurrentProfilIdLocal();
  const releveId = await insertReleveLocal(chantierId, priseParId);

  return { entrepriseId: resolvedEntrepriseId, clientId, chantierId, releveId };
};

/**
 * Crée un nouveau client localement
 */
export const insertClientLocal = async (entrepriseId, nomComplet, telephone1, telephone2 = null) => {
  await assertFreeTierClientLimit(entrepriseId);

  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  const query = `
    INSERT INTO clients (id, entreprise_id, nom_complet, telephone_1, telephone_2, _synced)
    VALUES (?, ?, ?, ?, ?, 0);
  `;
  await db.runAsync(query, [id, entrepriseId, nomComplet, telephone1, telephone2]);
  notifyLocalDataChanged();
  return id;
};

/**
 * Crée un nouveau chantier lié à un client
 */
export const insertChantierLocal = async (
  clientId,
  chefChantierId,
  nom,
  adresse = null,
  responsable = null,
  status = 'D',
  notes = null
) => {
  const db = await ensureLocalDatabaseReady();
  const clientRow = await db.getFirstAsync(
    'SELECT entreprise_id FROM clients WHERE id = ?;',
    [clientId]
  );
  if (clientRow?.entreprise_id) {
    await assertFreeTierChantierLimit(clientRow.entreprise_id);
  }

  const id = uuidv4();

  const query = `
    INSERT INTO chantiers (id, client_id, chef_chantier_id, nom, adresse, responsable, status, notes, _synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);
  `;
  await db.runAsync(query, [id, clientId, chefChantierId, nom, adresse, responsable, status, notes]);
  notifyLocalDataChanged();
  return id;
};

/**
 * Crée un en-tête de relevé pour un chantier
 */
export const insertReleveLocal = async (chantierId, priseParId = null, remise = 0, indTva = null) => {
  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  let resolvedIndTva = indTva;
  if (resolvedIndTva === null || resolvedIndTva === undefined) {
    const entrepriseId = await getFirstEntrepriseIdLocal();
    const entreprise = entrepriseId ? await getEntrepriseByIdLocal(entrepriseId) : null;
    resolvedIndTva = Number(entreprise?.ind_tva) === 1 ? 1 : 0;
  } else {
    resolvedIndTva = Number(resolvedIndTva) === 1 ? 1 : 0;
  }

  const dateFacture = todayFactureDate();
  const remiseValue = Number(remise) || 0;
  const query = `
    INSERT INTO releves (
      id, chantier_id, prise_par_id, date_facture,
      total_ht_facture, tva_facture, total_ttc_facture, remise, ind_tva, status, _synced
    )
    VALUES (?, ?, ?, ?, 0.0, 18.0, 0.0, ?, ?, ?, 0);
  `;
  await db.runAsync(query, [
    id,
    chantierId,
    priseParId,
    dateFacture,
    remiseValue,
    resolvedIndTva,
    RELEVE_STATUS_DEFAULT,
  ]);
  notifyLocalDataChanged();
  return id;
};

export const updateReleveRemiseLocal = async (releveId, remise) => {
  if (!releveId) return;
  const db = await ensureLocalDatabaseReady();
  const remiseValue = Number(remise) || 0;
  await db.runAsync(
    `
    UPDATE releves
    SET remise = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [remiseValue, releveId]
  );
  await refreshReleveTotaux(releveId);
  notifyLocalDataChanged();
};

export const updateReleveIndTvaLocal = async (releveId, indTva) => {
  if (!releveId) return;
  const db = await ensureLocalDatabaseReady();
  const value = Number(indTva) === 1 ? 1 : 0;
  await db.runAsync(
    `
    UPDATE releves
    SET ind_tva = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [value, releveId]
  );
  await refreshReleveTotaux(releveId);
  notifyLocalDataChanged();
};

export const updateReleveStatusLocal = async (releveId, status) => {
  if (!releveId) return;
  const releve = await getReleveByIdLocal(releveId);
  await assertCanModifyReleveLocal(releve);
  const db = await ensureLocalDatabaseReady();
  const value = normalizeReleveStatus(status);
  await db.runAsync(
    `
    UPDATE releves
    SET status = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [value, releveId]
  );
  notifyLocalDataChanged();

  if (releve?.chantier_id) {
    await syncChantierStatusFromRelevesLocal(releve.chantier_id);
  }

  return value;
};

export const syncChantierStatusFromRelevesLocal = async (chantierId) => {
  if (!chantierId) return null;

  const releves = await getRelevesByChantierLocal(chantierId);
  const nextStatus = computeChantierStatusFromReleves(releves);
  if (!nextStatus) return null;

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'chantiers', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const chantier = await db.getFirstAsync(
    `SELECT status FROM chantiers WHERE id = ?${tombstoneFilter};`,
    [chantierId]
  );

  if (!chantier || chantier.status === nextStatus) {
    return chantier?.status || null;
  }

  await db.runAsync(
    `
    UPDATE chantiers
    SET status = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [nextStatus, chantierId]
  );
  notifyLocalDataChanged();
  return nextStatus;
};

export const updateRelevePriseParLocal = async (releveId, priseParId) => {
  if (!releveId) return;
  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE releves
    SET prise_par_id = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [priseParId, releveId]
  );
};

/**
 * Enregistre une ligne de mesure physique ou de quantité directe sur le terrain.
 * Calcule automatiquement le montant avant l'insertion.
 */
const getUniteContextByOuvrageUniteId = async (ouvrageUniteId) => {
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrage_unites', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND ou.supprime_le IS NULL' : '';
  return db.getFirstAsync(
    `
    SELECT u.ind_dimension, u.formule
    FROM ouvrage_unites ou
    JOIN unites u ON u.id = ou.unite_id
    WHERE ou.id = ?${tombstoneFilter};
    `,
    [ouvrageUniteId]
  );
};

export const insertLigneReleveLocal = async (releveId, ouvrageUniteId, cotes) => {
  const releve = await getReleveByIdLocal(releveId);
  await assertCanModifyReleveLocal(releve);

  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  const {
    largeur,
    hauteur,
    profondeur,
    nombre,
    prixUnitaireApplique,
    note = null,
    photo = null,
    indComplete = 0,
  } = cotes;
  const uniteContext = await getUniteContextByOuvrageUniteId(ouvrageUniteId);
  const quantite = computeQuantiteLigneReleve({
    indDimension: uniteContext?.ind_dimension,
    formule: uniteContext?.formule,
    largeur,
    hauteur,
    profondeur,
    nombre,
  });

  const montant = computeMontantLigneReleve({
    prixUnitaireApplique,
    nombre: nombre || 1,
  });

  const query = `
    INSERT INTO ligne_releves (
      id, releve_id, ouvrage_unite_id, largeur, hauteur, profondeur,
      nombre, quantite, prix_unitaire_applique, montant, note, photo, ind_complete, _synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
  `;

  await db.runAsync(query, [
    id,
    releveId,
    ouvrageUniteId,
    largeur || null,
    hauteur || null,
    profondeur || null,
    nombre || 1,
    quantite,
    prixUnitaireApplique,
    montant,
    note?.trim() || null,
    photo || null,
    Number(indComplete) === 1 ? 1 : 0,
  ]);

  // Optionnel mais recommandé : Recalculer les totaux du relevé parent après l'ajout
  await refreshReleveTotaux(releveId);
  notifyLocalDataChanged();

  return id;
};

const resolveLignePrixUnitaire = (ligne) =>
  Number(ligne?.prix_unitaire_applique ?? ligne?.prixUnitaireApplique ?? 0);

const insertLignesForReleveLocal = async (releveId, lignes = []) => {
  for (const ligne of lignes) {
    if (!ligne?.ouvrage_unite_id) continue;
    try {
      const ligneId = await insertLigneReleveLocal(releveId, ligne.ouvrage_unite_id, {
        largeur: ligne.largeur,
        hauteur: ligne.hauteur,
        profondeur: ligne.profondeur,
        nombre: ligne.nombre,
        prixUnitaireApplique: resolveLignePrixUnitaire(ligne),
        note: ligne.note,
        photo: ligne.photo_pending_uri ? null : ligne.photo || null,
        indComplete: Number(ligne.ind_complete) === 1 ? 1 : 0,
      });
      if (ligne.photo_pending_uri) {
        await setLigneRelevePhotoLocal(ligneId, ligne.photo_pending_uri, {
          mimeType: ligne.photo_mime_type,
        });
      }
    } catch (error) {
      console.warn('Ligne non enregistree:', ligne.ouvrage_unite_id, error);
    }
  }
};

export const updateClientLocal = async (clientId, nomComplet, telephone1, telephone2 = null) => {
  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE clients
    SET nom_complet = ?, telephone_1 = ?, telephone_2 = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [nomComplet, telephone1, telephone2, clientId]
  );
  notifyLocalDataChanged();
};

export const updateChantierLocal = async (
  chantierId,
  clientId,
  nom,
  adresse = null,
  status = 'D',
  notes = null
) => {
  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE chantiers
    SET client_id = ?, nom = ?, adresse = ?, status = ?, notes = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [clientId, nom, adresse, status, notes, chantierId]
  );
  notifyLocalDataChanged();
};

export const updateChantierStatusLocal = async (chantierId, status) => {
  if (!(await canCurrentUserModifyChantierLocal(chantierId))) {
    throw new Error(RELEVE_ACCESS_DENIED_ERROR);
  }
  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE chantiers
    SET status = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [status, chantierId]
  );
  notifyLocalDataChanged();
};

export const replaceLignesReleveLocal = async (releveId, lignes = []) => {
  const releve = await getReleveByIdLocal(releveId);
  await assertCanModifyReleveLocal(releve);

  const db = await ensureLocalDatabaseReady();
  const deletedAt = nowIso();
  await db.runAsync(
    `
    UPDATE ligne_releves
    SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE releve_id = ? AND supprime_le IS NULL;
    `,
    [deletedAt, releveId]
  );
  await insertLignesForReleveLocal(releveId, lignes);
  await refreshReleveTotaux(releveId);
  notifyLocalDataChanged();
};

export const updateLigneReleveIndCompleteLocal = async (ligneId, indComplete) => {
  const profil = await getLoggedInProfilLocal();
  if (!isProAccount(profil)) {
    throw new Error('Validation OK par ligne réservée aux comptes Pro.');
  }

  const db = await ensureLocalDatabaseReady();
  const ligneRow = await db.getFirstAsync('SELECT releve_id FROM ligne_releves WHERE id = ?;', [ligneId]);
  const releve = await getReleveByIdLocal(ligneRow?.releve_id);
  await assertCanModifyReleveLocal(releve);
  const value = Number(indComplete) === 1 ? 1 : 0;
  await db.runAsync(
    `
    UPDATE ligne_releves
    SET ind_complete = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [value, ligneId]
  );
  notifyLocalDataChanged();
  return value;
};

/**
 * Fonction interne pour recalculer automatiquement les totaux HT et TTC d'un relevé
 */
export const refreshReleveTotaux = async (releveId) => {
  const db = await ensureLocalDatabaseReady();
  const releve = await getReleveByIdLocal(releveId);
  if (!releve) return;

  const result = await db.getFirstAsync(
    `SELECT SUM(montant) as total_brut FROM ligne_releves WHERE releve_id = ? AND supprime_le IS NULL;`,
    [releveId]
  );

  const facturation = computeReleveFacturation({
    lignesMontantTotal: result?.total_brut || 0.0,
    remise: releve.remise,
    indTva: releve.ind_tva,
    tvaTaux: releve.tva_facture,
  });

  await db.runAsync(
    `UPDATE releves SET total_ht_facture = ?, total_ttc_facture = ?, _synced = 0, mis_a_jour_le = datetime('now') WHERE id = ?;`,
    [facturation.totalHt, facturation.totalTtc, releveId]
  );
};

/**
 * Récupère la liste complète des chantiers avec le nom du client associé
 */
export const getChantiersWithClientLocal = async (entrepriseId = null) => {
  const db = await ensureLocalDatabaseReady();
  const profil = await getLoggedInProfilLocal();
  const filterOwnChantiers = profil && !canSeeAllChantiers(profil);
  const ownChantierFilter = filterOwnChantiers ? ' AND releve_prise.prise_par_id = ?' : '';
  const hasSupprimeLe =
    (await tableHasColumn(db, 'chantiers', 'supprime_le')) &&
    (await tableHasColumn(db, 'clients', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe
    ? ' AND chantiers.supprime_le IS NULL AND clients.supprime_le IS NULL'
    : '';
  const hasReleveSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const releveTombstoneClause = hasReleveSupprimeLe ? 'AND r2.supprime_le IS NULL' : '';
  const releveCountClause = hasReleveSupprimeLe ? ' AND r_count.supprime_le IS NULL' : '';
  const relevePriseJoin = `
    LEFT JOIN (
      SELECT
        r.chantier_id,
        r.cree_le AS prise_le,
        r.prise_par_id
      FROM releves r
      WHERE ${hasReleveSupprimeLe ? 'r.supprime_le IS NULL AND ' : ''}r.id = (
        SELECT r2.id
        FROM releves r2
        WHERE r2.chantier_id = r.chantier_id
        ${releveTombstoneClause}
        ORDER BY r2.cree_le ASC, r2.id ASC
        LIMIT 1
      )
    ) releve_prise ON releve_prise.chantier_id = chantiers.id
    LEFT JOIN profils prise_par ON prise_par.id = releve_prise.prise_par_id
  `;

  const query = entrepriseId
    ? `
    SELECT
      chantiers.*,
      clients.nom_complet as client_nom,
      clients.telephone_1 as client_telephone_1,
      clients.telephone_2 as client_telephone_2,
      releve_prise.prise_le as prise_le,
      releve_prise.prise_par_id as prise_par_id,
      TRIM(COALESCE(prise_par.prenom, '') || ' ' || COALESCE(prise_par.nom, '')) as prise_par_nom,
      (
        SELECT COUNT(*)
        FROM releves r_count
        WHERE r_count.chantier_id = chantiers.id${releveCountClause}
      ) as releve_count
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    ${relevePriseJoin}
    WHERE clients.entreprise_id = ?${tombstoneFilter}${ownChantierFilter}
    ORDER BY releve_prise.prise_le IS NULL ASC, datetime(replace(releve_prise.prise_le, 'T', ' ')) DESC;
  `
    : `
    SELECT
      chantiers.*,
      clients.nom_complet as client_nom,
      clients.telephone_1 as client_telephone_1,
      clients.telephone_2 as client_telephone_2,
      releve_prise.prise_le as prise_le,
      releve_prise.prise_par_id as prise_par_id,
      TRIM(COALESCE(prise_par.prenom, '') || ' ' || COALESCE(prise_par.nom, '')) as prise_par_nom,
      (
        SELECT COUNT(*)
        FROM releves r_count
        WHERE r_count.chantier_id = chantiers.id${releveCountClause}
      ) as releve_count
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    ${relevePriseJoin}
    WHERE 1=1${tombstoneFilter}${ownChantierFilter}
    ORDER BY releve_prise.prise_le IS NULL ASC, datetime(replace(releve_prise.prise_le, 'T', ' ')) DESC;
  `;

  if (entrepriseId) {
    const params = filterOwnChantiers ? [entrepriseId, profil.id] : [entrepriseId];
    return db.getAllAsync(query, params);
  }
  return filterOwnChantiers ? db.getAllAsync(query, [profil.id]) : db.getAllAsync(query);
};

/**
 * Données agrégées pour le dashboard Rapports (statut, date de création, montant HT).
 */
export const getChantiersReportRowsLocal = async (entrepriseId) => {
  if (!entrepriseId) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe =
    (await tableHasColumn(db, 'chantiers', 'supprime_le')) &&
    (await tableHasColumn(db, 'clients', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe
    ? ' AND chantiers.supprime_le IS NULL AND clients.supprime_le IS NULL'
    : '';

  const hasReleveSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const releveJoinFilter = hasReleveSupprimeLe ? ' AND r.supprime_le IS NULL' : '';

  const hasLigneSupprimeLe = await tableHasColumn(db, 'ligne_releves', 'supprime_le');
  const ligneJoinFilter = hasLigneSupprimeLe ? ' AND lr.supprime_le IS NULL' : '';

  return db.getAllAsync(
    `
    SELECT
      chantiers.id,
      chantiers.status,
      chantiers.cree_le,
      COALESCE(SUM(lr.montant), 0) AS montant_total_ht
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    LEFT JOIN releves r ON r.chantier_id = chantiers.id${releveJoinFilter}
    LEFT JOIN ligne_releves lr ON lr.releve_id = r.id${ligneJoinFilter}
    WHERE clients.entreprise_id = ?${tombstoneFilter}
      AND chantiers.status != 'Z'
    GROUP BY chantiers.id
    ORDER BY chantiers.cree_le DESC;
    `,
    [entrepriseId]
  );
};

export const getChantierWithClientByIdLocal = async (chantierId) => {
  if (!chantierId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe =
    (await tableHasColumn(db, 'chantiers', 'supprime_le')) &&
    (await tableHasColumn(db, 'clients', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe
    ? ' AND chantiers.supprime_le IS NULL AND clients.supprime_le IS NULL'
    : '';

  return db.getFirstAsync(
    `
    SELECT
      chantiers.*,
      clients.nom_complet AS client_nom,
      clients.telephone_1 AS client_telephone_1,
      clients.telephone_2 AS client_telephone_2
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    WHERE chantiers.id = ?${tombstoneFilter};
    `,
    [chantierId]
  );
};

/**
 * Filtre les ouvrages d'un métier spécifique pour l'entreprise connectée
 */
export const getOuvragesByMetierAndEntreprise = async (metierId, entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasIndArticle = await tableHasColumn(db, 'ouvrages', 'ind_article');
  const hasIndActif = await tableHasColumn(db, 'ouvrages', 'ind_actif');
  const hasOrdre = await tableHasColumn(db, 'ouvrages', 'ordre');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const articleFilter = hasIndArticle ? ' AND (ind_article = 0 OR ind_article IS NULL)' : '';
  const actifFilter = ouvrageActifFilterSql(hasIndActif);
  const orderBy = ouvrageOrderBySql(hasOrdre);
  const query = `SELECT * FROM ouvrages WHERE metier_id = ? AND entreprise_id = ?${articleFilter}${actifFilter}${tombstoneFilter}${orderBy};`;
  return await db.getAllAsync(query, [metierId, entrepriseId]);
};

/**
 * Récupère les unités et prix disponibles pour un ouvrage donné
 */
export const getUnitesEtPrixParOuvrage = async (ouvrageId) => {
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrage_unites', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND ou.supprime_le IS NULL' : '';
  const query = `
    SELECT
      ou.id as ouvrage_unite_id,
      ou.ouvrage_id,
      ou.unite_id,
      u.formule,
      u.nom,
      u.nom_unite,
      u.ind_dimension,
      ou.prix_unitaire
    FROM ouvrage_unites ou
    JOIN unites u ON ou.unite_id = u.id
    WHERE ou.ouvrage_id = ?${tombstoneFilter}
    ORDER BY u.nom ASC;
  `;
  return await db.getAllAsync(query, [ouvrageId]);
};

/**
 * Articles = ouvrages avec ind_article = 1.
 */
export const getArticlesByMetierAndEntreprise = async (metierId, entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasIndArticle = await tableHasColumn(db, 'ouvrages', 'ind_article');
  const hasFournisseurId = await tableHasColumn(db, 'ouvrages', 'fournisseur_id');
  const hasIndActif = await tableHasColumn(db, 'ouvrages', 'ind_actif');
  const hasOrdre = await tableHasColumn(db, 'ouvrages', 'ordre');
  if (!hasIndArticle) return [];
  const tombstoneFilter = hasSupprimeLe ? ' AND o.supprime_le IS NULL' : '';
  const actifFilter = ouvrageActifFilterSql(hasIndActif, 'o');
  const orderBy = ouvrageOrderBySql(hasOrdre, 'o');
  const fournisseurJoin = hasFournisseurId
    ? `LEFT JOIN fournisseurs f ON f.id = o.fournisseur_id`
    : '';
  const fournisseurSelect = hasFournisseurId ? ', f.nom AS fournisseur_nom' : '';
  const query = `
    SELECT o.*${fournisseurSelect}
    FROM ouvrages o
    ${fournisseurJoin}
    WHERE o.metier_id = ? AND o.entreprise_id = ? AND o.ind_article = 1${actifFilter}${tombstoneFilter}${orderBy};
  `;
  return db.getAllAsync(query, [metierId, entrepriseId]);
};

export const searchFournisseursLocal = async (metierId, entrepriseId, query) => {
  if (!metierId || !entrepriseId || !query?.trim()) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'fournisseurs', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const term = `%${query.trim()}%`;

  return db.getAllAsync(
    `
    SELECT id, nom, telephone_1, telephone_2
    FROM fournisseurs
    WHERE metier_id = ?
      AND entreprise_id = ?${tombstoneFilter}
      AND (nom LIKE ? OR telephone_1 LIKE ? OR IFNULL(telephone_2, '') LIKE ?)
    ORDER BY nom ASC
    LIMIT 20;
    `,
    [metierId, entrepriseId, term, term, term]
  );
};

export const insertFournisseurLocal = async ({
  metierId,
  entrepriseId,
  nom,
  telephone1,
  telephone2 = null,
}) => {
  const trimmedNom = String(nom || '').trim();
  const trimmedTelephone1 = String(telephone1 || '').trim();
  if (!metierId || !entrepriseId || !trimmedNom) {
    throw new Error('Métier, entreprise et nom fournisseur sont requis.');
  }

  const telephone1Value = trimmedTelephone1 || null;
  const telephone1ForDb = telephone1Value ?? '';

  const db = await ensureLocalDatabaseReady();
  const fournisseurId = uuidv4();
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO fournisseurs (id, metier_id, entreprise_id, nom, telephone_1, telephone_2, cree_le, mis_a_jour_le, _synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [fournisseurId, metierId, entrepriseId, trimmedNom, telephone1ForDb, telephone2, timestamp, timestamp]
  );
  notifyLocalDataChanged();

  return {
    id: fournisseurId,
    metier_id: metierId,
    entreprise_id: entrepriseId,
    nom: trimmedNom,
    telephone_1: telephone1Value,
    telephone_2: telephone2,
  };
};

export const insertArticleWithUniteLocal = async ({
  metierId,
  entrepriseId,
  nom,
  uniteId,
  prixUnitaire,
  fournisseurId = null,
  fournisseurNom = null,
  fournisseurTelephone = null,
  photo = null,
}) => {
  let resolvedFournisseurId = fournisseurId || null;

  if (!resolvedFournisseurId) {
    const trimmedFournisseurNom = String(fournisseurNom || '').trim();
    if (trimmedFournisseurNom) {
      const trimmedTelephone = String(fournisseurTelephone || '').trim() || null;
      const fournisseur = await insertFournisseurLocal({
        metierId,
        entrepriseId,
        nom: trimmedFournisseurNom,
        telephone1: trimmedTelephone,
      });
      resolvedFournisseurId = fournisseur.id;
    }
  } else {
    const db = await ensureLocalDatabaseReady();
    const hasSupprimeLe = await tableHasColumn(db, 'fournisseurs', 'supprime_le');
    const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
    const fournisseur = await db.getFirstAsync(
      `SELECT id FROM fournisseurs WHERE id = ? AND metier_id = ? AND entreprise_id = ?${tombstoneFilter};`,
      [resolvedFournisseurId, metierId, entrepriseId]
    );
    if (!fournisseur) {
      throw new Error('Fournisseur introuvable.');
    }
  }

  return insertOuvrageWithUniteLocal({
    metierId,
    entrepriseId,
    nom,
    uniteId,
    prixUnitaire,
    indArticle: 1,
    fournisseurId: resolvedFournisseurId,
    photo,
  });
};

export const getAllUnitesLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  return db.getAllAsync('SELECT * FROM unites ORDER BY nom ASC;');
};

export const isLoggedInAdminLocal = async () => {
  const profil = await getLoggedInProfilLocal();
  return profil?.role === 'A';
};

export const insertOuvrageWithUniteLocal = async ({
  metierId,
  entrepriseId,
  nom,
  uniteId,
  prixUnitaire,
  indArticle = 0,
  fournisseurId = null,
  photo = null,
}) => {
  const trimmedNom = String(nom || '').trim();
  if (!metierId || !entrepriseId || !trimmedNom || !uniteId) {
    throw new Error('Métier, entreprise, nom et unité sont requis.');
  }

  const prix = Number(prixUnitaire);
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error('Prix unitaire invalide.');
  }

  const isArticle = Number(indArticle) === 1;
  if (!isArticle) {
    await assertFreeTierOuvrageLimit(entrepriseId, metierId);
  }

  const db = await ensureLocalDatabaseReady();
  const ouvrageId = uuidv4();
  const ouvrageUniteId = uuidv4();
  const timestamp = nowIso();
  const hasIndArticle = await tableHasColumn(db, 'ouvrages', 'ind_article');
  const hasIndActif = await tableHasColumn(db, 'ouvrages', 'ind_actif');
  const hasOrdre = await tableHasColumn(db, 'ouvrages', 'ordre');

  const maxOrdreRow = hasOrdre
    ? await db.getFirstAsync(
        `SELECT MAX(ordre) AS max_ordre FROM ouvrages
         WHERE metier_id = ? AND entreprise_id = ? AND (supprime_le IS NULL OR supprime_le = '');`,
        [metierId, entrepriseId]
      )
    : null;
  const ordre = Number(maxOrdreRow?.max_ordre ?? -1) + 1;

  if (hasIndArticle) {
    const indActifCols = hasIndActif ? ', ind_actif' : '';
    const indActifVals = hasIndActif ? ', 1' : '';
    const ordreCols = hasOrdre ? ', ordre' : '';
    const ordreVals = hasOrdre ? ', ?' : '';
    await db.runAsync(
      `INSERT INTO ouvrages (
        id, metier_id, entreprise_id, nom, ind_article, fournisseur_id, photo${indActifCols}${ordreCols},
        cree_le, mis_a_jour_le, _synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?${indActifVals}${ordreVals}, ?, ?, 0);`,
      [
        ouvrageId,
        metierId,
        entrepriseId,
        trimmedNom,
        isArticle ? 1 : 0,
        isArticle ? fournisseurId : null,
        photo || null,
        ...(hasOrdre ? [ordre] : []),
        timestamp,
        timestamp,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO ouvrages (id, metier_id, entreprise_id, nom, cree_le, mis_a_jour_le, _synced)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      [ouvrageId, metierId, entrepriseId, trimmedNom, timestamp, timestamp]
    );
  }

  await db.runAsync(
    `INSERT INTO ouvrage_unites (id, ouvrage_id, unite_id, prix_unitaire, cree_le, mis_a_jour_le, _synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [ouvrageUniteId, ouvrageId, uniteId, prix, timestamp, timestamp]
  );

  notifyLocalDataChanged();

  const unites = await getUnitesEtPrixParOuvrage(ouvrageId);
  const ouvrageUnite =
    unites.find((row) => row.ouvrage_unite_id === ouvrageUniteId) || unites[0] || null;

  let fournisseurNom = null;
  if (isArticle && fournisseurId) {
    const fournisseurRow = await db.getFirstAsync(
      'SELECT nom FROM fournisseurs WHERE id = ?;',
      [fournisseurId]
    );
    fournisseurNom = fournisseurRow?.nom || null;
  }

  return {
    ouvrage: {
      id: ouvrageId,
      metier_id: metierId,
      entreprise_id: entrepriseId,
      nom: trimmedNom,
      ind_article: isArticle ? 1 : 0,
      fournisseur_id: isArticle ? fournisseurId : null,
      fournisseur_nom: fournisseurNom,
      photo: photo || null,
    },
    ouvrageUnite,
  };
};

export const insertUniteForOuvrageLocal = async ({ ouvrageId, uniteId, prixUnitaire }) => {
  if (!ouvrageId || !uniteId) {
    throw new Error('Ouvrage et unité sont requis.');
  }

  const prix = Number(prixUnitaire);
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error('Prix unitaire invalide.');
  }

  const existing = await getOuvrageByIdLocal(ouvrageId);
  if (!existing) {
    throw new Error('Ouvrage introuvable.');
  }

  const currentUnites = await getUnitesEtPrixParOuvrage(ouvrageId);
  if (currentUnites.some((row) => row.unite_id === uniteId)) {
    throw new Error('Cette unité existe déjà pour cet ouvrage.');
  }

  const db = await ensureLocalDatabaseReady();
  const ouvrageUniteId = uuidv4();
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO ouvrage_unites (id, ouvrage_id, unite_id, prix_unitaire, cree_le, mis_a_jour_le, _synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [ouvrageUniteId, ouvrageId, uniteId, prix, timestamp, timestamp]
  );

  notifyLocalDataChanged();

  const unites = await getUnitesEtPrixParOuvrage(ouvrageId);
  const ouvrageUnite =
    unites.find((row) => row.ouvrage_unite_id === ouvrageUniteId) || null;

  return {
    ouvrage: existing,
    ouvrageUnite,
  };
};

export const getOuvrageUniteContextLocal = async (ouvrageUniteId) => {
  if (!ouvrageUniteId) return null;

  const db = await ensureLocalDatabaseReady();
  const hasOuvrageUniteSupprimeLe = await tableHasColumn(db, 'ouvrage_unites', 'supprime_le');
  const hasOuvrageSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasFournisseurId = await tableHasColumn(db, 'ouvrages', 'fournisseur_id');
  const ouTombstoneFilter = hasOuvrageUniteSupprimeLe ? ' AND ou.supprime_le IS NULL' : '';
  const oTombstoneFilter = hasOuvrageSupprimeLe ? ' AND o.supprime_le IS NULL' : '';
  const fournisseurJoin = hasFournisseurId
    ? 'LEFT JOIN fournisseurs f ON f.id = o.fournisseur_id'
    : '';
  const fournisseurSelect = hasFournisseurId ? ', f.nom AS fournisseur_nom' : '';
  const row = await db.getFirstAsync(
    `
    SELECT
      ou.id AS ouvrage_unite_id,
      ou.ouvrage_id,
      ou.prix_unitaire,
      u.formule,
      u.nom,
      u.nom_unite,
      u.ind_dimension,
      o.nom AS ouvrage_nom,
      o.metier_id,
      o.ind_article,
      o.fournisseur_id${fournisseurSelect},
      m.id AS metier_id,
      m.nom AS metier_nom,
      m.abbrev AS metier_abbrev,
      m.icon AS metier_icon
    FROM ouvrage_unites ou
    JOIN unites u ON u.id = ou.unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    ${fournisseurJoin}
    JOIN metiers m ON m.id = o.metier_id
    WHERE ou.id = ?${ouTombstoneFilter}${oTombstoneFilter};
    `,
    [ouvrageUniteId]
  );

  if (!row) return null;

  return {
    metier: {
      id: row.metier_id,
      nom: row.metier_nom,
      abbrev: row.metier_abbrev,
      icon: row.metier_icon,
    },
    ouvrage: {
      id: row.ouvrage_id,
      nom: row.ouvrage_nom,
      metier_id: row.metier_id,
      ind_article: row.ind_article,
      fournisseur_id: row.fournisseur_id ?? null,
      fournisseur_nom: row.fournisseur_nom ?? null,
    },
    ouvrageUnite: {
      ouvrage_unite_id: row.ouvrage_unite_id,
      ouvrage_id: row.ouvrage_id,
      formule: row.formule,
      nom: row.nom,
      nom_unite: row.nom_unite,
      ind_dimension: row.ind_dimension,
      prix_unitaire: row.prix_unitaire,
    },
  };
};

export const getLignesByReleveIdLocal = async (releveId) => {
  if (!releveId) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ligne_releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND lr.supprime_le IS NULL' : '';

  const query = `
    SELECT
      lr.id,
      lr.releve_id,
      lr.ouvrage_unite_id,
      lr.largeur,
      lr.hauteur,
      lr.profondeur,
      lr.nombre,
      lr.quantite,
      lr.prix_unitaire_applique,
      lr.montant,
      lr.note,
      lr.photo,
      lr.ind_complete,
      r.date_facture as releve_date_facture,
      r.cree_le as releve_cree_le,
      o.nom as ouvrage_nom,
      m.id as metier_id,
      m.nom as metier_nom,
      u.nom_unite,
      u.formule,
      u.ind_dimension
    FROM ligne_releves lr
    JOIN releves r ON r.id = lr.releve_id
    JOIN ouvrage_unites ou ON ou.id = lr.ouvrage_unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    JOIN metiers m ON m.id = o.metier_id
    JOIN unites u ON u.id = ou.unite_id
    WHERE lr.releve_id = ?${tombstoneFilter}
    ORDER BY lr.cree_le ASC, lr.id ASC;
  `;
  return db.getAllAsync(query, [releveId]);
};

export const getLignesByChantierLocal = async (chantierId) => {
  if (!chantierId) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe =
    (await tableHasColumn(db, 'ligne_releves', 'supprime_le')) &&
    (await tableHasColumn(db, 'releves', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe ? ' AND lr.supprime_le IS NULL AND r.supprime_le IS NULL' : '';

  const query = `
    SELECT
      lr.id,
      lr.releve_id,
      lr.ouvrage_unite_id,
      lr.largeur,
      lr.hauteur,
      lr.profondeur,
      lr.nombre,
      lr.quantite,
      lr.prix_unitaire_applique,
      lr.montant,
      lr.note,
      lr.photo,
      lr.ind_complete,
      r.date_facture as releve_date_facture,
      r.cree_le as releve_cree_le,
      o.nom as ouvrage_nom,
      m.id as metier_id,
      m.nom as metier_nom,
      u.nom_unite,
      u.formule,
      u.ind_dimension
    FROM ligne_releves lr
    JOIN releves r ON r.id = lr.releve_id
    JOIN ouvrage_unites ou ON ou.id = lr.ouvrage_unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    JOIN metiers m ON m.id = o.metier_id
    JOIN unites u ON u.id = ou.unite_id
    WHERE r.chantier_id = ?${tombstoneFilter}
    ORDER BY r.cree_le ASC, lr.cree_le ASC, lr.id ASC;
  `;
  return db.getAllAsync(query, [chantierId]);
};

export const getRelevesByChantierLocal = async (chantierId) => {
  if (!chantierId) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND r.supprime_le IS NULL' : '';

  return db.getAllAsync(
    `
    SELECT
      r.*,
      TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) AS prise_par_nom
    FROM releves r
    LEFT JOIN profils p ON p.id = r.prise_par_id
    WHERE r.chantier_id = ?${tombstoneFilter}
    ORDER BY r.cree_le DESC, r.id DESC;
    `,
    [chantierId]
  );
};

export const getLatestReleveByChantierLocal = async (chantierId) => {
  if (!chantierId) return null;

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';

  return db.getFirstAsync(
    `SELECT * FROM releves WHERE chantier_id = ?${tombstoneFilter} ORDER BY cree_le DESC LIMIT 1;`,
    [chantierId]
  );
};

export const getReleveIdByChantierLocal = async (chantierId) => {
  const releve = await getReleveByChantierLocal(chantierId);
  return releve?.id || null;
};

export const getReleveByChantierLocal = async (chantierId) => {
  if (!chantierId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  return db.getFirstAsync(
    `SELECT * FROM releves WHERE chantier_id = ?${tombstoneFilter} ORDER BY cree_le ASC LIMIT 1;`,
    [chantierId]
  );
};

export const getReleveByIdLocal = async (releveId) => {
  if (!releveId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  return db.getFirstAsync(
    `
    SELECT
      r.*,
      TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) AS prise_par_nom
    FROM releves r
    LEFT JOIN profils p ON p.id = r.prise_par_id
    WHERE r.id = ?${tombstoneFilter};
    `,
    [releveId]
  );
};

export const deleteChantierLocal = async (chantierId) => {
  if (!chantierId) return;
  if (!(await canCurrentUserModifyChantierLocal(chantierId))) {
    throw new Error(RELEVE_ACCESS_DENIED_ERROR);
  }
  const deletedAt = nowIso();

  await runWithLocalDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE ligne_releves
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE releve_id IN (SELECT id FROM releves WHERE chantier_id = ?);
        `,
        [deletedAt, chantierId]
      );
      await db.runAsync(
        `
        UPDATE releves
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE chantier_id = ?;
        `,
        [deletedAt, chantierId]
      );
      await db.runAsync(
        `
        UPDATE chantiers
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE id = ?;
        `,
        [deletedAt, chantierId]
      );
    });
  });

  notifyLocalDataChanged();
};

export const deleteReleveLocal = async (releveId) => {
  if (!releveId) return;
  const releve = await getReleveByIdLocal(releveId);
  await assertCanModifyReleveLocal(releve);
  const deletedAt = nowIso();

  await runWithLocalDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE ligne_releves
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE releve_id = ?;
        `,
        [deletedAt, releveId]
      );
      await db.runAsync(
        `
        UPDATE releves
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE id = ?;
        `,
        [deletedAt, releveId]
      );
    });
  });

  notifyLocalDataChanged();
};

export const getEntrepriseByIdLocal = async (entrepriseId) => {
  if (!entrepriseId) return null;
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(`SELECT * FROM entreprises WHERE id = ?;`, [entrepriseId]);
};

export const updateEntrepriseAdminLocal = async (entrepriseId, { nom, ind_tva }) => {
  if (!(await isLoggedInAdminLocal())) {
    throw new Error("Seul un administrateur peut modifier l'entreprise.");
  }

  const trimmedNom = nom?.trim();
  if (!entrepriseId || !trimmedNom) {
    throw new Error("Nom de l'entreprise requis.");
  }

  const profil = await getLoggedInProfilLocal();
  const tvaValue =
    isProAccount(profil) && Number(ind_tva) === 1 ? 1 : 0;
  const db = await ensureLocalDatabaseReady();
  await db.runAsync(
    `
    UPDATE entreprises
    SET nom = ?, ind_tva = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [trimmedNom, tvaValue, entrepriseId]
  );
  notifyLocalDataChanged();
};

const assertChantierPhotoSlot = (slot) => {
  if (!CHANTIER_PHOTO_SLOTS.includes(slot)) {
    throw new Error('Emplacement photo chantier invalide.');
  }
};

export const setEntrepriseLogoLocal = async (entrepriseId, sourceUri, { mimeType } = {}) => {
  if (!entrepriseId) throw new Error('Entreprise requise.');
  const storageKey = await persistTerrainImage({
    sourceUri,
    storageKey: buildEntrepriseLogoKey(entrepriseId),
    mimeType,
  });
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync('SELECT logo FROM entreprises WHERE id = ?;', [entrepriseId]);
  await db.runAsync(
    `
    UPDATE entreprises
    SET logo = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [storageKey, entrepriseId]
  );
  if (previous?.logo && previous.logo !== storageKey) {
    await deleteImageFileLocal(previous.logo);
  }
  notifyLocalDataChanged();
  return storageKey;
};

const getChantierImageContextLocal = async (chantierId) => {
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(
    `
    SELECT chantiers.id AS chantier_id, clients.entreprise_id
    FROM chantiers
    JOIN clients ON clients.id = chantiers.client_id
    WHERE chantiers.id = ?;
    `,
    [chantierId]
  );
};

const getLigneImageContextLocal = async (ligneId) => {
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(
    `
    SELECT
      ligne_releves.id AS ligne_id,
      chantiers.id AS chantier_id,
      clients.entreprise_id
    FROM ligne_releves
    JOIN releves ON releves.id = ligne_releves.releve_id
    JOIN chantiers ON chantiers.id = releves.chantier_id
    JOIN clients ON clients.id = chantiers.client_id
    WHERE ligne_releves.id = ?;
    `,
    [ligneId]
  );
};

export const setChantierPhotoLocal = async (chantierId, slot, sourceUri, { mimeType } = {}) => {
  assertChantierPhotoSlot(slot);
  if (!chantierId) throw new Error('Chantier requis.');

  const context = await getChantierImageContextLocal(chantierId);
  if (!context?.entreprise_id) {
    throw new Error('Entreprise introuvable pour ce chantier.');
  }

  const storageKey = await persistTerrainImage({
    sourceUri,
    storageKey: buildChantierPhotoKey(context.entreprise_id, chantierId, slot),
    mimeType,
  });
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync(`SELECT ${slot} AS current_photo FROM chantiers WHERE id = ?;`, [
    chantierId,
  ]);
  await db.runAsync(
    `
    UPDATE chantiers
    SET ${slot} = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [storageKey, chantierId]
  );
  if (previous?.current_photo && previous.current_photo !== storageKey) {
    await deleteImageFileLocal(previous.current_photo);
  }
  notifyLocalDataChanged();
  return storageKey;
};

export const setLigneRelevePhotoLocal = async (ligneId, sourceUri, { mimeType } = {}) => {
  if (!ligneId) throw new Error('Ligne relevé requise.');

  const context = await getLigneImageContextLocal(ligneId);
  if (!context?.entreprise_id || !context?.chantier_id) {
    throw new Error('Chantier ou entreprise introuvable pour cette ligne.');
  }

  const storageKey = await persistTerrainImage({
    sourceUri,
    storageKey: buildLignePhotoKey(context.entreprise_id, context.chantier_id, ligneId),
    mimeType,
  });
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync('SELECT photo FROM ligne_releves WHERE id = ?;', [ligneId]);
  await db.runAsync(
    `
    UPDATE ligne_releves
    SET photo = ?, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [storageKey, ligneId]
  );
  if (previous?.photo && previous.photo !== storageKey) {
    await deleteImageFileLocal(previous.photo);
  }
  notifyLocalDataChanged();
  return storageKey;
};

export const clearEntrepriseLogoLocal = async (entrepriseId) => {
  if (!entrepriseId) return;
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync('SELECT logo FROM entreprises WHERE id = ?;', [entrepriseId]);
  await db.runAsync(
    `
    UPDATE entreprises
    SET logo = NULL, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [entrepriseId]
  );
  if (previous?.logo) {
    await deleteImageFileLocal(previous.logo);
  }
  notifyLocalDataChanged();
};

export const clearChantierPhotoLocal = async (chantierId, slot) => {
  assertChantierPhotoSlot(slot);
  if (!chantierId) return;
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync(`SELECT ${slot} AS current_photo FROM chantiers WHERE id = ?;`, [
    chantierId,
  ]);
  await db.runAsync(
    `
    UPDATE chantiers
    SET ${slot} = NULL, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [chantierId]
  );
  if (previous?.current_photo) {
    await deleteImageFileLocal(previous.current_photo);
  }
  notifyLocalDataChanged();
};

export const clearLigneRelevePhotoLocal = async (ligneId) => {
  if (!ligneId) return;
  const db = await ensureLocalDatabaseReady();
  const previous = await db.getFirstAsync('SELECT photo FROM ligne_releves WHERE id = ?;', [ligneId]);
  await db.runAsync(
    `
    UPDATE ligne_releves
    SET photo = NULL, _synced = 0, mis_a_jour_le = datetime('now')
    WHERE id = ?;
    `,
    [ligneId]
  );
  if (previous?.photo) {
    await deleteImageFileLocal(previous.photo);
  }
  notifyLocalDataChanged();
};

const applyChantierPendingPhotosLocal = async (chantierId, chantierPhotoUris = {}) => {
  for (const slot of CHANTIER_PHOTO_SLOTS) {
    const pending = chantierPhotoUris[slot];
    if (pending?.uri) {
      await setChantierPhotoLocal(chantierId, slot, pending.uri, { mimeType: pending.mimeType });
    } else if (pending === null) {
      await clearChantierPhotoLocal(chantierId, slot);
    }
  }
};

export const getOuvragesByEntrepriseLocal = async (entrepriseId) => {
  if (!entrepriseId) return [];
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasIndArticle = await tableHasColumn(db, 'ouvrages', 'ind_article');
  const hasFournisseurId = await tableHasColumn(db, 'ouvrages', 'fournisseur_id');
  const hasIndActif = await tableHasColumn(db, 'ouvrages', 'ind_actif');
  const hasOrdre = await tableHasColumn(db, 'ouvrages', 'ordre');
  const tombstoneFilter = hasSupprimeLe ? ' AND o.supprime_le IS NULL' : '';
  const indArticleSelect = hasIndArticle ? ', o.ind_article' : ', 0 AS ind_article';
  const indActifSelect = hasIndActif ? ', o.ind_actif' : ', 1 AS ind_actif';
  const ordreSelect = hasOrdre ? ', o.ordre' : ', 0 AS ordre';
  const fournisseurJoin = hasFournisseurId ? 'LEFT JOIN fournisseurs f ON f.id = o.fournisseur_id' : '';
  const fournisseurSelect = hasFournisseurId ? ', o.fournisseur_id, f.nom AS fournisseur_nom' : '';
  const orderBy = hasOrdre
    ? ' ORDER BY m.nom ASC, o.metier_id ASC, o.ordre ASC, o.ind_article ASC, o.nom ASC'
    : ' ORDER BY m.nom ASC, o.ind_article ASC, o.nom ASC';
  return db.getAllAsync(
    `
    SELECT
      o.id,
      o.nom,
      o.metier_id,
      o.entreprise_id${indArticleSelect}${indActifSelect}${ordreSelect}${fournisseurSelect},
      o.cree_le,
      o.mis_a_jour_le,
      m.nom AS metier_nom
    FROM ouvrages o
    JOIN metiers m ON m.id = o.metier_id
    ${fournisseurJoin}
    WHERE o.entreprise_id = ?${tombstoneFilter}${orderBy};
    `,
    [entrepriseId]
  );
};

export const saveOuvragesOrderLocal = async (entrepriseId, metierId, ouvrageIds = []) => {
  if (!entrepriseId || !metierId) {
    throw new Error('Entreprise et métier requis.');
  }

  const db = await ensureLocalDatabaseReady();
  const hasOrdre = await tableHasColumn(db, 'ouvrages', 'ordre');
  if (!hasOrdre) {
    throw new Error('Ordre ouvrages non disponible.');
  }

  const ids = (ouvrageIds || []).filter(Boolean);
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < ids.length; index += 1) {
      await db.runAsync(
        `
        UPDATE ouvrages
        SET ordre = ?, mis_a_jour_le = ?, _synced = 0
        WHERE id = ?
          AND entreprise_id = ?
          AND metier_id = ?
          AND (supprime_le IS NULL OR supprime_le = '');
        `,
        [index, timestamp, ids[index], entrepriseId, metierId]
      );
    }
  });

  notifyLocalDataChanged();
};

export const setOuvrageActifLocal = async (ouvrageId, indActif) => {
  if (!ouvrageId) {
    throw new Error('Ouvrage requis.');
  }

  const db = await ensureLocalDatabaseReady();
  const hasIndActif = await tableHasColumn(db, 'ouvrages', 'ind_actif');
  if (!hasIndActif) {
    throw new Error('Activation ouvrage non disponible.');
  }

  const value = Number(indActif) === 1 ? 1 : 0;
  const timestamp = nowIso();

  await db.runAsync(
    `
    UPDATE ouvrages
    SET ind_actif = ?, mis_a_jour_le = ?, _synced = 0
    WHERE id = ?;
    `,
    [value, timestamp, ouvrageId]
  );

  notifyLocalDataChanged();
};

export const getOuvrageByIdLocal = async (ouvrageId) => {
  if (!ouvrageId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasFournisseurId = await tableHasColumn(db, 'ouvrages', 'fournisseur_id');
  const tombstoneFilter = hasSupprimeLe ? ' AND o.supprime_le IS NULL' : '';
  const fournisseurJoin = hasFournisseurId ? 'LEFT JOIN fournisseurs f ON f.id = o.fournisseur_id' : '';
  const fournisseurSelect = hasFournisseurId ? ', f.nom AS fournisseur_nom' : '';
  return db.getFirstAsync(
    `
    SELECT o.*, m.nom AS metier_nom${fournisseurSelect}
    FROM ouvrages o
    JOIN metiers m ON m.id = o.metier_id
    ${fournisseurJoin}
    WHERE o.id = ?${tombstoneFilter};
    `,
    [ouvrageId]
  );
};

const resolveArticleFournisseurIdLocal = async ({
  metierId,
  entrepriseId,
  fournisseurId = null,
  fournisseurNom = null,
}) => {
  if (fournisseurId) {
    const db = await ensureLocalDatabaseReady();
    const hasSupprimeLe = await tableHasColumn(db, 'fournisseurs', 'supprime_le');
    const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
    const fournisseur = await db.getFirstAsync(
      `SELECT id FROM fournisseurs WHERE id = ? AND metier_id = ? AND entreprise_id = ?${tombstoneFilter};`,
      [fournisseurId, metierId, entrepriseId]
    );
    if (!fournisseur) {
      throw new Error('Fournisseur introuvable.');
    }
    return fournisseurId;
  }

  const trimmedFournisseurNom = String(fournisseurNom || '').trim();
  if (!trimmedFournisseurNom) return null;

  const fournisseur = await insertFournisseurLocal({
    metierId,
    entrepriseId,
    nom: trimmedFournisseurNom,
    telephone1: null,
  });
  return fournisseur.id;
};

export const updateOuvrageLocal = async ({
  ouvrageId,
  nom,
  unites = [],
  fournisseurId = undefined,
  fournisseurNom = undefined,
}) => {
  const trimmedNom = String(nom || '').trim();
  if (!ouvrageId || !trimmedNom) {
    throw new Error('Ouvrage et nom sont requis.');
  }

  const existing = await getOuvrageByIdLocal(ouvrageId);
  if (!existing) {
    throw new Error('Ouvrage introuvable.');
  }

  const db = await ensureLocalDatabaseReady();
  const timestamp = nowIso();
  const isArticle = Number(existing.ind_article) === 1;
  const hasFournisseurId = await tableHasColumn(db, 'ouvrages', 'fournisseur_id');

  let resolvedFournisseurId = existing.fournisseur_id ?? null;
  if (isArticle && hasFournisseurId && (fournisseurId !== undefined || fournisseurNom !== undefined)) {
    if (!fournisseurId && !String(fournisseurNom || '').trim()) {
      resolvedFournisseurId = null;
    } else {
      resolvedFournisseurId = await resolveArticleFournisseurIdLocal({
        metierId: existing.metier_id,
        entrepriseId: existing.entreprise_id,
        fournisseurId: fournisseurId ?? null,
        fournisseurNom,
      });
    }
  }

  if (isArticle && hasFournisseurId) {
    await db.runAsync(
      `
      UPDATE ouvrages
      SET nom = ?, fournisseur_id = ?, _synced = 0, mis_a_jour_le = ?
      WHERE id = ?;
      `,
      [trimmedNom, resolvedFournisseurId, timestamp, ouvrageId]
    );
  } else {
    await db.runAsync(
      `
      UPDATE ouvrages
      SET nom = ?, _synced = 0, mis_a_jour_le = ?
      WHERE id = ?;
      `,
      [trimmedNom, timestamp, ouvrageId]
    );
  }

  for (const unite of unites) {
    if (!unite?.ouvrageUniteId) continue;
    if (!unite?.uniteId) {
      throw new Error('Unité requise.');
    }
    const prix = Number(unite.prixUnitaire);
    if (!Number.isFinite(prix) || prix < 0) {
      throw new Error('Prix unitaire invalide.');
    }
    await db.runAsync(
      `
      UPDATE ouvrage_unites
      SET unite_id = ?, prix_unitaire = ?, _synced = 0, mis_a_jour_le = ?
      WHERE id = ? AND ouvrage_id = ?;
      `,
      [unite.uniteId, prix, timestamp, unite.ouvrageUniteId, ouvrageId]
    );
  }

  notifyLocalDataChanged();

  const ouvrage = await getOuvrageByIdLocal(ouvrageId);
  const ouvrageUnites = await getUnitesEtPrixParOuvrage(ouvrageId);
  return { ouvrage, unites: ouvrageUnites };
};

export const deleteOuvrageLocal = async (ouvrageId) => {
  if (!ouvrageId) return;

  const db = await ensureLocalDatabaseReady();
  const hasLigneSupprimeLe = await tableHasColumn(db, 'ligne_releves', 'supprime_le');
  const ligneTombstoneFilter = hasLigneSupprimeLe ? ' AND lr.supprime_le IS NULL' : '';

  const usageRow = await db.getFirstAsync(
    `
    SELECT COUNT(*) AS count
    FROM ligne_releves lr
    JOIN ouvrage_unites ou ON ou.id = lr.ouvrage_unite_id
    WHERE ou.ouvrage_id = ?${ligneTombstoneFilter};
    `,
    [ouvrageId]
  );

  if (Number(usageRow?.count) > 0) {
    throw new Error('Impossible de supprimer un ouvrage utilisé dans des relevés.');
  }

  const hasOuvrageSupprimeLe = await tableHasColumn(db, 'ouvrages', 'supprime_le');
  const hasOuvrageUniteSupprimeLe = await tableHasColumn(db, 'ouvrage_unites', 'supprime_le');
  const ouvrageLookupFilter = hasOuvrageSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const ouvrage = await db.getFirstAsync(
    `SELECT id, entreprise_id FROM ouvrages WHERE id = ?${ouvrageLookupFilter};`,
    [ouvrageId]
  );
  if (!ouvrage?.entreprise_id) return;

  const deletedAt = nowIso();
  const ouUniteTombstoneFilter = hasOuvrageUniteSupprimeLe ? ' AND supprime_le IS NULL' : '';
  await db.withTransactionAsync(async () => {
    if (hasOuvrageUniteSupprimeLe) {
      await db.runAsync(
        `
        UPDATE ouvrage_unites
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE ouvrage_id = ?${ouUniteTombstoneFilter};
        `,
        [deletedAt, ouvrageId]
      );
    }
    if (hasOuvrageSupprimeLe) {
      await db.runAsync(
        `
        UPDATE ouvrages
        SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
        WHERE id = ?;
        `,
        [deletedAt, ouvrageId]
      );
    } else {
      await db.runAsync(
        `
        INSERT OR REPLACE INTO pending_cloud_deletes (table_name, record_id, entreprise_id)
        VALUES ('ouvrages', ?, ?);
        `,
        [ouvrageId, ouvrage.entreprise_id]
      );
      await db.runAsync('DELETE FROM ouvrage_unites WHERE ouvrage_id = ?;', [ouvrageId]);
      await db.runAsync('DELETE FROM ouvrages WHERE id = ?;', [ouvrageId]);
    }
  });

  notifyLocalDataChanged();
};

export const getClientsByEntrepriseLocal = async (entrepriseId) => {
  if (!entrepriseId) return [];
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'clients', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  return db.getAllAsync(
    `
    SELECT id, entreprise_id, nom_complet, telephone_1, telephone_2, cree_le, mis_a_jour_le
    FROM clients
    WHERE entreprise_id = ?${tombstoneFilter}
    ORDER BY nom_complet ASC;
    `,
    [entrepriseId]
  );
};

export const getClientByIdLocal = async (clientId) => {
  if (!clientId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'clients', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  return db.getFirstAsync(`SELECT * FROM clients WHERE id = ?${tombstoneFilter};`, [clientId]);
};

export const deleteClientLocal = async (clientId) => {
  if (!clientId) return;
  const db = await ensureLocalDatabaseReady();
  const deletedAt = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
      UPDATE ligne_releves
      SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
      WHERE releve_id IN (
        SELECT releves.id
        FROM releves
        JOIN chantiers ON chantiers.id = releves.chantier_id
        WHERE chantiers.client_id = ?
      );
      `,
      [deletedAt, clientId]
    );
    await db.runAsync(
      `
      UPDATE releves
      SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
      WHERE chantier_id IN (SELECT id FROM chantiers WHERE client_id = ?);
      `,
      [deletedAt, clientId]
    );
    await db.runAsync(
      `
      UPDATE chantiers
      SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
      WHERE client_id = ?;
      `,
      [deletedAt, clientId]
    );
    await db.runAsync(
      `
      UPDATE clients
      SET supprime_le = ?, _synced = 0, mis_a_jour_le = datetime('now')
      WHERE id = ?;
      `,
      [deletedAt, clientId]
    );
  });

  notifyLocalDataChanged();
};

export const searchClientsLocal = async (entrepriseId, query) => {
  if (!entrepriseId || !query?.trim()) return [];

  const db = await ensureLocalDatabaseReady();
  const term = `%${query.trim()}%`;
  return db.getAllAsync(
    `
    SELECT id, nom_complet, telephone_1, telephone_2
    FROM clients
    WHERE entreprise_id = ?
      AND supprime_le IS NULL
      AND (nom_complet LIKE ? OR telephone_1 LIKE ? OR IFNULL(telephone_2, '') LIKE ?)
    ORDER BY nom_complet ASC
    LIMIT 20;
    `,
    [entrepriseId, term, term, term]
  );
};

export const searchChantiersByClientLocal = async (clientId, query) => {
  if (!clientId) return [];

  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'chantiers', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const trimmed = String(query || '').trim();
  const term = trimmed ? `%${trimmed}%` : '%';

  return db.getAllAsync(
    `
    SELECT id, nom, adresse, status, notes, photo_1, photo_2, photo_3
    FROM chantiers
    WHERE client_id = ?${tombstoneFilter}
      AND nom LIKE ?
    ORDER BY nom ASC
    LIMIT 20;
    `,
    [clientId, term]
  );
};

export const finalizeDimensionDraftLocal = async ({
  entrepriseId,
  clientId = null,
  clientNom,
  clientTelephone,
  chantierNom,
  chantierAdresse = null,
  chantierStatus = 'D',
  chantierNotes = null,
  chantierPhotoUris = null,
  chantierId = null,
  releveId = null,
  remise = undefined,
  indTva = undefined,
  lignes = [],
}) => {
  const resolvedEntrepriseId = entrepriseId || (await ensureEntrepriseLocale());

  if (!clientNom?.trim() || !clientTelephone?.trim() || !chantierNom?.trim()) {
    throw new Error('Le nom du client, le téléphone et le nom du chantier sont requis.');
  }

  const priseParId = await getCurrentProfilIdLocal();

  return runWithLocalDatabase(async () => {
    if (chantierId && releveId) {
      if (!(await canCurrentUserModifyChantierLocal(chantierId))) {
        throw new Error(RELEVE_ACCESS_DENIED_ERROR);
      }

      let resolvedClientId = clientId;
      if (resolvedClientId) {
        await updateClientLocal(resolvedClientId, clientNom.trim(), clientTelephone.trim());
      } else {
        resolvedClientId = await insertClientLocal(
          resolvedEntrepriseId,
          clientNom.trim(),
          clientTelephone.trim()
        );
      }

      await updateChantierLocal(
        chantierId,
        resolvedClientId,
        chantierNom.trim(),
        chantierAdresse?.trim() || null,
        chantierStatus,
        chantierNotes?.trim() || null
      );
      await replaceLignesReleveLocal(releveId, lignes);
      await updateRelevePriseParLocal(releveId, priseParId);
      if (remise !== undefined) {
        await updateReleveRemiseLocal(releveId, remise);
      }
      if (indTva !== undefined) {
        await updateReleveIndTvaLocal(releveId, indTva);
      } else {
        await refreshReleveTotaux(releveId);
      }
      if (chantierPhotoUris) {
        await applyChantierPendingPhotosLocal(chantierId, chantierPhotoUris);
      }

      notifyLocalDataChanged();
      return { clientId: resolvedClientId, chantierId, releveId };
    }

    let resolvedClientId = clientId;
    if (!resolvedClientId) {
      resolvedClientId = await insertClientLocal(
        resolvedEntrepriseId,
        clientNom.trim(),
        clientTelephone.trim()
      );
    }

    if (chantierId) {
      await updateChantierLocal(
        chantierId,
        resolvedClientId,
        chantierNom.trim(),
        chantierAdresse?.trim() || null,
        chantierStatus,
        chantierNotes?.trim() || null
      );

      const newReleveId = await insertReleveLocal(
        chantierId,
        priseParId,
        remise !== undefined ? remise : 0,
        indTva
      );

      await insertLignesForReleveLocal(newReleveId, lignes);
      await refreshReleveTotaux(newReleveId);
      if (chantierPhotoUris) {
        await applyChantierPendingPhotosLocal(chantierId, chantierPhotoUris);
      }

      notifyLocalDataChanged();
      return { clientId: resolvedClientId, chantierId, releveId: newReleveId };
    }

    const newChantierId = await insertChantierLocal(
      resolvedClientId,
      null,
      chantierNom.trim(),
      chantierAdresse?.trim() || null,
      null,
      chantierStatus,
      chantierNotes?.trim() || null
    );
    const newReleveId = await insertReleveLocal(
      newChantierId,
      priseParId,
      remise !== undefined ? remise : 0,
      indTva
    );

    await insertLignesForReleveLocal(newReleveId, lignes);
    await refreshReleveTotaux(newReleveId);
    if (chantierPhotoUris) {
      await applyChantierPendingPhotosLocal(newChantierId, chantierPhotoUris);
    }

    notifyLocalDataChanged();
    return { clientId: resolvedClientId, chantierId: newChantierId, releveId: newReleveId };
  });
};