-- Migration: ind_unitaire supprime (doublon de ind_dimension)
ALTER TABLE unites DROP COLUMN IF EXISTS ind_unitaire;
