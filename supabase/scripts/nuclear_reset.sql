-- =============================================================================
-- LOSANGE — Reset SCHEMA ZERO (Supabase distant)
-- =============================================================================
-- ATTENTION : detruit tables, policies RLS Losange, fichiers storage, historique
-- migrations. Irreversible.
--
-- Workflow complet (3 etapes) :
--
--   ETAPe 1 — ce fichier (SQL Editor Supabase)
--   ETAPe 2 — coller et executer supabase/schema.sql (recree le schema final)
--   ETAPe 3 — executer supabase/scripts/nuclear_mark_migrations.sql
--             (aligne l historique CLI pour les prochains db push)
--
-- Puis :
--   supabase functions deploy master-admin-crud
--   supabase functions deploy terrain-sync
--   supabase functions deploy terrain-login
--   Mobile : deconnexion + effacer donnees app
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Storage terrain-files
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS terrain_files_dev_all ON storage.objects;

DELETE FROM storage.objects
WHERE bucket_id = 'terrain-files';

DELETE FROM storage.buckets
WHERE id = 'terrain-files';

-- ---------------------------------------------------------------------------
-- 2. Fonctions / triggers legacy
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_seed_metiers_entreprise ON public.entreprises;
DROP FUNCTION IF EXISTS public.seed_metiers_entreprise_for_entreprise() CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Tables metier (ordre explicite + legacy)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.ligne_releves CASCADE;
DROP TABLE IF EXISTS public.section_releves CASCADE;
DROP TABLE IF EXISTS public.releves CASCADE;
DROP TABLE IF EXISTS public.ouvrage_unites CASCADE;
DROP TABLE IF EXISTS public.ouvrages CASCADE;
DROP TABLE IF EXISTS public.article_unites CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.fournisseurs CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.metiers CASCADE;
DROP TABLE IF EXISTS public.metiers_entreprise CASCADE;
DROP TABLE IF EXISTS public.chantiers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profils CASCADE;
DROP TABLE IF EXISTS public.entreprises CASCADE;
DROP TABLE IF EXISTS public.unites CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Historique migrations Supabase CLI
-- ---------------------------------------------------------------------------
DELETE FROM supabase_migrations.schema_migrations;

COMMIT;

-- Verification : plus aucune table Losange
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'entreprises',
    'profils',
    'clients',
    'chantiers',
    'metiers',
    'sections',
    'fournisseurs',
    'ouvrages',
    'unites',
    'ouvrage_unites',
    'releves',
    'section_releves',
    'ligne_releves',
    'articles',
    'article_unites',
    'metiers_entreprise'
  )
ORDER BY table_name;

-- Doit retourner 0 ligne. Ensuite : executer supabase/schema.sql
