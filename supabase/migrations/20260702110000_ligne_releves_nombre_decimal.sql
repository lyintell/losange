ALTER TABLE ligne_releves
  ALTER COLUMN nombre TYPE DOUBLE PRECISION USING nombre::double precision;
