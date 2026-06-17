import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { saveFileToAndroidDownloads } from './androidSafExport';

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
    const extension = resolveImageExtension(sourceUri);
    const mimeType = getImageMimeType(extension);
    const result = await saveFileToAndroidDownloads(sourceUri, fileName, mimeType, {
      fallbackFolderLabel: 'Photos',
    });
    return { fileName, ...result };
  }
  return { fileName, ...(await saveImageToAppDocuments(sourceUri, fileName)) };
}
