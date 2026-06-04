import { ensureLocalDatabaseReady, tableHasColumn } from './localDb';
import { getLoggedInProfilLocal, getTerrainSessionLocal } from './terrainSync';
import { scheduleTerrainSyncAfterWrite } from './terrainSyncScheduler';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { computeQuantiteLigneReleve } from '../utils/ligneReleveCalcul';

const nowIso = () => new Date().toISOString();

const notifyLocalDataChanged = () => {
  scheduleTerrainSyncAfterWrite();
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
    throw new Error('Aucune entreprise locale. Synchronisez les donnees depuis Supabase.');
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
    const ouvragesRow = await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM ouvrages WHERE entreprise_id = ?;',
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

/** Metiers du catalogue local (Supabase). Filtre par ouvrages entreprise si disponibles. */
export const getMetiersForEntrepriseLocal = async (entrepriseId) => {
  const db = await ensureLocalDatabaseReady();

  if (entrepriseId) {
    const linkedMetiers = await db.getAllAsync(
      `
      SELECT DISTINCT m.*
      FROM metiers m
      INNER JOIN ouvrages o ON o.metier_id = m.id
      WHERE o.entreprise_id = ?
      ORDER BY m.nom ASC;
      `,
      [entrepriseId]
    );
    if (linkedMetiers.length > 0) {
      return linkedMetiers;
    }
  }

  return db.getAllAsync('SELECT * FROM metiers ORDER BY nom ASC;');
};

export const getMetiersLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  return db.getAllAsync('SELECT * FROM metiers ORDER BY nom ASC;');
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
    throw new Error('Les champs clientNomComplet, clientTelephone et chantierNom sont requis.');
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
export const insertReleveLocal = async (chantierId, priseParId = null) => {
  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  const query = `
    INSERT INTO releves (id, chantier_id, prise_par_id, total_ht_facture, tva_facture, total_ttc_facture, _synced)
    VALUES (?, ?, ?, 0.0, 18.0, 0.0, 0);
  `;
  await db.runAsync(query, [id, chantierId, priseParId]);
  notifyLocalDataChanged();
  return id;
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
  return db.getFirstAsync(
    `
    SELECT u.ind_dimension, u.formule
    FROM ouvrage_unites ou
    JOIN unites u ON u.id = ou.unite_id
    WHERE ou.id = ?;
    `,
    [ouvrageUniteId]
  );
};

export const insertLigneReleveLocal = async (releveId, ouvrageUniteId, cotes) => {
  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  const {
    largeur,
    hauteur,
    profondeur,
    nombre,
    prixUnitaireApplique,
    note = null,
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

  // Calcul automatique du montant (Quantité x Prix Appliqué)
  const montant = quantite * prixUnitaireApplique;

  const query = `
    INSERT INTO ligne_releves (
      id, releve_id, ouvrage_unite_id, largeur, hauteur, profondeur, 
      nombre, quantite, prix_unitaire_applique, montant, note, ind_complete, _synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
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
      await insertLigneReleveLocal(releveId, ligne.ouvrage_unite_id, {
        largeur: ligne.largeur,
        hauteur: ligne.hauteur,
        profondeur: ligne.profondeur,
        nombre: ligne.nombre,
        prixUnitaireApplique: resolveLignePrixUnitaire(ligne),
        note: ligne.note,
        indComplete: Number(ligne.ind_complete) === 1 ? 1 : 0,
      });
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
  const db = await ensureLocalDatabaseReady();
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
  
  // 1. Somme de tous les montants des lignes de ce relevé
  const result = await db.getFirstAsync(
    `SELECT SUM(montant) as total_ht FROM ligne_releves WHERE releve_id = ? AND supprime_le IS NULL;`,
    [releveId]
  );
  
  const totalHt = result?.total_ht || 0.0;
  const tvaTaux = 18.0; // TVA Mali 18%
  const totalTtc = totalHt * (1 + tvaTaux / 100);

  // 2. Mise à jour du relevé parent
  await db.runAsync(
    `UPDATE releves SET total_ht_facture = ?, total_ttc_facture = ?, _synced = 0, mis_a_jour_le = datetime('now') WHERE id = ?;`,
    [totalHt, totalTtc, releveId]
  );
};

/**
 * Récupère la liste complète des chantiers avec le nom du client associé
 */
export const getChantiersWithClientLocal = async (entrepriseId = null) => {
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe =
    (await tableHasColumn(db, 'chantiers', 'supprime_le')) &&
    (await tableHasColumn(db, 'clients', 'supprime_le'));
  const tombstoneFilter = hasSupprimeLe
    ? ' AND chantiers.supprime_le IS NULL AND clients.supprime_le IS NULL'
    : '';

  const query = entrepriseId
    ? `
    SELECT
      chantiers.*,
      clients.nom_complet as client_nom,
      clients.telephone_1 as client_telephone_1,
      clients.telephone_2 as client_telephone_2
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    WHERE clients.entreprise_id = ?${tombstoneFilter}
    ORDER BY chantiers.cree_le DESC;
  `
    : `
    SELECT
      chantiers.*,
      clients.nom_complet as client_nom,
      clients.telephone_1 as client_telephone_1,
      clients.telephone_2 as client_telephone_2
    FROM chantiers
    JOIN clients ON chantiers.client_id = clients.id
    WHERE 1=1${tombstoneFilter}
    ORDER BY chantiers.cree_le DESC;
  `;
  return entrepriseId ? db.getAllAsync(query, [entrepriseId]) : db.getAllAsync(query);
};

/**
 * Filtre les ouvrages d'un métier spécifique pour l'entreprise connectée
 */
export const getOuvragesByMetierAndEntreprise = async (metierId, entrepriseId) => {
  const db = await ensureLocalDatabaseReady();
  const query = `SELECT * FROM ouvrages WHERE metier_id = ? AND entreprise_id = ? ORDER BY nom ASC;`;
  return await db.getAllAsync(query, [metierId, entrepriseId]);
};

/**
 * Récupère les unités et prix disponibles pour un ouvrage donné
 */
export const getUnitesEtPrixParOuvrage = async (ouvrageId) => {
  const db = await ensureLocalDatabaseReady();
  const query = `
    SELECT ou.id as ouvrage_unite_id, ou.ouvrage_id, u.formule, u.nom, u.nom_unite, u.ind_dimension, ou.prix_unitaire
    FROM ouvrage_unites ou
    JOIN unites u ON ou.unite_id = u.id
    WHERE ou.ouvrage_id = ?
    ORDER BY u.nom ASC;
  `;
  return await db.getAllAsync(query, [ouvrageId]);
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
}) => {
  const trimmedNom = String(nom || '').trim();
  if (!metierId || !entrepriseId || !trimmedNom || !uniteId) {
    throw new Error('Metier, entreprise, nom et unite sont requis.');
  }

  const prix = Number(prixUnitaire);
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error('Prix unitaire invalide.');
  }

  const db = await ensureLocalDatabaseReady();
  const ouvrageId = uuidv4();
  const ouvrageUniteId = uuidv4();
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO ouvrages (id, metier_id, entreprise_id, nom, cree_le, mis_a_jour_le, _synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [ouvrageId, metierId, entrepriseId, trimmedNom, timestamp, timestamp]
  );

  await db.runAsync(
    `INSERT INTO ouvrage_unites (id, ouvrage_id, unite_id, prix_unitaire, cree_le, mis_a_jour_le, _synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [ouvrageUniteId, ouvrageId, uniteId, prix, timestamp, timestamp]
  );

  notifyLocalDataChanged();

  const unites = await getUnitesEtPrixParOuvrage(ouvrageId);
  const ouvrageUnite =
    unites.find((row) => row.ouvrage_unite_id === ouvrageUniteId) || unites[0] || null;

  return {
    ouvrage: {
      id: ouvrageId,
      metier_id: metierId,
      entreprise_id: entrepriseId,
      nom: trimmedNom,
    },
    ouvrageUnite,
  };
};

export const getOuvrageUniteContextLocal = async (ouvrageUniteId) => {
  if (!ouvrageUniteId) return null;

  const db = await ensureLocalDatabaseReady();
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
      m.id AS metier_id,
      m.nom AS metier_nom,
      m.abbrev AS metier_abbrev,
      m.icon AS metier_icon
    FROM ouvrage_unites ou
    JOIN unites u ON u.id = ou.unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    JOIN metiers m ON m.id = o.metier_id
    WHERE ou.id = ?;
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

export const getLignesByChantierLocal = async (chantierId) => {
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
      lr.ind_complete,
      o.nom as ouvrage_nom,
      m.id as metier_id,
      m.nom as metier_nom,
      u.nom_unite,
      u.ind_dimension
    FROM ligne_releves lr
    JOIN releves r ON r.id = lr.releve_id
    JOIN ouvrage_unites ou ON ou.id = lr.ouvrage_unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    JOIN metiers m ON m.id = o.metier_id
    JOIN unites u ON u.id = ou.unite_id
    WHERE r.chantier_id = ?${tombstoneFilter}
    ORDER BY m.nom ASC, lr.cree_le DESC;
  `;
  return await db.getAllAsync(query, [chantierId]);
};

export const getReleveIdByChantierLocal = async (chantierId) => {
  if (!chantierId) return null;
  const db = await ensureLocalDatabaseReady();
  const hasSupprimeLe = await tableHasColumn(db, 'releves', 'supprime_le');
  const tombstoneFilter = hasSupprimeLe ? ' AND supprime_le IS NULL' : '';
  const row = await db.getFirstAsync(
    `SELECT id FROM releves WHERE chantier_id = ?${tombstoneFilter} ORDER BY cree_le ASC LIMIT 1;`,
    [chantierId]
  );
  return row?.id || null;
};

export const deleteChantierLocal = async (chantierId) => {
  if (!chantierId) return;
  const db = await ensureLocalDatabaseReady();
  const deletedAt = nowIso();

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

  notifyLocalDataChanged();
};

export const getEntrepriseByIdLocal = async (entrepriseId) => {
  if (!entrepriseId) return null;
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(`SELECT * FROM entreprises WHERE id = ?;`, [entrepriseId]);
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

export const finalizeDimensionDraftLocal = async ({
  entrepriseId,
  clientId = null,
  clientNom,
  clientTelephone,
  chantierNom,
  chantierAdresse = null,
  chantierStatus = 'D',
  chantierNotes = null,
  chantierId = null,
  releveId = null,
  lignes = [],
}) => {
  const resolvedEntrepriseId = entrepriseId || (await ensureEntrepriseLocale());

  if (!clientNom?.trim() || !clientTelephone?.trim() || !chantierNom?.trim()) {
    throw new Error('Le nom du client, le telephone et le nom du chantier sont requis.');
  }

  const priseParId = await getCurrentProfilIdLocal();

  if (chantierId && releveId) {
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

  const newChantierId = await insertChantierLocal(
    resolvedClientId,
    null,
    chantierNom.trim(),
    chantierAdresse?.trim() || null,
    null,
    chantierStatus,
    chantierNotes?.trim() || null
  );
  const newReleveId = await insertReleveLocal(newChantierId, priseParId);

  await insertLignesForReleveLocal(newReleveId, lignes);

  notifyLocalDataChanged();
  return { clientId: resolvedClientId, chantierId: newChantierId, releveId: newReleveId };
};