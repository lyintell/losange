-- =============================================================================
-- LOSANGE — Etape 3/3 du reset schema zero
-- A executer APRES supabase/schema.sql dans le SQL Editor Supabase.
-- Marque toutes les migrations locales comme deja appliquees sur le projet distant.
-- =============================================================================

-- Politique storage dev (presente dans migration 20260604120000, absente de schema.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'terrain_files_dev_all'
  ) THEN
    CREATE POLICY terrain_files_dev_all ON storage.objects
      FOR ALL
      USING (bucket_id = 'terrain-files')
      WITH CHECK (bucket_id = 'terrain-files');
  END IF;
END $$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260530120000', '20260530120000_ligne_releves_note_ind_complete'),
  ('20260602120000', '20260602120000_releves_note'),
  ('20260602130000', '20260602130000_unites_drop_ind_unitaire'),
  ('20260603120000', '20260603120000_supprime_le_sync'),
  ('20260603140000', '20260603140000_entreprise_profil_dates'),
  ('20260603150000', '20260603150000_releves_date_facture_default'),
  ('20260603160000', '20260603160000_entreprises_ind_tva'),
  ('20260604120000', '20260604120000_terrain_image_fields'),
  ('20260607120000', '20260607120000_supprime_le_ouvrages'),
  ('20260607130000', '20260607130000_entreprise_tier_markers'),
  ('20260619120000', '20260619120000_articles_fournisseurs'),
  ('20260619140000', '20260619140000_ouvrages_ind_article'),
  ('20260619150000', '20260619150000_fournisseurs_telephone_optional'),
  ('20260619160000', '20260619160000_releves_remise'),
  ('20260619170000', '20260619170000_releves_ind_tva'),
  ('20260621120000', '20260621120000_releves_status'),
  ('20260624120000', '20260624120000_metiers_entreprise'),
  ('20260624130000', '20260624130000_ind_actif_metiers_ouvrages'),
  ('20260624140000', '20260624140000_ouvrages_ordre'),
  ('20260624150000', '20260624150000_default_metiers'),
  ('20260624170000', '20260624170000_entreprise_onboarding_metiers'),
  ('20260625120000', '20260625120000_sections'),
  ('20260625130000', '20260625130000_section_releves'),
  ('20260625140000', '20260625140000_section_releves_ordre'),
  ('20260625150000', '20260625150000_ligne_releves_section_id'),
  ('20260625160000', '20260625160000_ligne_releves_ordre'),
  ('20260625170000', '20260625170000_default_section_entreprise')
ON CONFLICT (version) DO NOTHING;

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
