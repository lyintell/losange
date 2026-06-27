-- Remise sur relevé (montant ou pourcentage selon usage métier)
ALTER TABLE releves ADD COLUMN IF NOT EXISTS remise DOUBLE PRECISION NOT NULL DEFAULT 0;
