import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { resolveTerrainImageUri } from '../db/terrainImageStorage';

const APP_LOGO = require('../../assets/logo2.png');

let cachedAppLogoDataUri = null;

const guessMimeFromKey = (storageKey) => {
  const ext = String(storageKey || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const toDataUri = (base64, mimeType) => `data:${mimeType};base64,${base64}`;

const readFileAsDataUri = async (uri, mimeType) => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return toDataUri(base64, mimeType);
};

const getAppLogoDataUri = async () => {
  if (cachedAppLogoDataUri) return cachedAppLogoDataUri;

  const asset = Asset.fromModule(APP_LOGO);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) {
    throw new Error('Logo Losange introuvable.');
  }

  cachedAppLogoDataUri = await readFileAsDataUri(uri, 'image/png');
  return cachedAppLogoDataUri;
};

/** Logo entreprise (Pro + fichier local) ou logo Losange par défaut. Compte gratuit : aucun logo. */
export const resolveExportLogoDataUri = async (entreprise) => {
  const isPro = Number(entreprise?.ind_pro) === 1;
  if (!isPro) return null;

  const storageKey = String(entreprise?.logo || '').trim();

  if (isPro && storageKey) {
    try {
      const localUri = resolveTerrainImageUri(storageKey);
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        return await readFileAsDataUri(localUri, guessMimeFromKey(storageKey));
      }
    } catch (error) {
      console.warn('Logo entreprise indisponible pour export, fallback Losange:', error);
    }
  }

  return getAppLogoDataUri();
};

export const EXPORT_LOGO_STYLES = `
  .export-watermark {
    position: fixed;
    right: 24px;
    bottom: 24px;
    width: 140px;
    height: 140px;
    opacity: 0.14;
    z-index: 0;
    pointer-events: none;
  }
  .export-watermark img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .header-top {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
  }
  .header-logo {
    flex-shrink: 0;
  }
  .header-logo img {
    max-height: 64px;
    max-width: 90px;
    object-fit: contain;
    display: block;
  }
  .header-company {
    min-width: 0;
    flex: 1;
  }
  .page-content {
    position: relative;
    z-index: 1;
  }
  .dimensions-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    margin-bottom: 28px;
  }
  .dimensions-header .title {
    flex: 1;
    min-width: 0;
    margin-bottom: 0;
  }
`;

export const renderExportLogoHeaderHtml = (logoDataUri) =>
  logoDataUri ? `<div class="header-logo"><img src="${logoDataUri}" alt="Logo" /></div>` : '';

export const renderExportLogoWatermarkHtml = (logoDataUri) =>
  logoDataUri ? `<div class="export-watermark"><img src="${logoDataUri}" alt="" /></div>` : '';
