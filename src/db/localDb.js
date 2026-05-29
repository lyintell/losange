import * as SQLite from 'expo-sqlite';

let dbInstance = null;
let dbInitPromise = null;

export const getLocalDB = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('losange_final.db');
  return dbInstance;
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
      ind_unitaire INTEGER NOT NULL DEFAULT 1 CHECK (ind_unitaire IN (0, 1)),
      ind_dimension INTEGER NOT NULL DEFAULT 0 CHECK (ind_dimension IN (0, 1)), -- 1 pour True, 0 pour False
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
      date_facture TEXT,
      total_ht_facture REAL DEFAULT 0.0,
      tva_facture REAL DEFAULT 18.0,
      total_ttc_facture REAL DEFAULT 0.0,
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
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (releve_id) REFERENCES releves (id) ON DELETE CASCADE,
      FOREIGN KEY (ouvrage_unite_id) REFERENCES ouvrage_unites (id) ON DELETE RESTRICT
    );
  `);

  console.log("🚀 Schéma Draw.io complet, épuré et initialisé avec succès dans SQLite !");
  })();

  return dbInitPromise;
};

export const ensureLocalDatabaseReady = async () => {
  await initLocalDatabase();
  return getLocalDB();
};