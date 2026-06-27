-- =============================================================================
-- LOSANGE — Flush complet des DONNEES Supabase (schema conserve)
-- =============================================================================
-- Pour un reset SCHEMA ZERO (drop tables + schema.sql), voir :
--   supabase/scripts/nuclear_reset.sql
--   supabase/scripts/nuclear_mark_migrations.sql
--   supabase/scripts/nuclear_reset.ps1
-- =============================================================================
-- ATTENTION : irreversible. A executer sur le projet Supabase cible uniquement.
--
-- Supprime :
--   - tous les fichiers du bucket storage "terrain-files"
--   - toutes les lignes des tables metier Losange
--   - tables legacy (articles, metiers_entreprise) si encore presentes
--
-- Ne supprime PAS :
--   - le compte master (Y62L : secrets Edge Function, pas en BDD)
--   - le bucket storage lui-meme
--   - l historique des migrations supabase_migrations.schema_migrations
--
-- Apres flush :
--   1. Recreer entreprises + profils via losange-master.expo.app
--   2. Recreer les unites (catalogue global) via Master si besoin
--   3. Mobile : deconnexion + supprimer donnees app / reinstaller Expo Go
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Fichiers terrain (logos, photos chantiers, photos lignes, ouvrages…)
-- ---------------------------------------------------------------------------
DELETE FROM storage.objects
WHERE bucket_id = 'terrain-files';

-- ---------------------------------------------------------------------------
-- 2. Tables legacy (anciennes migrations, si encore la)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.article_unites CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.metiers_entreprise CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Donnees applicatives (ordre + CASCADE entre tables liees)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
  public.ligne_releves,
  public.section_releves,
  public.releves,
  public.ouvrage_unites,
  public.ouvrages,
  public.fournisseurs,
  public.sections,
  public.metiers,
  public.chantiers,
  public.clients,
  public.profils,
  public.entreprises,
  public.unites
RESTART IDENTITY CASCADE;

COMMIT;

-- ---------------------------------------------------------------------------
-- 4. Verification (tous les compteurs doivent etre 0)
-- ---------------------------------------------------------------------------
SELECT 'entreprises' AS table_name, COUNT(*) AS row_count FROM public.entreprises
UNION ALL SELECT 'profils', COUNT(*) FROM public.profils
UNION ALL SELECT 'clients', COUNT(*) FROM public.clients
UNION ALL SELECT 'chantiers', COUNT(*) FROM public.chantiers
UNION ALL SELECT 'metiers', COUNT(*) FROM public.metiers
UNION ALL SELECT 'sections', COUNT(*) FROM public.sections
UNION ALL SELECT 'fournisseurs', COUNT(*) FROM public.fournisseurs
UNION ALL SELECT 'ouvrages', COUNT(*) FROM public.ouvrages
UNION ALL SELECT 'unites', COUNT(*) FROM public.unites
UNION ALL SELECT 'ouvrage_unites', COUNT(*) FROM public.ouvrage_unites
UNION ALL SELECT 'releves', COUNT(*) FROM public.releves
UNION ALL SELECT 'section_releves', COUNT(*) FROM public.section_releves
UNION ALL SELECT 'ligne_releves', COUNT(*) FROM public.ligne_releves
UNION ALL SELECT 'storage.objects (terrain-files)', COUNT(*)
  FROM storage.objects WHERE bucket_id = 'terrain-files'
ORDER BY table_name;
