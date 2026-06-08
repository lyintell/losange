import * as FileSystem from 'expo-file-system/legacy';
import { ensureLocalDatabaseReady } from './localDb';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { getLoggedInProfilLocal } from './terrainSync';

export const TERRAIN_IMAGE_BUCKET = 'terrain-files';
export const CHANTIER_PHOTO_SLOTS = ['photo_1', 'photo_2', 'photo_3'];

const LOCAL_ROOT = `${FileSystem.documentDirectory}${TERRAIN_IMAGE_BUCKET}/`;

const isProEntreprise = async () => Number((await getLoggedInProfilLocal())?.ind_pro) === 1;

const buildEntrepriseRoot = (entrepriseId) => `entreprises/${entrepriseId}`;

/** Logo : dossier entreprise */
export const buildEntrepriseLogoKey = (entrepriseId) => `${buildEntrepriseRoot(entrepriseId)}/logo`;

/** Photos chantier : dossier chantiers sous l entreprise */
export const buildChantierPhotoKey = (entrepriseId, chantierId, slot) =>
  `${buildEntrepriseRoot(entrepriseId)}/chantiers/${chantierId}/${slot}`;

/** Photo ligne releve : sous le chantier de l entreprise */
export const buildLignePhotoKey = (entrepriseId, chantierId, ligneId) =>
  `${buildEntrepriseRoot(entrepriseId)}/chantiers/${chantierId}/ligne_releves/${ligneId}/photo`;

const resolveExtension = (sourceUri, mimeType) => {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('heic')) return 'heic';
  if (mimeType?.includes('heif')) return 'heif';
  const match = String(sourceUri || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match) return match[1].toLowerCase();
  return 'jpg';
};

export const toStorageKey = (storageKey, extension = 'jpg') =>
  storageKey && !storageKey.includes('.') ? `${storageKey}.${extension}` : storageKey;

export const getLocalImageUri = (storageKey) => {
  if (!storageKey) return null;
  return `${LOCAL_ROOT}${storageKey}`;
};

export const resolveTerrainImageUri = (storageKey) => getLocalImageUri(storageKey);

const ensureParentDirectory = async (fileUri) => {
  const dir = fileUri.substring(0, fileUri.lastIndexOf('/'));
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
};

export const saveImageFileLocal = async ({ sourceUri, storageKey, mimeType }) => {
  if (!sourceUri || !storageKey) {
    throw new Error('Source ou clé de stockage manquante.');
  }

  const key = toStorageKey(storageKey, resolveExtension(sourceUri, mimeType));
  const destUri = getLocalImageUri(key);
  await ensureParentDirectory(destUri);
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return key;
};

export const deleteImageFileLocal = async (storageKey) => {
  if (!storageKey) return;
  const uri = getLocalImageUri(storageKey);
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
};

const inferContentTypeFromKey = (storageKey) => {
  const ext = String(storageKey || '').split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'image/jpeg';
};

const readLocalImageBytes = async (localUri) => {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const uploadImageToCloud = async (storageKey) => {
  if (!isSupabaseConfigured() || !storageKey) {
    return { ok: false, skipped: true };
  }

  try {
    const localUri = getLocalImageUri(storageKey);
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      return { ok: false, error: 'Fichier local introuvable.' };
    }

    const bytes = await readLocalImageBytes(localUri);
    const { error } = await supabase.storage.from(TERRAIN_IMAGE_BUCKET).upload(storageKey, bytes, {
      upsert: true,
      contentType: inferContentTypeFromKey(storageKey),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (uploadError) {
    const message =
      uploadError instanceof Error ? uploadError.message : 'Échec envoi image.';
    return { ok: false, error: message };
  }
};

export const downloadImageFromCloud = async (storageKey) => {
  if (!isSupabaseConfigured() || !storageKey) {
    return { ok: false, skipped: true };
  }

  const localUri = getLocalImageUri(storageKey);
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    return { ok: true, cached: true };
  }

  const { data, error } = await supabase.storage
    .from(TERRAIN_IMAGE_BUCKET)
    .createSignedUrl(storageKey, 3600);

  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message || 'URL signée indisponible.' };
  }

  await ensureParentDirectory(localUri);
  const download = await FileSystem.downloadAsync(data.signedUrl, localUri);
  if (download.status !== 200) {
    return { ok: false, error: `Téléchargement image (${download.status}).` };
  }

  return { ok: true };
};

export const persistTerrainImage = async ({ sourceUri, storageKey, mimeType, uploadCloud }) => {
  const key = await saveImageFileLocal({ sourceUri, storageKey, mimeType });

  // Offline-first : l envoi cloud est fait par syncPendingTerrainImagesToCloud.
  if (uploadCloud === true && isSupabaseConfigured()) {
    const uploaded = await uploadImageToCloud(key);
    if (!uploaded.ok && !uploaded.skipped) {
      console.warn('Echec upload image terrain:', key, uploaded.error);
    }
  }

  return key;
};

const collectStorageKeys = (rows = [], fields = []) => {
  const keys = new Set();
  rows.forEach((row) => {
    fields.forEach((field) => {
      if (row?.[field]) keys.add(String(row[field]));
    });
  });
  return [...keys];
};

export const collectPendingImageKeys = async (entrepriseId) => {
  if (!entrepriseId) return [];

  const db = await ensureLocalDatabaseReady();
  const keys = new Set();

  const entrepriseRows = await db.getAllAsync(
    `SELECT logo FROM entreprises WHERE id = ? AND _synced = 0;`,
    [entrepriseId]
  );
  collectStorageKeys(entrepriseRows, ['logo']).forEach((key) => keys.add(key));

  const chantierRows = await db.getAllAsync(
    `
    SELECT chantiers.photo_1, chantiers.photo_2, chantiers.photo_3
    FROM chantiers
    JOIN clients ON clients.id = chantiers.client_id
    WHERE clients.entreprise_id = ? AND chantiers._synced = 0;
    `,
    [entrepriseId]
  );
  collectStorageKeys(chantierRows, CHANTIER_PHOTO_SLOTS).forEach((key) => keys.add(key));

  const ligneRows = await db.getAllAsync(
    `
    SELECT ligne_releves.photo
    FROM ligne_releves
    JOIN releves ON releves.id = ligne_releves.releve_id
    JOIN chantiers ON chantiers.id = releves.chantier_id
    JOIN clients ON clients.id = chantiers.client_id
    WHERE clients.entreprise_id = ? AND ligne_releves._synced = 0;
    `,
    [entrepriseId]
  );
  collectStorageKeys(ligneRows, ['photo']).forEach((key) => keys.add(key));

  return [...keys];
};

export const syncPendingTerrainImagesToCloud = async (entrepriseId) => {
  if (!(await isProEntreprise()) || !isSupabaseConfigured()) {
    return { ok: true, uploaded: 0, failed: 0, skipped: true };
  }

  const keys = await collectPendingImageKeys(entrepriseId);
  let uploaded = 0;
  let failed = 0;

  for (const key of keys) {
    try {
      const result = await uploadImageToCloud(key);
      if (result.ok) {
        uploaded += 1;
      } else if (!result.skipped) {
        failed += 1;
        console.warn('Echec upload image terrain:', key, result.error);
      }
    } catch (uploadError) {
      failed += 1;
      console.warn('Echec upload image terrain:', key, uploadError);
    }
  }

  return { ok: true, uploaded, failed };
};

export const hydrateTerrainImagesFromPull = async (pull = {}) => {
  if (!(await isProEntreprise()) || !isSupabaseConfigured()) {
    return { ok: true, downloaded: 0, skipped: true };
  }

  const keys = new Set();
  const entrepriseRows = [];
  if (pull.entreprise) entrepriseRows.push(pull.entreprise);
  if (Array.isArray(pull.entreprises)) entrepriseRows.push(...pull.entreprises);
  collectStorageKeys(entrepriseRows, ['logo']).forEach((key) => keys.add(key));
  collectStorageKeys(pull.chantiers || [], CHANTIER_PHOTO_SLOTS).forEach((key) => keys.add(key));
  collectStorageKeys(pull.ligne_releves || [], ['photo']).forEach((key) => keys.add(key));

  let downloaded = 0;
  for (const key of keys) {
    const result = await downloadImageFromCloud(key);
    if (result.ok && !result.cached) downloaded += 1;
    if (!result.ok && !result.skipped) {
      console.warn('Echec telechargement image terrain:', key, result.error);
    }
  }

  return { ok: true, downloaded };
};
