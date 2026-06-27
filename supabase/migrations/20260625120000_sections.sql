-- Sections chantier par entreprise (RDC, salon, étage, etc.)
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
