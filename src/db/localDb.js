import * as SQLite from 'expo-sqlite';

let dbInstance = null;
let dbInitPromise = null;
let dbQueue = Promise.resolve();

export const getLocalDB = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('losange_final.db');
  return dbInstance;
};

export const tableHasColumn = async (db, tableName, columnName) => {
  const rows = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
  return rows.some((row) => row.name === columnName);
};

/** Met a jour la table unites (nom_unite, formule, suppression ind_unitaire). */
const migrateUnitesToCurrentSchema = async (db) => {
  const tableExists = await db.getFirstAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'unites';`
  );
  if (!tableExists) return;

  const hasNomUnite = await tableHasColumn(db, 'unites', 'nom_unite');
  const hasFormule = await tableHasColumn(db, 'unites', 'formule');
  const hasNom = await tableHasColumn(db, 'unites', 'nom');
  const hasSymbole = await tableHasColumn(db, 'unites', 'symbole');
  const hasIndDimension = await tableHasColumn(db, 'unites', 'ind_dimension');
  const hasIndUnitaire = await tableHasColumn(db, 'unites', 'ind_unitaire');

  const needsRebuild =
    !hasNomUnite ||
    !hasFormule ||
    !hasNom ||
    !hasIndDimension ||
    hasSymbole ||
    hasIndUnitaire;

  if (!needsRebuild) return;

  const formuleExpr = hasFormule
    ? 'formule'
    : hasNom
      ? 'nom'
      : hasSymbole
        ? "COALESCE(symbole, 'l*h')"
        : "'l*h'";
  const nomExpr = hasNom
    ? 'nom'
    : hasSymbole
      ? 'symbole'
      : hasFormule
        ? 'formule'
        : "'Unité'";
  const nomUniteExpr = hasNomUnite
    ? 'nom_unite'
    : hasSymbole
      ? "substr(COALESCE(symbole, nom, formule, 'u'), 1, 10)"
      : hasNom
        ? "substr(COALESCE(nom, formule, 'u'), 1, 10)"
        : hasFormule
          ? "substr(COALESCE(formule, 'u'), 1, 10)"
          : "'u'";
  const indDimensionExpr = hasIndDimension
    ? 'ind_dimension'
    : hasIndUnitaire
      ? 'ind_unitaire'
      : '0';
  const creeLeExpr = (await tableHasColumn(db, 'unites', 'cree_le')) ? 'cree_le' : "datetime('now')";
  const misAJourLeExpr = (await tableHasColumn(db, 'unites', 'mis_a_jour_le'))
    ? 'mis_a_jour_le'
    : "datetime('now')";

  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.execAsync('DROP TABLE IF EXISTS unites__migrated;');
    await db.execAsync(`
      CREATE TABLE unites__migrated (
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
      INSERT INTO unites__migrated (id, formule, nom, nom_unite, ind_dimension, cree_le, mis_a_jour_le)
      SELECT
        id,
        ${formuleExpr},
        ${nomExpr},
        ${nomUniteExpr},
        ${indDimensionExpr},
        ${creeLeExpr},
        ${misAJourLeExpr}
      FROM unites;
    `);
    await db.execAsync('DROP TABLE unites;');
    await db.execAsync('ALTER TABLE unites__migrated RENAME TO unites;');
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
};

/** @deprecated Utiliser migrateUnitesToCurrentSchema */
const migrateUnitesDropIndUnitaire = async (db) => {
  await migrateUnitesToCurrentSchema(db);
};

const migrateArticlesIntoOuvrages = async (db) => {
  const ouvragesExists = await db.getFirstAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ouvrages';`
  );
  if (!ouvragesExists) return;

  if (!(await tableHasColumn(db, 'ouvrages', 'ind_article'))) {
    await db.execAsync(
      'ALTER TABLE ouvrages ADD COLUMN ind_article INTEGER NOT NULL DEFAULT 0 CHECK (ind_article IN (0, 1));'
    );
  }
  if (!(await tableHasColumn(db, 'ouvrages', 'fournisseur_id'))) {
    await db.execAsync('ALTER TABLE ouvrages ADD COLUMN fournisseur_id TEXT;');
  }
  if (!(await tableHasColumn(db, 'ouvrages', 'photo'))) {
    await db.execAsync('ALTER TABLE ouvrages ADD COLUMN photo TEXT;');
  }

  const articlesExists = await db.getFirstAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles';`
  );
  if (!articlesExists) return;

  const fournisseursExists = await db.getFirstAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'fournisseurs';`
  );
  if (!fournisseursExists) return;

  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.execAsync(`
      INSERT INTO ouvrages (
        id, metier_id, entreprise_id, nom, ind_article, fournisseur_id, photo,
        supprime_le, cree_le, mis_a_jour_le, _synced
      )
      SELECT
        a.id,
        a.metier_id,
        f.entreprise_id,
        a.nom,
        1,
        a.fournisseur_id,
        a.photo,
        a.supprime_le,
        a.cree_le,
        a.mis_a_jour_le,
        a._synced
      FROM articles a
      JOIN fournisseurs f ON f.id = a.fournisseur_id
      WHERE NOT EXISTS (SELECT 1 FROM ouvrages o WHERE o.id = a.id);
    `);

    const articleUnitesExists = await db.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'article_unites';`
    );
    if (articleUnitesExists) {
      await db.execAsync(`
        INSERT INTO ouvrage_unites (
          id, ouvrage_id, unite_id, prix_unitaire, supprime_le, cree_le, mis_a_jour_le, _synced
        )
        SELECT
          au.id,
          au.article_id,
          au.unite_id,
          au.prix_unitaire,
          au.supprime_le,
          au.cree_le,
          au.mis_a_jour_le,
          au._synced
        FROM article_unites au
        WHERE NOT EXISTS (SELECT 1 FROM ouvrage_unites ou WHERE ou.id = au.id);
      `);
      await db.execAsync('DROP TABLE IF EXISTS article_unites;');
    }

    await db.execAsync('DROP TABLE IF EXISTS articles;');
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
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');

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
      pro_activated_le TEXT,
      pro_downgraded_le TEXT,
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
      entreprise_id TEXT,
      ordre INTEGER NOT NULL DEFAULT 0,
      ind_actif INTEGER NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1)),
      ind_default INTEGER NOT NULL DEFAULT 0 CHECK (ind_default IN (0, 1)),
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    -- 5b. TABLE SECTION (dimensions par zone : RDC, salon, étage, etc.)
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY NOT NULL,
      nom TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    -- 6. TABLE FOURNISSEUR
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id TEXT PRIMARY KEY NOT NULL,
      metier_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone_1 TEXT,
      telephone_2 TEXT,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (metier_id) REFERENCES metiers (id) ON DELETE CASCADE,
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
    );

    -- 7. TABLE OUVRAGE
    CREATE TABLE IF NOT EXISTS ouvrages (
      id TEXT PRIMARY KEY NOT NULL,
      metier_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      nom TEXT NOT NULL,
      nom_devis TEXT,
      ind_article INTEGER NOT NULL DEFAULT 0 CHECK (ind_article IN (0, 1)),
      fournisseur_id TEXT,
      photo TEXT,
      supprime_le TEXT,
      ind_actif INTEGER NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1)),
      ordre INTEGER NOT NULL DEFAULT 0,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (metier_id) REFERENCES metiers (id) ON DELETE CASCADE,
      FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs (id) ON DELETE SET NULL
    );

    -- 8. TABLE UNITE
    CREATE TABLE IF NOT EXISTS unites (
      id TEXT PRIMARY KEY NOT NULL,
      formule TEXT NOT NULL,
      nom TEXT NOT NULL,
      nom_unite TEXT NOT NULL CHECK (length(nom_unite) <= 10),
      ind_dimension INTEGER NOT NULL DEFAULT 0 CHECK (ind_dimension IN (0, 1)),
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now'))
    );

    -- 9. TABLE OUVRAGEUNITE (Épurée : entreprise_id retirée)
    CREATE TABLE IF NOT EXISTS ouvrage_unites (
      id TEXT PRIMARY KEY NOT NULL,
      ouvrage_id TEXT NOT NULL,
      unite_id TEXT NOT NULL,
      prix_unitaire REAL NOT NULL DEFAULT 0.0,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (ouvrage_id) REFERENCES ouvrages (id) ON DELETE CASCADE,
      FOREIGN KEY (unite_id) REFERENCES unites (id) ON DELETE CASCADE
    );

    -- 10. TABLE RELEVE
    CREATE TABLE IF NOT EXISTS releves (
      id TEXT PRIMARY KEY NOT NULL,
      chantier_id TEXT NOT NULL,
      prise_par_id TEXT,
      date_facture TEXT DEFAULT (date('now')),
      total_ht_facture REAL DEFAULT 0.0,
      tva_facture REAL DEFAULT 18.0,
      total_ttc_facture REAL DEFAULT 0.0,
      remise REAL NOT NULL DEFAULT 0.0,
      ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'E' CHECK (status IN ('E', 'V', 'N')),
      note TEXT,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (chantier_id) REFERENCES chantiers (id) ON DELETE CASCADE,
      FOREIGN KEY (prise_par_id) REFERENCES profils (id) ON DELETE SET NULL
    );

    -- 10b. TABLE SECTION_RELEVE (liaison section ↔ relevé)
    CREATE TABLE IF NOT EXISTS section_releves (
      id TEXT PRIMARY KEY NOT NULL,
      section_id TEXT NOT NULL,
      releve_id TEXT NOT NULL,
      ordre INTEGER NOT NULL DEFAULT 0,
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE,
      FOREIGN KEY (releve_id) REFERENCES releves (id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_section_releves_pair
      ON section_releves (section_id, releve_id)
      WHERE supprime_le IS NULL;

    CREATE INDEX IF NOT EXISTS idx_section_releves_releve_ordre
      ON section_releves (releve_id, ordre)
      WHERE supprime_le IS NULL;

    -- 11. TABLE LIGNERELEVE
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
      section_id TEXT,
      ordre INTEGER NOT NULL DEFAULT 0,
      ind_complete INTEGER NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1)),
      supprime_le TEXT,
      cree_le TEXT DEFAULT (datetime('now')),
      mis_a_jour_le TEXT DEFAULT (datetime('now')),
      _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
      FOREIGN KEY (releve_id) REFERENCES releves (id) ON DELETE CASCADE,
      FOREIGN KEY (ouvrage_unite_id) REFERENCES ouvrage_unites (id) ON DELETE RESTRICT,
      FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ligne_releves_releve_ordre
      ON ligne_releves (releve_id, ordre)
      WHERE supprime_le IS NULL;

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

    CREATE TABLE IF NOT EXISTS pending_cloud_deletes (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      entreprise_id TEXT NOT NULL,
      PRIMARY KEY (table_name, record_id)
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

  try {
    await db.execAsync('ALTER TABLE releves ADD COLUMN remise REAL NOT NULL DEFAULT 0.0;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE releves ADD COLUMN ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      "ALTER TABLE releves ADD COLUMN status TEXT NOT NULL DEFAULT 'E' CHECK (status IN ('E', 'V', 'N'));"
    );
  } catch {
    // Colonne deja presente.
  }

  await migrateUnitesDropIndUnitaire(db);

  for (const tableName of [
    'clients',
    'chantiers',
    'releves',
    'ligne_releves',
    'ouvrages',
    'ouvrage_unites',
    'fournisseurs',
  ]) {
    try {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN supprime_le TEXT;`);
    } catch {
      // Colonne deja presente.
    }
  }

  await migrateArticlesIntoOuvrages(db);
  await ensureSchemaMigrations(db);
  })();

  return dbInitPromise;
};

const ensureRelevesColumns = async (db) => {
  const tableExists = await db.getFirstAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'releves';`
  );
  if (!tableExists) return;

  if (!(await tableHasColumn(db, 'releves', 'remise'))) {
    await db.execAsync('ALTER TABLE releves ADD COLUMN remise REAL NOT NULL DEFAULT 0.0;');
  }

  if (!(await tableHasColumn(db, 'releves', 'ind_tva'))) {
    await db.execAsync(
      'ALTER TABLE releves ADD COLUMN ind_tva INTEGER NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1));'
    );
  }

  if (!(await tableHasColumn(db, 'releves', 'status'))) {
    await db.execAsync(
      "ALTER TABLE releves ADD COLUMN status TEXT NOT NULL DEFAULT 'E' CHECK (status IN ('E', 'V', 'N'));"
    );
  }
};

const ensureSchemaMigrations = async (db) => {
  await ensureRelevesColumns(db);

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

  for (const tableName of [
    'clients',
    'chantiers',
    'releves',
    'ligne_releves',
    'ouvrages',
    'ouvrage_unites',
    'fournisseurs',
  ]) {
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

  for (const columnName of ['entreprise_id', 'supprime_le']) {
    try {
      await db.execAsync(`ALTER TABLE metiers ADD COLUMN ${columnName} TEXT;`);
    } catch {
      // Colonne deja presente.
    }
  }

  try {
    await db.execAsync(
      'ALTER TABLE metiers ADD COLUMN _synced INTEGER NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE metiers ADD COLUMN ind_actif INTEGER NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('DROP TABLE IF EXISTS metiers_entreprise;');
  } catch {
    // Table absente ou deja supprimee.
  }

  try {
    await db.execAsync(
      'ALTER TABLE ouvrages ADD COLUMN ind_actif INTEGER NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE ouvrages ADD COLUMN ordre INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE ouvrages ADD COLUMN nom_devis TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    const ordreSeededRow = await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM ouvrages WHERE ordre > 0;'
    );
    if (Number(ordreSeededRow?.count) === 0) {
      await db.execAsync(`
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY metier_id, entreprise_id
              ORDER BY nom ASC, id ASC
            ) - 1 AS new_ordre
          FROM ouvrages
          WHERE supprime_le IS NULL OR supprime_le = ''
        )
        UPDATE ouvrages
        SET ordre = (
          SELECT new_ordre FROM ranked WHERE ranked.id = ouvrages.id
        )
        WHERE id IN (SELECT id FROM ranked);
      `);
    }
  } catch {
    // Backfill ordre ignore si indisponible.
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

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_cloud_deletes (
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        entreprise_id TEXT NOT NULL,
        PRIMARY KEY (table_name, record_id)
      );
    `);
  } catch {
    // Table deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE entreprises ADD COLUMN pro_activated_le TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE entreprises ADD COLUMN pro_downgraded_le TEXT;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_admin_connecte_mobile INTEGER NOT NULL DEFAULT 0 CHECK (ind_admin_connecte_mobile IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE entreprises ADD COLUMN ind_metiers_preselectionnes INTEGER NOT NULL DEFAULT 0 CHECK (ind_metiers_preselectionnes IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync('ALTER TABLE metiers ADD COLUMN ordre INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(
      'ALTER TABLE metiers ADD COLUMN ind_default INTEGER NOT NULL DEFAULT 0 CHECK (ind_default IN (0, 1));'
    );
  } catch {
    // Colonne deja presente.
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY NOT NULL,
        nom TEXT NOT NULL,
        entreprise_id TEXT NOT NULL,
        supprime_le TEXT,
        cree_le TEXT DEFAULT (datetime('now')),
        mis_a_jour_le TEXT DEFAULT (datetime('now')),
        _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
        FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
      );
    `);
  } catch {
    // Table deja presente.
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS section_releves (
        id TEXT PRIMARY KEY NOT NULL,
        section_id TEXT NOT NULL,
        releve_id TEXT NOT NULL,
        supprime_le TEXT,
        cree_le TEXT DEFAULT (datetime('now')),
        mis_a_jour_le TEXT DEFAULT (datetime('now')),
        _synced INTEGER NOT NULL DEFAULT 0 CHECK (_synced IN (0, 1)),
        FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE,
        FOREIGN KEY (releve_id) REFERENCES releves (id) ON DELETE CASCADE
      );
    `);
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_section_releves_pair
        ON section_releves (section_id, releve_id)
        WHERE supprime_le IS NULL;
    `);
  } catch {
    // Table deja presente.
  }

  if (!(await tableHasColumn(db, 'section_releves', 'ordre'))) {
    try {
      await db.execAsync('ALTER TABLE section_releves ADD COLUMN ordre INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // Colonne deja presente.
    }
  }

  try {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_section_releves_releve_ordre
        ON section_releves (releve_id, ordre)
        WHERE supprime_le IS NULL;
    `);
  } catch {
    // Index deja present ou colonne indisponible.
  }

  if (!(await tableHasColumn(db, 'ligne_releves', 'section_id'))) {
    try {
      await db.execAsync(
        'ALTER TABLE ligne_releves ADD COLUMN section_id TEXT REFERENCES sections (id) ON DELETE SET NULL;'
      );
    } catch {
      // Colonne deja presente.
    }
  }

  if (!(await tableHasColumn(db, 'ligne_releves', 'ordre'))) {
    try {
      await db.execAsync('ALTER TABLE ligne_releves ADD COLUMN ordre INTEGER NOT NULL DEFAULT 0;');
      await db.execAsync(`
        UPDATE ligne_releves
        SET ordre = (
          SELECT COUNT(*)
          FROM ligne_releves lr2
          WHERE lr2.releve_id = ligne_releves.releve_id
            AND (lr2.supprime_le IS NULL OR lr2.supprime_le = '')
            AND (
              lr2.cree_le < ligne_releves.cree_le
              OR (lr2.cree_le = ligne_releves.cree_le AND lr2.id < ligne_releves.id)
            )
        )
        WHERE supprime_le IS NULL OR supprime_le = '';
      `);
    } catch {
      // Colonne deja presente.
    }
  }

  try {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_ligne_releves_releve_ordre
        ON ligne_releves (releve_id, ordre)
        WHERE supprime_le IS NULL;
    `);
  } catch {
    // Index deja present.
  }

  await ensureRelevesColumns(db);
  await migrateUnitesToCurrentSchema(db);
  await migrateArticlesIntoOuvrages(db);
};

export const ensureLocalDatabaseReady = async () => {
  await initLocalDatabase();
  return getLocalDB();
};

/** Sérialise les écritures / transactions pour éviter "database is locked". */
export const runWithLocalDatabase = async (work) => {
  const operation = async () => {
    await initLocalDatabase();
    const db = await getLocalDB();
    return work(db);
  };

  const result = dbQueue.then(operation, operation);
  dbQueue = result.then(
    () => {},
    () => {}
  );
  return result;
};