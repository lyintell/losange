-- Prompts 17-18 : flags onboarding + métiers rattachés à l'entreprise (table metiers).

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS ind_admin_connecte_mobile SMALLINT NOT NULL DEFAULT 0
    CHECK (ind_admin_connecte_mobile IN (0, 1));

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS ind_metiers_preselectionnes SMALLINT NOT NULL DEFAULT 0
    CHECK (ind_metiers_preselectionnes IN (0, 1));

ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ind_actif SMALLINT NOT NULL DEFAULT 1 CHECK (ind_actif IN (0, 1));
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS ind_default SMALLINT NOT NULL DEFAULT 0 CHECK (ind_default IN (0, 1));

UPDATE entreprises e
SET ind_metiers_preselectionnes = 1
WHERE ind_metiers_preselectionnes = 0
  AND EXISTS (
    SELECT 1 FROM metiers m
    WHERE m.entreprise_id = e.id AND m.supprime_le IS NULL
  );
