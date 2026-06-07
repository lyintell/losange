import * as SQLite from 'expo-sqlite';

let dbInstance = null;
let dbInitPromise = null;

export const getLocalDB = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('losange_final.db');
  return dbInstance;
};

export const tableHasColumn = async (db, tableName, columnName) => {
  const rows = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
  return rows.some((row) => row.name === columnName);
};

/** Supprime ind_unitaire (DROP COLUMN ou recréation de table si SQLite le refuse). */
const migrateUnitesDropIndUnitaire = async (db) => {
  if (!(await tableHasColumn(db, 'unites', 'ind_unitaire'))) {
    return;
  }

  try {
    await db.execAsync('ALTER TABLE unites DROP COLUMN ind_unitaire;');
    if (!(await tableHasColumn(db, 'unites', 'ind_unitaire'))) {
      return;
    }
  } catch {
    // DROP COLUMN non supporté ou refusé : recréation de la table.
  }

  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
  await db.execAsync('DROP TABLE IF EXISTS unites__sans_ind_unitaire;');
  await db.execAsync(`
    CREATE TABLE unites__sans_ind_unitaire (
      id TEXT PRIMARY KEY NOT NULL,
      formule TEXT NOT NULL,
      nom TEXT NOT NULL,
      nom_unite TEXT NOT NULL CHECK (length(nom_unite) <= 10),
      ind_dimension INTEGER NOT NULL DEFAULT 0 CHECK (ind_dimension IN (0, 1)),
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now'))
    );
  `);
  await db.execAsync(`
    INSERT INTO unites__sans_ind_unitaire (id, formule, nom, nom_unite, ind_dimension, cree_le, mis_a_jour_le)
    SELECT id, formule, nom, nom_unite, ind_dimension, cree_le, mis_a_jour_le
    FROM unites;
  `);
  await db.execAsync('DROP TABLE unites;');
  await db.execAsync('ALTER TABLE unites__sans_ind_unitaire RENAME TO unites;');
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
};

export const initLocalDatabase = async () => {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
  const db = await getLocalDB();

  // Forcer la vérification des contraintes d'intégrité
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Exécution du schéma épuré et normalisé
  await db.execAsync(`
    -- 1. TABLE ENTREPRISE
    CREATE TABLE IF NOT EXISTS entreprises (
      id TEXT PRIMARY KEY NOT NULL,
      nom TEXT NOT NULL,
      telephone_1 TEXT NOT NULL,
      telephone_2 TEXT,
      adresse TEXT,
      logo TEXT,
      ind_pro INTEGER NOT NULL DEFAULT 0 CHECK (ind_pro IN (0, 1)),
      ind_active INTEGER NOT NULL DEFAULT 1 CHECK (ind_active IN (0, 1)),
      ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1)),
      date_actif_jusqua TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1))
    );

    -- 2. TABLE PROFIL
    CREATE TABLE IF NOT EXISTS profils (
      id TEXT PRIMARY KEY NOT NULL,
      entreprise_id TEXT,
      prenom TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone_1 TEXT NOT NULL,
      telephone_2 TEXT,
      role TEXT NOT NULL DEFAULT 'A' CHECK (role IN ('A', 'C', 'S', 'T')),
      identifiant TEXT UNIQUE,
      date_premier_login TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE SET NULL
    );

    -- 3. TABLE CLIENT
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY NOT NULL,
      entreprise_id TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      telephone_1 TEXT NOT NULL,
      telephone_2 TEXT,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    -- 4. TABLE CHANTIER
    CREATE TABLE IF NOT EXISTS chantiers (
      id TEXT PRIMARY KEY NOT NULL,
      client_id TEXT NOT NULL,
      chef_chantier_id TEXT,
      nom TEXT NOT NULL,
      adresse TEXT,
      responsable TEXT,
      status TEXT NOT NULL DEFAULT 'D' CHECK (status IN ('D', 'V', 'E', 'X', 'Z')),
      notes TEXT,
      photo_1 TEXT,
      photo_2 TEXT,
      photo_3 TEXT,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
      FOREIGN KEY (chef_chantier_id) REFERENCES profils (id) ON DELETE SET NULL
    );

    -- 5. TABLE METIER
    CREATE TABLE IF NOT EXISTS metiers (
      id TEXT PRIMARY KEY NOT NULL,
      nom TEXT NOT NULL,
      abbrev TEXT,
      icon TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now'))
    );

    -- 6. TABLE OUVRAGE
    CREATE TABLE IF NOT EXISTS ouvrages (
      id TEXT PRIMARY KEY NOT NULL,
      metier_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      nom TEXT NOT NULL,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (metier_id) REFERENCES metiers (id) ON DELETE CASCADE,
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    -- 7. TABLE UNITE
    CREATE TABLE IF NOT EXISTS unites (
      id TEXT PRIMARY KEY NOT NULL,
      formule TEXT NOT NULL,
      nom TEXT NOT NULL,
      nom_unite TEXT NOT NULL CHECK (length(nom_unite) <= 10),
      ind_dimension INTEGER NOT NULL DEFAULT 0 CHECK (ind_dimension IN (0, 1)),
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now'))
    );

    -- 8. TABLE OUVRAGEUNITE (Épurée : entreprise_id retirée)
    CREATE TABLE IF NOT EXISTS ouvrage_unites (
      id TEXT PRIMARY KEY NOT NULL,
      ouvrage_id TEXT NOT NULL,
      unite_id TEXT NOT NULL,
      prix_unitaire REAL NOT NULL DEFAULT 0.0,      
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (ouvrage_id) REFERENCES ouvrages (id) ON DELETE CASCADE,
      FOREIGN KEY (unite_id) REFERENCES unites (id) ON DELETE CASCADE
    );

    -- 9. TABLE RELEVE
    CREATE TABLE IF NOT EXISTS releves (
      id TEXT PRIMARY KEY NOT NULL,
      chantier_id TEXT NOT NULL,
      prise_par_id TEXT,
      date_facture TEXT DEFAULT (date('now')),
      total_ht_facture REAL DEFAULT 0.0,
      tva_facture REAL DEFAULT 18.0,
      total_ttc_facture REAL DEFAULT 0.0,
      note TEXT,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (chantier_id) REFERENCES chantiers (id) ON DELETE CASCADE,
      FOREIGN KEY (prise_par_id) REFERENCES profils (id) ON DELETE SET NULL
    );

    -- 10. TABLE LIGNERELEVE
    CREATE TABLE IF NOT EXISTS ligne_releves (
      id TEXT PRIMARY KEY NOT NULL,
      releve_id TEXT NOT NULL,
      ouvrage_unite_id TEXT NOT NULL,
      largeur REAL,
      hauteur REAL,
      profondeur REAL,
      nombre INTEGER DEFAULT 1,
      quantite REAL NOT NULL DEFAULT 1.0,
      prix_unitaire_applique REAL NOT NULL,
      montant REAL NOT NULL,
      note TEXT,
      photo TEXT,
      ind_complete INTEGER NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1)),
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (releve_id) REFERENCES releves (id) ON DELETE CASCADE,
      FOREIGN KEY (ouvrage_unite_id) REFERENCES ouvrage_unites (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS terrain_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      profil_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      identifiant TEXT NOT NULL,
      logged_in_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profil_id) REFERENCES profils (id) ON DELETE CASCADE,
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS terrain_device (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      profil_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      identifiant TEXT NOT NULL,
      mot_de_passe TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metiers_ordre (
      metier_id TEXT PRIMARY KEY NOT NULL,
      ordre INTEGER NOT NULL,
      FOREIGN KEY (metier_id) REFERENCES metiers (id) ON DELETE CASCADE
    );
  `);

  console.log("🚀 Schéma Draw.io complet, épuré et initialisé avec succès dans SQLite !");

  try {
    await db.execAsync('ALTER TABLE chantiers ADD COLUMN notes TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_pro INTEGER NOT NULL DEFAULT 0 CHECK (ind_pro IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_active INTEGER NOT NULL DEFAULT 1 CHECK (ind_active IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE entreprises ADD COLUMN date_actif_jusqua TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE profils ADD COLUMN identifiant TEXT;');
    await db.execAsync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_profils_identifiant ON profils(identifiant) WHERE identifiant IS NOT NULL;'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE profils ADD COLUMN date_premier_login TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS terrain_device (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        profil_id TEXT NOT NULL,
        entreprise_id TEXT NOT NULL,
        identifiant TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Table deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE terrain_device ADD COLUMN mot_de_passe TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE ligne_releves ADD COLUMN note TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE ligne_releves ADD COLUMN ind_complete INTEGER NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE releves ADD COLUMN note TEXT;');
  } catch {
    // Colonne deja presente.
  }

  await migrateUnitesDropIndUnitaire(db);

  for (const tableName of ['clients', 'chantiers', 'releves', 'ligne_releves']) {
    try {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN supprime_le TEXT;`);
    } catch {
      // Colonne deja presente.
    }
  }
  })();

  return dbInitPromise;
};

const ensureSchemaMigrations = async (db) => {
  try {
    await db.execAsync('ALTER TABLE chantiers ADD COLUMN notes TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE entreprises ADD COLUMN date_actif_jusqua TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE profils ADD COLUMN date_premier_login TEXT;');
  } catch {
    // Colonne deja presente.
  }

  for (const tableName of ['clients', 'chantiers', 'releves', 'ligne_releves']) {
    try {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN supprime_le TEXT;`);
    } catch {
      // Colonne deja presente.
    }
  }

  for (const columnName of ['photo_1', 'photo_2', 'photo_3']) {
    try {
      await db.execAsync(`ALTER TABLE chantiers ADD COLUMN ${columnName} TEXT;`);
    } catch {
      // Colonne deja presente.
    }
  }

  try {
    await db.execAsync('ALTER TABLE ligne_releves ADD COLUMN photo TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS metiers_ordre (
        metier_id TEXT PRIMARY KEY NOT NULL,
        ordre INTEGER NOT NULL,
        FOREIGN KEY (metier_id) REFERENCES metiers (id) ON DELETE CASCADE
      );
    `);
  } catch {
    // Table deja presente.
  }
};

export const ensureLocalDatabaseReady = async () => {
  await initLocalDatabase();
  const db = await getLocalDB();
  await ensureSchemaMigrations(db);
  return db;
};