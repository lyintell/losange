-- P.R appliqué (optionnel) sur ligne de relevé, miroir de P.U appliqué.
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS prix_revient_applique DOUBLE PRECISION;
