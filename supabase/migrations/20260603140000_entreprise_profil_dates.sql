-- date_actif_jusqua : fin de validite du compte entreprise
-- date_premier_login : premier login terrain du profil

ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS date_actif_jusqua TIMESTAMPTZ;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS date_premier_login TIMESTAMPTZ;
