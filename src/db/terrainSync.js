import { ensureLocalDatabaseReady } from './localDb';
import { applyTerrainPullPayload } from './terrainSyncMerge';

const TABLE_UPSERT_ORDER = [
  'entreprises',
  'profils',
  'metiers',
  'sections',
  'unites',
  'fournisseurs',
  'ouvrages',
  'ouvrage_unites',
  'clients',
  'chantiers',
  'releves',
  'section_releves',
  'ligne_releves',
];

const CLEAR_TABLES_ORDER = [
  'ligne_releves',
  'section_releves',
  'releves',
  'chantiers',
  'clients',
  'ouvrage_unites',
  'ouvrages',
  'fournisseurs',
  'sections',
  'profils',
  'entreprises',
  'terrain_session',
  'terrain_device',
  'metiers',
  'unites',
];

const TABLE_COLUMNS = {
  entreprises: [
    'id',
    'nom',
    'telephone_1',
    'telephone_2',
    'adresse',
    'logo',
    'ind_pro',
    'ind_active',
    'ind_tva',
    'ind_admin_connecte_mobile',
    'ind_metiers_preselectionnes',
    'date_actif_jusqua',
    'pro_activated_le',
    'pro_downgraded_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  profils: [
    'id',
    'entreprise_id',
    'prenom',
    'nom',
    'telephone_1',
    'telephone_2',
    'role',
    'identifiant',
    'date_premier_login',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  metiers: [
    'id',
    'nom',
    'abbrev',
    'icon',
    'entreprise_id',
    'ordre',
    'ind_actif',
    'ind_default',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  sections: [
    'id',
    'nom',
    'entreprise_id',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  unites: [
    'id',
    'formule',
    'nom',
    'nom_unite',
    'ind_dimension',
    'cree_le',
    'mis_a_jour_le',
  ],
  ouvrages: [
    'id',
    'metier_id',
    'entreprise_id',
    'nom',
    'nom_devis',
    'ind_article',
    'fournisseur_id',
    'photo',
    'supprime_le',
    'ind_actif',
    'ordre',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  ouvrage_unites: [
    'id',
    'ouvrage_id',
    'unite_id',
    'prix_unitaire',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  fournisseurs: [
    'id',
    'metier_id',
    'entreprise_id',
    'nom',
    'telephone_1',
    'telephone_2',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  clients: [
    'id',
    'entreprise_id',
    'nom_complet',
    'telephone_1',
    'telephone_2',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  chantiers: [
    'id',
    'client_id',
    'chef_chantier_id',
    'nom',
    'adresse',
    'responsable',
    'status',
    'notes',
    'photo_1',
    'photo_2',
    'photo_3',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  releves: [
    'id',
    'chantier_id',
    'prise_par_id',
    'date_facture',
    'total_ht_facture',
    'tva_facture',
    'total_ttc_facture',
    'remise',
    'ind_tva',
    'status',
    'note',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  section_releves: [
    'id',
    'section_id',
    'releve_id',
    'ordre',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  ligne_releves: [
    'id',
    'releve_id',
    'ouvrage_unite_id',
    'largeur',
    'hauteur',
    'profondeur',
    'nombre',
    'quantite',
    'prix_unitaire_applique',
    'montant',
    'note',
    'photo',
    'section_id',
    'ordre',
    'ind_complete',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
};

const FLAG_COLUMNS = new Set([
  'ind_pro',
  'ind_active',
  'ind_tva',
  '_synced',
  'ind_dimension',
  'ind_complete',
  'ind_article',
  'ind_actif',
  'ind_default',
  'ind_admin_connecte_mobile',
  'ind_metiers_preselectionnes',
]);

const coerceFlag = (value) => {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  if (value == null) return null;
  return Number(value) === 1 ? 1 : 0;
};

const coerceTimestamp = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const normalizeRow = (tableName, row) => {
  const columns = TABLE_COLUMNS[tableName];
  const normalized = {};
  columns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(row, column)) {
      if (tableName === 'releves' && column === 'ind_tva') {
        normalized[column] = 0;
      } else if (tableName === 'releves' && column === 'status') {
        normalized[column] = 'E';
      }
      return;
    }
    const value = row[column];
    if (FLAG_COLUMNS.has(column)) {
      normalized[column] = coerceFlag(value);
    } else if (
      column === 'cree_le' ||
      column === 'mis_a_jour_le' ||
      column === 'supprime_le' ||
      column === 'pro_activated_le' ||
      column === 'pro_downgraded_le'
    ) {
      normalized[column] = coerceTimestamp(value);
    } else {
      normalized[column] = value;
    }
  });
  return normalized;
};

/** Normalise les lignes SQLite avant envoi cloud (types, colonnes connues, _synced=1). */
export const serializeRowsForCloudPush = (tableName, rows = []) =>
  rows.map((rawRow) => {
    const row = normalizeRow(tableName, rawRow);
    row._synced = 1;
    return row;
  });

export const upsertRows = async (db, tableName, rows = []) => {
  if (!rows.length) return;

  const columns = TABLE_COLUMNS[tableName];
  const placeholders = columns.map(() => '?').join(', ');
  const conflictTarget = '(id)';
  const updateColumns = columns.filter((column) => column !== 'id');
  const updateClause = updateColumns
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  for (const rawRow of rows) {
    const row = normalizeRow(tableName, rawRow);

    if (tableName === 'section_releves' && row.section_id) {
      const section = await db.getFirstAsync('SELECT id FROM sections WHERE id = ?;', [row.section_id]);
      if (!section) continue;
    }

    if (tableName === 'ligne_releves' && row.section_id) {
      const section = await db.getFirstAsync('SELECT id FROM sections WHERE id = ?;', [row.section_id]);
      if (!section) {
        row.section_id = null;
      }
    }

    const values = columns.map((column) => {
      if (row[column] !== undefined) return row[column];
      if (tableName === 'releves' && column === 'ind_tva') return 0;
      if (tableName === 'releves' && column === 'status') return 'E';
      return null;
    });
    await db.runAsync(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT${conflictTarget} DO UPDATE SET ${updateClause};`,
      values
    );
  }
};

export const syncTerrainBootstrapLocal = async (payload) => {
  try {
    await applyTerrainPullPayload(
      {
        entreprise: payload?.entreprise,
        profil: payload?.profil,
        profils: payload?.profils,
        metiers: payload?.metiers,
        unites: payload?.unites,
        ouvrages: payload?.ouvrages,
        ouvrage_unites: payload?.ouvrage_unites,
        fournisseurs: payload?.fournisseurs,
        clients: payload?.clients,
        chantiers: payload?.chantiers,
        releves: payload?.releves,
        sections: payload?.sections,
        section_releves: payload?.section_releves,
        ligne_releves: payload?.ligne_releves,
      },
      { forceAll: true }
    );
  } catch (error) {
    console.error('Erreur syncTerrainBootstrapLocal:', error);
    throw new Error(
      error?.message ||
        'Échec enregistrement local. Vérifiez métiers, unités, ouvrages et ouvrage_unites dans Supabase.'
    );
  }
};

const normalizeIdentifiant = (value) => String(value || '').trim().toUpperCase();

const timingSafeEqualString = (left, right) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

export const saveTerrainSessionLocal = async ({ profilId, entrepriseId, identifiant, motDePasse }) => {
  const db = await ensureLocalDatabaseReady();
  await db.runAsync('DELETE FROM terrain_session;');
  await db.runAsync(
    `INSERT INTO terrain_session (id, profil_id, entreprise_id, identifiant, logged_in_at)
     VALUES (1, ?, ?, ?, datetime('now'));`,
    [profilId, entrepriseId, identifiant]
  );
  await saveTerrainDeviceAccountLocal({ profilId, entrepriseId, identifiant, motDePasse });
};

export const saveTerrainDeviceAccountLocal = async ({ profilId, entrepriseId, identifiant, motDePasse }) => {
  const db = await ensureLocalDatabaseReady();
  const existing = await getTerrainDeviceAccountLocal();
  const resolvedPassword = motDePasse ?? existing?.mot_de_passe ?? null;

  await db.runAsync('DELETE FROM terrain_device;');
  await db.runAsync(
    `INSERT INTO terrain_device (id, profil_id, entreprise_id, identifiant, mot_de_passe, updated_at)
     VALUES (1, ?, ?, ?, ?, datetime('now'));`,
    [profilId, entrepriseId, identifiant, resolvedPassword]
  );
};

export const getTerrainDeviceAccountLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync('SELECT * FROM terrain_device WHERE id = 1;');
};

export const ensureTerrainDeviceFromSession = async () => {
  const session = await getTerrainSessionLocal();
  if (!session?.identifiant) return;

  const device = await getTerrainDeviceAccountLocal();
  if (device?.identifiant) return;

  await saveTerrainDeviceAccountLocal({
    profilId: session.profil_id,
    entrepriseId: session.entreprise_id,
    identifiant: session.identifiant,
  });
};

export const isLocalTerrainDataEmpty = async () => {
  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync('SELECT COUNT(*) AS count FROM entreprises;');
  return Number(row?.count || 0) === 0;
};

export const hasLocalTerrainAccountData = async () => {
  return !(await isLocalTerrainDataEmpty());
};

export const getLocalTerrainAccountIdentifiant = async () => {
  const device = await getTerrainDeviceAccountLocal();
  if (device?.identifiant) {
    return normalizeIdentifiant(device.identifiant);
  }

  const session = await getTerrainSessionLocal();
  if (session?.identifiant) {
    return normalizeIdentifiant(session.identifiant);
  }

  return null;
};

export const willSwitchTerrainAccount = async (identifiant) => {
  const normalized = normalizeIdentifiant(identifiant);
  if (!normalized) return false;

  const hasData = await hasLocalTerrainAccountData();
  if (!hasData) return false;

  const storedIdentifiant = await getLocalTerrainAccountIdentifiant();
  if (!storedIdentifiant) return false;

  return storedIdentifiant !== normalized;
};

export const isSameTerrainAccountRegisteredLocally = async (identifiant) => {
  if (await isLocalTerrainDataEmpty()) return false;
  return !(await willSwitchTerrainAccount(identifiant));
};

export const INACTIVE_ENTREPRISE_ERROR = 'Compte inactif.';

const startOfUtcDayMs = (value) => {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const isProEntrepriseExpired = (entreprise) => {
  if (!entreprise || Number(entreprise.ind_pro) !== 1) return false;
  const limitMs = startOfUtcDayMs(entreprise.date_actif_jusqua);
  if (limitMs == null) return false;
  const todayMs = startOfUtcDayMs(new Date().toISOString());
  return todayMs > limitMs;
};

export const enforceEntrepriseExpiryLocal = async (entrepriseId) => {
  if (!entrepriseId) return { expired: false };

  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync(
    'SELECT id, ind_pro, ind_active, date_actif_jusqua FROM entreprises WHERE id = ?;',
    [entrepriseId]
  );

  if (!row || !isProEntrepriseExpired(row)) {
    return { expired: false };
  }

  await markEntrepriseInactiveLocal(entrepriseId);
  return { expired: true, error: INACTIVE_ENTREPRISE_ERROR };
};

export const recordProfilFirstLoginLocal = async (profilId) => {
  if (!profilId) return;

  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync('SELECT date_premier_login FROM profils WHERE id = ?;', [profilId]);
  if (row?.date_premier_login) return;

  const now = new Date().toISOString();
  await db.runAsync('UPDATE profils SET date_premier_login = ?, mis_a_jour_le = ? WHERE id = ?;', [
    now,
    now,
    profilId,
  ]);
};

export const isEntrepriseActiveLocal = async (entrepriseId) => {
  if (!entrepriseId) return false;

  const expiry = await enforceEntrepriseExpiryLocal(entrepriseId);
  if (expiry.expired) return false;

  const db = await ensureLocalDatabaseReady();
  const row = await db.getFirstAsync('SELECT ind_active FROM entreprises WHERE id = ?;', [
    entrepriseId,
  ]);
  return row != null && Number(row.ind_active) === 1;
};

export const isInactiveEntrepriseError = (message) =>
  String(message || '').trim().toLowerCase().includes('compte inactif');

export const markEntrepriseInactiveLocal = async (entrepriseId) => {
  if (!entrepriseId) return;
  const db = await ensureLocalDatabaseReady();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE entreprises SET ind_active = 0, mis_a_jour_le = ? WHERE id = ?;', [
    now,
    entrepriseId,
  ]);
};

export const revokeTerrainSessionIfEntrepriseInactive = async () => {
  const session = await getTerrainSessionLocal();
  if (!session?.entreprise_id) {
    return { inactive: false };
  }

  if (await isEntrepriseActiveLocal(session.entreprise_id)) {
    return { inactive: false };
  }

  await clearTerrainSessionLocal();
  return { inactive: true, error: INACTIVE_ENTREPRISE_ERROR };
};

export const forceLogoutInactiveEntreprise = async (entrepriseId) => {
  await markEntrepriseInactiveLocal(entrepriseId);
  await clearTerrainSessionLocal();
  return { ok: false, forcedLogout: true, error: INACTIVE_ENTREPRISE_ERROR };
};

export const loginTerrainOfflineLocal = async (identifiant, motDePasse) => {
  const normalized = normalizeIdentifiant(identifiant);
  const device = await getTerrainDeviceAccountLocal();

  if (!device?.profil_id || !device?.entreprise_id) {
    return { ok: false, error: 'Veuillez vous connecter pour une première connexion.' };
  }

  if (normalizeIdentifiant(device.identifiant) !== normalized) {
    return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
  }

  if (!device.mot_de_passe) {
    return { ok: false, error: 'Veuillez vous connecter pour une première connexion.' };
  }

  if (!timingSafeEqualString(String(motDePasse), String(device.mot_de_passe))) {
    return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
  }

  if (!(await isEntrepriseActiveLocal(device.entreprise_id))) {
    return { ok: false, error: INACTIVE_ENTREPRISE_ERROR };
  }

  await saveTerrainSessionLocal({
    profilId: device.profil_id,
    entrepriseId: device.entreprise_id,
    identifiant: device.identifiant,
    motDePasse: device.mot_de_passe,
  });

  return {
    ok: true,
    entrepriseId: device.entreprise_id,
    profilId: device.profil_id,
    offline: true,
  };
};

export const clearLocalTerrainData = async () => {
  const db = await ensureLocalDatabaseReady();

  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    for (const tableName of CLEAR_TABLES_ORDER) {
      await db.runAsync(`DELETE FROM ${tableName};`);
    }
    await db.execAsync('PRAGMA foreign_keys = ON;');
  });
};

export const getTerrainSessionLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync('SELECT * FROM terrain_session WHERE id = 1;');
};

export const clearTerrainSessionLocal = async () => {
  const db = await ensureLocalDatabaseReady();
  await db.runAsync('DELETE FROM terrain_session;');
};

export const getLoggedInProfilLocal = async () => {
  const session = await getTerrainSessionLocal();
  if (!session?.profil_id) return null;

  const db = await ensureLocalDatabaseReady();
  return db.getFirstAsync(
    `
    SELECT
      profils.*,
      entreprises.nom AS entreprise_nom,
      entreprises.logo AS entreprise_logo,
      entreprises.ind_pro AS ind_pro,
      entreprises.ind_tva AS entreprise_ind_tva
    FROM profils
    LEFT JOIN entreprises ON entreprises.id = profils.entreprise_id
    WHERE profils.id = ?;
    `,
    [session.profil_id]
  );
};
