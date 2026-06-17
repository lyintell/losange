-- Migration: note + ind_complete sur ligne_releves
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS ind_complete SMALLINT NOT NULL DEFAULT 0 CHECK (ind_complete IN (0, 1));
