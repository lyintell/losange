-- Tombstones pour sync bidirectionnelle (suppression logique)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
ALTER TABLE releves ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
