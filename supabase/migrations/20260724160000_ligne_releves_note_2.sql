-- Note secondaire affichée sous le nom d'ouvrage (hors PDF relevé).
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS note_2 TEXT;
