import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;
const EXPORT_SETTINGS_PATH = `${FileSystem.documentDirectory}losange_export_settings.json`;

const buildImageSlug = (title) =>
  String(title || 'photo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const resolveImageExtension = (sourceUri) => {
  const match = String(sourceUri || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() || 'jpg';
};

const getImageMimeType = (extension) => {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/jpeg';
};

const buildImageFileName = (title, sourceUri) => {
  const extension = resolveImageExtension(sourceUri);
  const date = new Date().toISOString().slice(0, 10);
  const slug = buildImageSlug(title) || 'photo';
  return `${slug}_${date}.${extension}`;
};

async function loadAndroidDownloadDirectoryUri() {
  try {
    const info = await FileSystem.getInfoAsync(EXPORT_SETTINGS_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(EXPORT_SETTINGS_PATH);
    const parsed = JSON.parse(raw);
    return parsed.androidDownloadDirectoryUri || null;
  } catch {
    return null;
  }
}

async function saveAndroidDownloadDirectoryUri(directoryUri) {
  await FileSystem.writeAsStringAsync(
    EXPORT_SETTINGS_PATH,
    JSON.stringify({ androidDownloadDirectoryUri: directoryUri })
  );
}

async function saveImageToAndroidDownloads(sourceUri, fileName) {
  let directoryUri = await loadAndroidDownloadDirectoryUri();

  if (!directoryUri) {
    const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
    if (!permissions.granted) {
      throw new Error('Accès au dossier Téléchargements refusé.');
    }
    directoryUri = permissions.directoryUri;
    await saveAndroidDownloadDirectoryUri(directoryUri);
  }

  const extension = resolveImageExtension(sourceUri);
  const mimeType = getImageMimeType(extension);
  const base64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: 'base64' });
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const destUri = await StorageAccessFramework.createFileAsync(directoryUri, baseName, mimeType);
  await FileSystem.writeAsStringAsync(destUri, base64, { encoding: 'base64' });
  return { savedUri: destUri, locationLabel: 'Téléchargements' };
}

async function saveImageToAppDocuments(sourceUri, fileName) {
  const dir = `${FileSystem.documentDirectory}Photos/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const destUri = `${dir}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return { savedUri: destUri, locationLabel: 'Photos' };
}

export async function downloadTerrainImage(sourceUri, title = 'photo') {
  if (!sourceUri) {
    throw new Error('Image introuvable.');
  }

  const fileName = buildImageFileName(title, sourceUri);
  if (Platform.OS === 'android') {
    return { fileName, ...(await saveImageToAndroidDownloads(sourceUri, fileName)) };
  }
  return { fileName, ...(await saveImageToAppDocuments(sourceUri, fileName)) };
}
