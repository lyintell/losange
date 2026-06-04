import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { buildDevisTableRows } from './devisGrouping';
import { formatMontantFcfa } from './formatLigneMesures';
import { montantEnLettresFcfa } from './montantEnLettres';

const { StorageAccessFramework } = FileSystem;
const EXPORT_SETTINGS_PATH = `${FileSystem.documentDirectory}losange_export_settings.json`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDevisDate = () => {
  const now = new Date();
  return now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const renderDesignationCell = (row) => {
  const metierHtml = row.showMetier
    ? `<div class="metier" style="color:${row.metierColor}">${escapeHtml(row.metierNom)}</div>`
    : '';
  const ouvrageHtml = row.showOuvrage
    ? `<div class="ouvrage">${escapeHtml(row.ouvrageNom)}</div>`
    : '';
  const dimensionHtml = row.dimension
    ? `<div class="dimension-line">${escapeHtml(row.dimension)}</div>`
    : '';

  return `
    <div class="designation">
      ${metierHtml}
      ${ouvrageHtml}
      ${dimensionHtml}
    </div>
  `;
};

export function buildDevisHtml({ entreprise, chantier, lignes = [] }) {
  const tableRows = buildDevisTableRows(lignes);
  const rows = tableRows
    .map((row) => {
      const rowClass = [
        row.metierDivider ? 'metier-divider' : '',
        row.ouvrageLigneSuite ? 'ouvrage-ligne-suite' : '',
        row.ouvrageLigneBeforeSuite ? 'ouvrage-ligne-before-suite' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `
        <tr class="${rowClass}">
          <td class="designation-cell">${renderDesignationCell(row)}</td>
          <td class="num">${escapeHtml(row.quantiteLabel)}</td>
          <td class="num">${escapeHtml(formatMontantFcfa(row.prixUnitaire))}</td>
          <td class="num">${escapeHtml(formatMontantFcfa(row.montant))}</td>
        </tr>
      `;
    })
    .join('');

  const totalHt = lignes.reduce((sum, ligne) => sum + (Number(ligne.montant) || 0), 0);
  const tva = totalHt * 0.18;
  const totalTtc = totalHt + tva;
  const totalTtcLettres = montantEnLettresFcfa(totalTtc);

  const tel = [entreprise?.telephone_1, entreprise?.telephone_2].filter(Boolean).join(' / ');

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #212529; margin: 32px; font-size: 12px; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .muted { color: #6c757d; }
          .header { border-bottom: 2px solid #dee2e6; padding-bottom: 16px; margin-bottom: 20px; }
          .header-top { margin-bottom: 0; }
          .header-company { min-width: 0; }
          .header-title { margin-top: 14px; font-size: 20px; font-weight: 800; letter-spacing: 0.08em; text-align: center; }
          .meta { margin: 18px 0 24px; }
          .meta-row { display: flex; justify-content: space-between; align-items: baseline; gap: 24px; margin: 8px 0; }
          .meta-highlight { margin: 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; }
          .meta-highlight strong { font-size: 16px; }
          .meta-date { font-size: 16px; font-weight: 600; white-space: nowrap; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
          th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f8f9fa; font-weight: 700; }
          th.designation, td.designation-cell { width: 52%; }
          td.num, th.num { text-align: right; white-space: nowrap; width: 16%; vertical-align: bottom; }
          tr.metier-divider td { border-top: 2px solid #212529; }
          tr.ouvrage-ligne-suite td { border-top: none; }
          tr.ouvrage-ligne-before-suite td { border-bottom: none; }
          .designation .metier { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
          .designation .ouvrage { font-weight: 700; font-size: 12px; margin-bottom: 4px; }
          .designation .dimension-line { text-align: center; font-size: 13px; font-weight: 600; line-height: 1.6; min-height: 1.6em; }
          .totals { margin-top: 16px; width: 100%; }
          .totals td { border: none; padding: 4px 0; }
          .totals .label { text-align: right; padding-right: 12px; font-weight: 700; }
          .totals .value { text-align: right; width: 140px; }
          .arrete { margin-top: 20px; line-height: 1.6; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; gap: 48px; margin-top: 48px; }
          .signature-block { flex: 1; max-width: 46%; }
          .signature-block-right { text-align: right; }
          .signature-title { font-weight: 700; font-size: 13px; margin-bottom: 112px; }
          .signature-line { border-top: 1px solid #212529; width: 100%; height: 0; }
          .footer { margin-top: 48px; border-top: 1px solid #dee2e6; padding-top: 12px; font-size: 11px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-top">
            <div class="header-company">
              <h1>${escapeHtml(entreprise?.nom || 'Entreprise')}</h1>
              ${tel ? `<div class="muted">${escapeHtml(tel)}</div>` : ''}
              ${entreprise?.adresse ? `<div class="muted">${escapeHtml(entreprise.adresse)}</div>` : ''}
            </div>
          </div>
          <div class="header-title">DEVIS ESTIMATIF</div>
        </div>

        <div class="meta">
          <div class="meta-row">
            <p class="meta-highlight"><strong>Client :</strong> ${escapeHtml(chantier?.client_nom || 'Client')}</p>
            <div class="meta-date">${escapeHtml(formatDevisDate())}</div>
          </div>
          <p class="meta-highlight"><strong>Chantier :</strong> ${escapeHtml(chantier?.nom || 'Chantier')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th class="designation">Designation</th>
              <th class="num">Quantite</th>
              <th class="num">P.U</th>
              <th class="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4">Aucune ligne</td></tr>'}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td class="label">Total HT</td>
            <td class="value">${escapeHtml(formatMontantFcfa(totalHt))}</td>
          </tr>
          <tr>
            <td class="label">TVA 18%</td>
            <td class="value">${escapeHtml(formatMontantFcfa(tva))}</td>
          </tr>
          <tr>
            <td class="label">Total TTC</td>
            <td class="value">${escapeHtml(formatMontantFcfa(totalTtc))}</td>
          </tr>
        </table>

        <p class="arrete">
          Arrêté le présent devis estimatif à la somme de
          <strong>${escapeHtml(totalTtcLettres)}</strong>.
        </p>

        <div class="signatures">
          <div class="signature-block">
            <div class="signature-title">Le Client</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block signature-block-right">
            <div class="signature-title">Le Fournisseur</div>
            <div class="signature-line"></div>
          </div>
        </div>

        <div class="footer">
          ${escapeHtml(entreprise?.nom || '')}
          ${tel ? ` · ${escapeHtml(tel)}` : ''}
          ${entreprise?.adresse ? ` · ${escapeHtml(entreprise.adresse)}` : ''}
        </div>
      </body>
    </html>
  `;
}

export async function generateDevisPdfFile({ entreprise, chantier, lignes }) {
  const html = buildDevisHtml({ entreprise, chantier, lignes });
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareDevisPdf(uri, dialogTitle) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Le partage de fichiers n est pas disponible sur cet appareil.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

const buildDevisFileName = (chantier) => {
  const slug = (chantier?.nom || 'chantier')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `devis_${slug || 'chantier'}_${date}.pdf`;
};

const buildDevisFileBaseName = (fileName) => fileName.replace(/\.pdf$/i, '');

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

async function savePdfToAndroidDownloads(sourceUri, fileName) {
  let directoryUri = await loadAndroidDownloadDirectoryUri();

  if (!directoryUri) {
    const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
    if (!permissions.granted) {
      throw new Error('Acces au dossier Telechargements refuse.');
    }
    directoryUri = permissions.directoryUri;
    await saveAndroidDownloadDirectoryUri(directoryUri);
  }

  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: 'base64',
  });
  const destUri = await StorageAccessFramework.createFileAsync(
    directoryUri,
    buildDevisFileBaseName(fileName),
    'application/pdf'
  );
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: 'base64',
  });
  return { savedUri: destUri, locationLabel: 'Telechargements' };
}

async function savePdfToAppDocuments(sourceUri, fileName) {
  const dir = `${FileSystem.documentDirectory}Devis/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const destUri = `${dir}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return { savedUri: destUri, locationLabel: 'Devis' };
}

export async function downloadDevisPdf(sourceUri, chantier) {
  const fileName = buildDevisFileName(chantier);
  if (Platform.OS === 'android') {
    return { fileName, ...(await savePdfToAndroidDownloads(sourceUri, fileName)) };
  }
  return { fileName, ...(await savePdfToAppDocuments(sourceUri, fileName)) };
}
