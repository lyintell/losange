-- Catalogue global des métiers par défaut (nouveaux et comptes existants).

INSERT INTO metiers (id, nom, abbrev, entreprise_id, cree_le, mis_a_jour_le, _synced)
VALUES
  ('metier-menuiserie-alu', 'Menuiserie alu', 'MAL', NULL, now(), now(), 1),
  ('metier-menuiserie-metallique', 'Menuiserie métallique', 'MME', NULL, now(), now(), 1),
  ('metier-vitrage-verre', 'Vitrage et verre', 'VVE', NULL, now(), now(), 1),
  ('metier-gros-oeuvres', 'Gros oeuvres', 'GOE', NULL, now(), now(), 1),
  ('metier-peinture', 'Peinture', 'PEI', NULL, now(), now(), 1),
  ('metier-carrelage', 'Carrélage', 'CAR', NULL, now(), now(), 1),
  ('metier-electricite-clim', 'Électricité et clim', 'ELC', NULL, now(), now(), 1),
  ('metier-courant-faible', 'Courant faible', 'CFA', NULL, now(), now(), 1),
  ('metier-plomberie-sanitaire', 'Plomberie et sanitaire', 'PLS', NULL, now(), now(), 1),
  ('metier-etancheite-toiture', 'Étanchéité et toiture', 'ETO', NULL, now(), now(), 1),
  ('metier-divers', 'Divers', 'DIV', NULL, now(), now(), 1)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  abbrev = EXCLUDED.abbrev,
  entreprise_id = NULL,
  supprime_le = NULL,
  mis_a_jour_le = now();

INSERT INTO metiers_entreprise (entreprise_id, metier_id, ordre, ind_actif, cree_le, mis_a_jour_le, _synced)
SELECT e.id, d.metier_id, d.ordre, 1, now(), now(), 1
FROM entreprises e
CROSS JOIN (
  VALUES
    ('metier-menuiserie-alu', 0),
    ('metier-menuiserie-metallique', 1),
    ('metier-vitrage-verre', 2),
    ('metier-gros-oeuvres', 3),
    ('metier-peinture', 4),
    ('metier-carrelage', 5),
    ('metier-electricite-clim', 6),
    ('metier-courant-faible', 7),
    ('metier-plomberie-sanitaire', 8),
    ('metier-etancheite-toiture', 9),
    ('metier-divers', 10)
) AS d(metier_id, ordre)
ON CONFLICT (entreprise_id, metier_id) DO NOTHING;

CREATE OR REPLACE FUNCTION seed_metiers_entreprise_for_entreprise()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO metiers_entreprise (entreprise_id, metier_id, ordre, ind_actif, cree_le, mis_a_jour_le, _synced)
  VALUES
    (NEW.id, 'metier-menuiserie-alu', 0, 1, now(), now(), 1),
    (NEW.id, 'metier-menuiserie-metallique', 1, 1, now(), now(), 1),
    (NEW.id, 'metier-vitrage-verre', 2, 1, now(), now(), 1),
    (NEW.id, 'metier-gros-oeuvres', 3, 1, now(), now(), 1),
    (NEW.id, 'metier-peinture', 4, 1, now(), now(), 1),
    (NEW.id, 'metier-carrelage', 5, 1, now(), now(), 1),
    (NEW.id, 'metier-electricite-clim', 6, 1, now(), now(), 1),
    (NEW.id, 'metier-courant-faible', 7, 1, now(), now(), 1),
    (NEW.id, 'metier-plomberie-sanitaire', 8, 1, now(), now(), 1),
    (NEW.id, 'metier-etancheite-toiture', 9, 1, now(), now(), 1),
    (NEW.id, 'metier-divers', 10, 1, now(), now(), 1)
  ON CONFLICT (entreprise_id, metier_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_metiers_entreprise ON entreprises;

CREATE TRIGGER trg_seed_metiers_entreprise
AFTER INSERT ON entreprises
FOR EACH ROW
EXECUTE FUNCTION seed_metiers_entreprise_for_entreprise();
