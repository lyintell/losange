-- Ancien modèle (catalogue global + metiers_entreprise) remplacé par le prompt 18 :
-- les gabarits sont dans le code mobile ; les métiers sont créés dans `metiers`
-- avec entreprise_id lors de la présélection admin (terrain-sync preselect_metiers).

DROP TRIGGER IF EXISTS trg_seed_metiers_entreprise ON entreprises;
DROP FUNCTION IF EXISTS seed_metiers_entreprise_for_entreprise();

-- Nettoyage si l'ancienne version de cette migration avait déjà été appliquée.
DELETE FROM metiers_entreprise
WHERE metier_id IN (
  SELECT id FROM metiers WHERE entreprise_id IS NULL
);

DELETE FROM metiers
WHERE entreprise_id IS NULL
  AND id LIKE 'metier-%';
