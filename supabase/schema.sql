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
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

-- Migration bases Supabase deja deployees
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_pro SMALLINT NOT NULL DEFAULT 0 CHECK (ind_pro IN (0, 1));
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ind_active SMALLINT NOT NULL DEFAULT 1 CHECK (ind_active IN (0, 1));

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
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

ALTER TABLE profils ADD COLUMN IF NOT EXISTS identifiant TEXT UNIQUE;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS mot_de_passe TEXT;

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
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS metiers (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  abbrev TEXT,
  icon TEXT,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ouvrages (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
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
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS releves (
  id TEXT PRIMARY KEY,
  chantier_id TEXT NOT NULL REFERENCES chantiers (id) ON DELETE CASCADE,
  prise_par_id TEXT REFERENCES profils (id) ON DELETE SET NULL,
  date_facture TEXT,
  total_ht_facture DOUBLE PRECISION DEFAULT 0,
  tva_facture DOUBLE PRECISION DEFAULT 18,
  total_ttc_facture DOUBLE PRECISION DEFAULT 0,
  note TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

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
  ind_complete SMALLINT NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1)),
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

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
    'ouvrages',
    'unites',
    'ouvrage_unites',
    'releves',
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
