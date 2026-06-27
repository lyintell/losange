ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ligne_releves_section
  ON ligne_releves (section_id)
  WHERE supprime_le IS NULL;
