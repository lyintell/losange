-- telephone_1 optionnel pour les fournisseurs

ALTER TABLE fournisseurs
  ALTER COLUMN telephone_1 DROP NOT NULL;
