-- Origine terrain + traçabilité des modifications après création.
ALTER TABLE releves ADD COLUMN IF NOT EXISTS ind_dimension_terrain SMALLINT NOT NULL DEFAULT 0 CHECK (ind_dimension_terrain IN (0, 1));
ALTER TABLE releves ADD COLUMN IF NOT EXISTS ind_changement SMALLINT NOT NULL DEFAULT 0 CHECK (ind_changement IN (0, 1));
ALTER TABLE releves ADD COLUMN IF NOT EXISTS id_qui_change TEXT;
