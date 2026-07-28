-- Ordre des métiers au sein d'une section d'un relevé (persisté sur chaque ligne).
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS metier_ordre INTEGER NOT NULL DEFAULT 0;
