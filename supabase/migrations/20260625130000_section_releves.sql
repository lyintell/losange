-- Liaison many-to-many : un relevé peut avoir plusieurs sections, une section peut être dans plusieurs relevés.
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
