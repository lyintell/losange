-- Unifie articles dans ouvrages via ind_article

ALTER TABLE ouvrages ADD COLUMN IF NOT EXISTS ind_article SMALLINT NOT NULL DEFAULT 0 CHECK (ind_article IN (0, 1));
ALTER TABLE ouvrages ADD COLUMN IF NOT EXISTS fournisseur_id TEXT REFERENCES fournisseurs (id) ON DELETE SET NULL;
ALTER TABLE ouvrages ADD COLUMN IF NOT EXISTS photo TEXT;

INSERT INTO ouvrages (
  id, metier_id, entreprise_id, nom, ind_article, fournisseur_id, photo,
  supprime_le, cree_le, mis_a_jour_le, _synced
)
SELECT
  a.id,
  a.metier_id,
  f.entreprise_id,
  a.nom,
  1,
  a.fournisseur_id,
  a.photo,
  a.supprime_le,
  a.cree_le,
  a.mis_a_jour_le,
  a._synced
FROM articles a
JOIN fournisseurs f ON f.id = a.fournisseur_id
WHERE NOT EXISTS (SELECT 1 FROM ouvrages o WHERE o.id = a.id);

INSERT INTO ouvrage_unites (
  id, ouvrage_id, unite_id, prix_unitaire, supprime_le, cree_le, mis_a_jour_le, _synced
)
SELECT
  au.id,
  au.article_id,
  au.unite_id,
  au.prix_unitaire,
  au.supprime_le,
  au.cree_le,
  au.mis_a_jour_le,
  au._synced
FROM article_unites au
WHERE NOT EXISTS (SELECT 1 FROM ouvrage_unites ou WHERE ou.id = au.id);

DROP TABLE IF EXISTS article_unites;
DROP TABLE IF EXISTS articles;
