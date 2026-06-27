-- Ordre d'affichage d'une section dans un relevé (RDC en 1er, Étage 1 en 2e, etc.)
ALTER TABLE section_releves ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS idx_section_releves_releve;

CREATE INDEX IF NOT EXISTS idx_section_releves_releve_ordre
  ON section_releves (releve_id, ordre)
  WHERE supprime_le IS NULL;
