-- Section par defaut pour chaque entreprise (choix mobile : toujours en tete).
INSERT INTO sections (id, nom, entreprise_id, cree_le, mis_a_jour_le, _synced)
SELECT
  gen_random_uuid()::text,
  'Pas de section',
  e.id,
  now(),
  now(),
  1
FROM entreprises e
WHERE NOT EXISTS (
  SELECT 1
  FROM sections s
  WHERE s.entreprise_id = e.id
    AND lower(trim(s.nom)) = lower('Pas de section')
    AND s.supprime_le IS NULL
);
