import { isSupabaseConfigured, supabase } from '../db/supabaseClient';
import { TERRAIN_IMAGE_BUCKET, toStorageKey } from '../db/terrainImageStorage';

const resolveExtension = (fileName, mimeType) => {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('heic')) return 'heic';
  if (mimeType?.includes('heif')) return 'heif';
  const match = String(fileName || '').match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  return 'jpg';
};

export const uploadAdminTerrainImageFile = async ({ file, storageKeyBase }) => {
  if (!file || !storageKeyBase) {
    throw new Error('Fichier ou clé de stockage manquante.');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configuré.');
  }

  const storageKey = toStorageKey(storageKeyBase, resolveExtension(file.name, file.type));
  const { error } = await supabase.storage.from(TERRAIN_IMAGE_BUCKET).upload(storageKey, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });

  if (error) {
    throw new Error(error.message || 'Échec envoi image.');
  }

  return storageKey;
};

export const getAdminTerrainImageUrl = async (storageKey) => {
  if (!storageKey || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase.storage
    .from(TERRAIN_IMAGE_BUCKET)
    .createSignedUrl(storageKey, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};
