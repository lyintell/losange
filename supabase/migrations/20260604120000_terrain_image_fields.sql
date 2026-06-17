-- Champs fichiers image (cles de stockage terrain-files)
-- Structure cloud Pro :
--   entreprises/{entrepriseId}/logo.*
--   entreprises/{entrepriseId}/chantiers/{chantierId}/photo_1|photo_2|photo_3.*
--   entreprises/{entrepriseId}/chantiers/{chantierId}/ligne_releves/{ligneId}/photo.*
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_1 TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_2 TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_3 TEXT;
ALTER TABLE ligne_releves ADD COLUMN IF NOT EXISTS photo TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'terrain-files',
  'terrain-files',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques developpement (bucket prive, acces via cle anon — a durcir en production)
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
