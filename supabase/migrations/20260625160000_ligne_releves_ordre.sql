ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY releve_id
      ORDER BY cree_le ASC NULLS LAST, id ASC
    ) - 1 AS next_ordre
  FROM ligne_releves
  WHERE supprime_le IS NULL
)
UPDATE ligne_releves lr
SET ordre = ranked.next_ordre
FROM ranked
WHERE lr.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_ligne_releves_releve_ordre
  ON ligne_releves (releve_id, ordre)
  WHERE supprime_le IS NULL;
