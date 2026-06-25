-- Fournisseurs, articles et article_unites (catalogue matériaux)

CREATE TABLE IF NOT EXISTS fournisseurs (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  telephone_1 TEXT NOT NULL,
  telephone_2 TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  fournisseur_id TEXT NOT NULL REFERENCES fournisseurs (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo TEXT,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

CREATE TABLE IF NOT EXISTS article_unites (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  unite_id TEXT NOT NULL REFERENCES unites (id) ON DELETE CASCADE,
  prix_unitaire DOUBLE PRECISION NOT NULL DEFAULT 0,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1))
);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['fournisseurs', 'articles', 'article_unites']
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
