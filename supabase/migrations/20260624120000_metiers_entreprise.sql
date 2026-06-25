ALTER TABLE metiers ADD COLUMN IF NOT EXISTS entreprise_id TEXT REFERENCES entreprises (id) ON DELETE CASCADE;
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1));

CREATE TABLE IF NOT EXISTS metiers_entreprise (
  entreprise_id TEXT NOT NULL REFERENCES entreprises (id) ON DELETE CASCADE,
  metier_id TEXT NOT NULL REFERENCES metiers (id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  supprime_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  _synced SMALLINT NOT NULL DEFAULT 1 CHECK (_synced IN (0, 1)),
  PRIMARY KEY (entreprise_id, metier_id)
);

CREATE INDEX IF NOT EXISTS idx_metiers_entreprise_entreprise
  ON metiers_entreprise (entreprise_id)
  WHERE supprime_le IS NULL;

CREATE INDEX IF NOT EXISTS idx_metiers_entreprise_custom
  ON metiers (entreprise_id)
  WHERE entreprise_id IS NOT NULL AND supprime_le IS NULL;
