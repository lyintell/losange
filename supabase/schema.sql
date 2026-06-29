-- Losange - schema Supabase (PostgreSQL)
-- Executer ce script dans l'editeur SQL Supabase avant d'utiliser l'ecran admin.

CREATE TABLE IF NOT EXISTS entreprises (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone_1 TEXT NOT NULL,
  telephone_2 TEXT,
  adresse TEXT,
  logo TEXT,
  ind_pro SMALLINT NOT NULL DEFAULT 0 CHECK (ind_pro IN (0, 1)),
  ind_active SMALLINT NOT NULL DEFAULT 1 CHECK (ind_active IN (0, 1)),
  ind_tva SMALLINT NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1)),
  date_actif_jusqua TIMESTAMPTZ,
  pro_activated_le TIMESTAMPTZ,
  pro_downgraded_le TIMESTAMPTZ,
  ind_admin_connecte_mobile SMALLINT NOT NULL DEFAULT 0 CHECK (ind_admin_connecte_mobile IN (0, 1)),
  ind_metiers_preselectionnes SMALLINT NOT NULL DEFAULT 0 CHECK (ind_metiers_preselectionnes IN (0, 1)),
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

-- Migration bases Supabase deja deployees
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_pro SMALLINT NOT NULL DEFAULT 0 CHECK (ind_pro IN (0, 1));
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_active SMALLINT NOT NULL DEFAULT 1 CHECK (ind_active IN (0, 1));
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS date_actif_jusqua TIMESTAMPTZ;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_tva SMALLINT NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1));
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS pro_activated_le TIMESTAMPTZ;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS pro_downgraded_le TIMESTAMPTZ;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_admin_connecte_mobile SMALLINT NOT NULL DEFAULT 0 CHECK (ind_admin_connecte_mobile IN (0, 1));
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_metiers_preselectionnes SMALLINT NOT NULL DEFAULT 0 CHECK (ind_metiers_preselectionnes IN (0, 1));

CREATE TABLE IF NOT EXISTS profils (
  id TEXT PRIMARY KEY,
  entreprise_id TEXT REFERENCES entreprises (id) ON DELETE SET NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone_1 TEXT NOT NULL,
  telephone_2 TEXT,
  role TEXT NOT NULL DEFAULT 'A' CHECK (role IN ('A', 'C', 'S', 'T')),
  identifiant TEXT UNIQUE,
  mot_de_passe TEXT,
  date_premier_login TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

ALTER TABLE profils ADD COLUMN IF NOT EXISTS identifiant TEXT UNIQUE;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS mot_de_passe TEXT;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS date_premier_login TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone_1 TEXT NOT NULL,
  telephone_2 TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS chantiers (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  chef_chantier_id TEXT REFERENCES profils (id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  adresse TEXT,
  responsable TEXT,
  status TEXT NOT NULL DEFAULT 'D' CHECK (status IN ('D', 'V', 'E', 'X', 'Z')),
  notes TEXT,
  photo_1 TEXT,
  photo_2 TEXT,
  photo_3 TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_1 TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_2 TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_3 TEXT;

CREATE TABLE IF NOT EXISTS metiers (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  abbrev TEXT,
  icon TEXT,
  entreprise_id TEXT REFERENCES entreprises (id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1)),
  ind_default SMALLINT NOT NULL DEFAULT 0 CHECK (ind_default IN (0, 1)),
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ind_default SMALLINT NOT NULL DEFAULT 0 CHECK (ind_default IN (0, 1));

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_sections_entreprise
  ON sections (entreprise_id)
  WHERE supprime_le IS NULL;

DROP TABLE IF EXISTS metiers_entreprise CASCADE;

CREATE TABLE IF NOT EXISTS fournisseurs (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  telephone_1 TEXT,
  telephone_2 TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS ouvrages (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  nom_devis TEXT,
  ind_article SMALLINT NOT NULL DEFAULT 0 CHECK (ind_article IN (0, 1)),
  fournisseur_id TEXT REFERENCES fournisseurs (id) ON DELETE SET NULL,
  photo TEXT,
  supprime_le TIMESTAMPTZ,
  ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1)),
  ordre INTEGER NOT NULL DEFAULT 0,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS unites (
  id TEXT PRIMARY KEY,
  formule TEXT NOT NULL,
  nom TEXT NOT NULL,
  nom_unite TEXT NOT NULL CHECK (char_length(nom_unite) <= 10),
  ind_dimension SMALLINT NOT NULL DEFAULT 0 CHECK (ind_dimension IN (0, 1)),
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ouvrage_unites (
  id TEXT PRIMARY KEY,
  ouvrage_id TEXT NOT NULL REFERENCES ouvrages (id) ON DELETE CASCADE,
  unite_id TEXT NOT NULL REFERENCES unites (id) ON DELETE CASCADE,
  prix_unitaire DOUBLE PRECISION NOT NULL DEFAULT 0,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS releves (
  id TEXT PRIMARY KEY,
  chantier_id TEXT NOT NULL REFERENCES chantiers (id) ON DELETE CASCADE,
  prise_par_id TEXT REFERENCES profils (id) ON DELETE SET NULL,
  date_facture TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD'),
  total_ht_facture DOUBLE PRECISION DEFAULT 0,
  tva_facture DOUBLE PRECISION DEFAULT 18,
  total_ttc_facture DOUBLE PRECISION DEFAULT 0,
  remise DOUBLE PRECISION NOT NULL DEFAULT 0,
  ind_tva SMALLINT NOT NULL DEFAULT 0 CHECK (ind_tva IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'E' CHECK (status IN ('E', 'V', 'N')),
  note TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS section_releves (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
  releve_id TEXT NOT NULL REFERENCES releves (id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_section_releves_pair
  ON section_releves (section_id, releve_id)
  WHERE supprime_le IS NULL;

CREATE INDEX IF NOT EXISTS idx_section_releves_releve_ordre
  ON section_releves (releve_id, ordre)
  WHERE supprime_le IS NULL;

CREATE INDEX IF NOT EXISTS idx_section_releves_section
  ON section_releves (section_id)
  WHERE supprime_le IS NULL;

CREATE TABLE IF NOT EXISTS ligne_releves (
  id TEXT PRIMARY KEY,
  releve_id TEXT NOT NULL REFERENCES releves (id) ON DELETE CASCADE,
  ouvrage_unite_id TEXT NOT NULL REFERENCES ouvrage_unites (id) ON DELETE RESTRICT,
  largeur DOUBLE PRECISION,
  hauteur DOUBLE PRECISION,
  profondeur DOUBLE PRECISION,
  nombre INTEGER DEFAULT 1,
  quantite DOUBLE PRECISION NOT NULL DEFAULT 1,
  prix_unitaire_applique DOUBLE PRECISION NOT NULL,
  montant DOUBLE PRECISION NOT NULL,
  note TEXT,
  photo TEXT,
  section_id TEXT REFERENCES sections (id) ON DELETE SET NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  ind_complete SMALLINT NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1)),
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections (id) ON DELETE SET NULL;
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ligne_releves_releve_ordre
  ON ligne_releves (releve_id, ordre)
  WHERE supprime_le IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'terrain-files',
  'terrain-files',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques permissives pour le developpement (cle anon).
-- A remplacer par une authentification Supabase en production.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'entreprises',
    'profils',
    'clients',
    'chantiers',
    'metiers',
    'sections',
    'ouvrages',
    'unites',
    'ouvrage_unites',
    'fournisseurs',
    'releves',
    'section_releves',
    'ligne_releves'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%I" ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE POLICY "anon_all_%I" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      table_name,
      table_name
    );
  END LOOP;
END $$;
