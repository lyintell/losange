ALTER TABLE ouvrages
  ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY metier_id, entreprise_id
      ORDER BY nom ASC, id ASC
    ) - 1 AS new_ordre
  FROM ouvrages
  WHERE supprime_le IS NULL
)
UPDATE ouvrages o
SET ordre = ranked.new_ordre
FROM ranked
WHERE o.id = ranked.id;
