-- Marqueurs temporels changement tier Gratuit <-> Pro
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS pro_activated_le TIMESTAMPTZ;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS pro_downgraded_le TIMESTAMPTZ;
