import { isSupabaseConfigured, supabase } from './supabaseClient';

export const TERRAIN_IMAGE_BUCKET = 'terrain-files';
export const CHANTIER_PHOTO_SLOTS = ['photo_1', 'photo_2', 'photo_3'];

export const toStorageKey = (storageKey, extension = 'jpg') =>
  storageKey && !storageKey.includes('.') ? `${storageKey}.${extension}` : storageKey;

export const buildEntrepriseLogoKey = (entrepriseId) => `entreprises/${entrepriseId}/logo`;

export const buildChantierPhotoKey = (entrepriseId, chantierId, slot) =>
  `entreprises/${entrepriseId}/chantiers/${chantierId}/${slot}`;

export const buildLignePhotoKey = (entrepriseId, chantierId, ligneId) =>
  `entreprises/${entrepriseId}/chantiers/${chantierId}/ligne_releves/${ligneId}/photo`;

export const buildOuvragePhotoKey = (entrepriseId, ouvrageId) =>
  `entreprises/${entrepriseId}/ouvrages/${ouvrageId}/photo`;

export const buildArticlePhotoKey = buildOuvragePhotoKey;

export const getLocalImageUri = () => null;

export const resolveTerrainImageUri = (storageKey) => {
  if (!storageKey || !isSupabaseConfigured()) return null;
  const { data } = supabase.storage.from(TERRAIN_IMAGE_BUCKET).getPublicUrl(storageKey);
  return data?.publicUrl || null;
};

export const persistTerrainImage = async () => {
  throw new Error('Stockage image terrain indisponible sur le web admin.');
};

export const deleteImageFileLocal = async () => {};

export const hydrateTerrainImagesFromPull = async () => {};
