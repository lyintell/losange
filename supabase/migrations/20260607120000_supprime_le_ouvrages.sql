-- Tombstones pour sync bidirectionnelle des ouvrages modifiables depuis mobile
ALTER TABLE ouvrages ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
ALTER TABLE ouvrage_unites ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;
