import { ensureLocalDatabaseReady } from './localDb';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { computeQuantiteLigneReleve } from '../utils/ligneReleveCalcul';

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

export const ensureCatalogueLocal = async () => {};

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
  const releveId = await insertReleveLocal(chantierId, null);

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
  return id;
};

/**
 * Crée un nouveau chantier lié à un client
 */
export const insertChantierLocal = async (clientId, chefChantierId, nom, adresse = null, responsable = null) => {
  const db = await ensureLocalDatabaseReady();
  const id = uuidv4();

  const query = `
    INSERT INTO chantiers (id, client_id, chef_chantier_id, nom, adresse, responsable, status, _synced)
    VALUES (?, ?, ?, ?, ?, ?, 'D', 0);
  `;
  await db.runAsync(query, [id, clientId, chefChantierId, nom, adresse, responsable]);
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
    VALUES (?, ?, ?, 0.0, 18.0, 0.0, 0.0);
  `;
  await db.runAsync(query, [id, chantierId, priseParId]);
  return id;
};

/**
 * Enregistre une ligne de mesure physique ou de quantité directe sur le terrain.
 * Calcule automatiquement le montant avant l'insertion.
 */
const getUniteContextByOuvrageUniteId = async (ouvrageUniteId) => {
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(
    `
    SELECT u.ind_dimension, u.ind_unitaire, u.formule
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

  const { largeur, hauteur, profondeur, nombre, prixUnitaireApplique } = cotes;
  const uniteContext = await getUniteContextByOuvrageUniteId(ouvrageUniteId);
  const quantite = computeQuantiteLigneReleve({
    indDimension: uniteContext?.ind_dimension,
    indUnitaire: uniteContext?.ind_unitaire,
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
      nombre, quantite, prix_unitaire_applique, montant, _synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
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
    montant
  ]);

  // Optionnel mais recommandé : Recalculer les totaux du relevé parent après l'ajout
  await refreshReleveTotaux(releveId);

  return id;
};

/**
 * Fonction interne pour recalculer automatiquement les totaux HT et TTC d'un relevé
 */
export const refreshReleveTotaux = async (releveId) => {
  const db = await ensureLocalDatabaseReady();
  
  // 1. Somme de tous les montants des lignes de ce relevé
  const result = await db.getFirstAsync(
    `SELECT SUM(montant) as total_ht FROM ligne_releves WHERE releve_id = ?;`,
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
export const getChantiersWithClientLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  const query = `
    SELECT
      chantiers.*,
      clients.nom_complet as client_nom,
      clients.telephone_1 as client_telephone_1,
      clients.telephone_2 as client_telephone_2
    FROM chantiers 
    JOIN clients ON chantiers.client_id = clients.id
    ORDER BY chantiers.cree_le DESC;
  `;
  return await db.getAllAsync(query);
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
    SELECT ou.id as ouvrage_unite_id, u.formule, u.nom, u.ind_dimension, u.ind_unitaire, ou.prix_unitaire
    FROM ouvrage_unites ou
    JOIN unites u ON ou.unite_id = u.id
    WHERE ou.ouvrage_id = ?;
  `;
  return await db.getAllAsync(query, [ouvrageId]);
};

export const getLignesByChantierLocal = async (chantierId) => {
  const db = await ensureLocalDatabaseReady();
  const query = `
    SELECT
      lr.id,
      lr.releve_id,
      lr.largeur,
      lr.hauteur,
      lr.profondeur,
      lr.nombre,
      lr.quantite,
      lr.prix_unitaire_applique,
      lr.montant,
      o.nom as ouvrage_nom,
      u.nom as unite_nom
    FROM ligne_releves lr
    JOIN releves r ON r.id = lr.releve_id
    JOIN ouvrage_unites ou ON ou.id = lr.ouvrage_unite_id
    JOIN ouvrages o ON o.id = ou.ouvrage_id
    JOIN unites u ON u.id = ou.unite_id
    WHERE r.chantier_id = ?
    ORDER BY lr.cree_le DESC;
  `;
  return await db.getAllAsync(query, [chantierId]);
};