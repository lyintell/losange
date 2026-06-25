ALTER TABLE metiers_entreprise
  ADD COLUMN IF NOT EXISTS ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));

ALTER TABLE ouvrages
  ADD COLUMN IF NOT EXISTS ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));

UPDATE metiers_entreprise SET ind_actif = 1 WHERE ind_actif IS NULL;
UPDATE ouvrages SET ind_actif = 1 WHERE ind_actif IS NULL;
