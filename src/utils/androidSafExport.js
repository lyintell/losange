import * as FileSystem from 'expo-file-system/legacy';

const { StorageAccessFramework } = FileSystem;
const EXPORT_SETTINGS_PATH = `${FileSystem.documentDirectory}losange_export_settings.json`;

/** Expo legacy SAF works reliably only with externalstorage tree URIs. */
export const isCompatibleSafDirectoryUri = (uri) =>
  Boolean(uri && String(uri).includes('com.android.externalstorage.documents/tree/'));

export const sanitizeSafFileBaseName = (fileName) =>
  String(fileName || 'export')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'export';

async function loadCachedDirectoryUri() {
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

async function saveCachedDirectoryUri(directoryUri) {
  await FileSystem.writeAsStringAsync(
    EXPORT_SETTINGS_PATH,
    JSON.stringify({ androidDownloadDirectoryUri: directoryUri })
  );
}

async function clearCachedDirectoryUri() {
  try {
    const info = await FileSystem.getInfoAsync(EXPORT_SETTINGS_PATH);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(EXPORT_SETTINGS_PATH);
    const parsed = JSON.parse(raw);
    delete parsed.androidDownloadDirectoryUri;
    await FileSystem.writeAsStringAsync(EXPORT_SETTINGS_PATH, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

async function requestExportDirectoryUri() {
  const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
  if (!permissions.granted) {
    throw new Error('Accès au dossier Téléchargements refusé.');
  }
  if (!isCompatibleSafDirectoryUri(permissions.directoryUri)) {
    throw new Error(
      'Dossier non compatible. Choisissez un dossier du stockage interne (ex. Téléchargements).'
    );
  }
  await saveCachedDirectoryUri(permissions.directoryUri);
  return permissions.directoryUri;
}

async function resolveExportDirectoryUri() {
  const cached = await loadCachedDirectoryUri();
  if (isCompatibleSafDirectoryUri(cached)) {
    return cached;
  }
  if (cached) {
    await clearCachedDirectoryUri();
  }
  return requestExportDirectoryUri();
}

async function writeFileToSafDirectory(directoryUri, fileName, mimeType, sourceUri) {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: 'base64',
  });
  const baseName = sanitizeSafFileBaseName(fileName);
  const destUri = await StorageAccessFramework.createFileAsync(directoryUri, baseName, mimeType);
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: 'base64',
  });
  return destUri;
}

async function saveFileToAppDocuments(sourceUri, fileName, folderLabel) {
  const dir = `${FileSystem.documentDirectory}${folderLabel}/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const destUri = `${dir}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return { savedUri: destUri, locationLabel: folderLabel, usedFallback: true };
}

/**
 * Saves a file to Android Downloads via SAF, with retry and app-folder fallback.
 */
export async function saveFileToAndroidDownloads(
  sourceUri,
  fileName,
  mimeType,
  { fallbackFolderLabel = 'Téléchargements' } = {}
) {
  const attempts = [
    async () => {
      const directoryUri = await resolveExportDirectoryUri();
      const savedUri = await writeFileToSafDirectory(directoryUri, fileName, mimeType, sourceUri);
      return { savedUri, locationLabel: 'Téléchargements', usedFallback: false };
    },
    async () => {
      await clearCachedDirectoryUri();
      const directoryUri = await requestExportDirectoryUri();
      const savedUri = await writeFileToSafDirectory(directoryUri, fileName, mimeType, sourceUri);
      return { savedUri, locationLabel: 'Téléchargements', usedFallback: false };
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      console.warn('Android SAF export failed:', error);
    }
  }

  try {
    return await saveFileToAppDocuments(sourceUri, fileName, fallbackFolderLabel);
  } catch (fallbackError) {
    console.error('Android export fallback failed:', fallbackError);
    throw lastError || fallbackError;
  }
}
