import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { buildDevisTableRows } from './devisGrouping';
import { formatMontantFcfa } from './formatLigneMesures';
import { montantEnLettresFcfa } from './montantEnLettres';
import {
  EXPORT_LOGO_STYLES,
  renderExportLogoHeaderHtml,
  renderExportLogoWatermarkHtml,
  resolveExportLogoDataUri,
} from './exportLogo';

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

const formatReleveDate = (dateValue) => {
  if (!dateValue) return '';
  const parsed = new Date(`${String(dateValue).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(dateValue);
  return parsed.toLocaleDateString('fr-FR', {
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

export function buildDevisHtml({ entreprise, chantier, lignes = [], logoDataUri = null }) {
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
  const afficheTva = Number(entreprise?.ind_pro) === 1 && Number(entreprise?.ind_tva) === 1;
  const tva = totalHt * 0.18;
  const totalTtc = totalHt + tva;
  const montantArrete = afficheTva ? totalTtc : totalHt;
  const montantArreteLettres = montantEnLettresFcfa(montantArrete, { includeTtcLabel: afficheTva });

  const totalsRows = afficheTva
    ? `
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
        `
    : `
          <tr>
            <td class="label">Total HT</td>
            <td class="value">${escapeHtml(formatMontantFcfa(totalHt))}</td>
          </tr>
        `;

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
          .header-company { min-width: 0; flex: 1; }
          ${EXPORT_LOGO_STYLES}
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
        ${renderExportLogoWatermarkHtml(logoDataUri)}
        <div class="page-content">
        <div class="header">
          <div class="header-top">
            ${renderExportLogoHeaderHtml(logoDataUri)}
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
          ${totalsRows}
        </table>

        <p class="arrete">
          Arrêté le présent devis estimatif à la somme de
          <strong>${escapeHtml(montantArreteLettres)}</strong>.
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
        </div>
      </body>
    </html>
  `;
}

const DIMENSION_NOTE_ARROW = '→';

const renderDimensionNoteArrowHtml = () =>
  `<span class="dim-ligne-arrow">${DIMENSION_NOTE_ARROW}</span>`;

const renderDimensionLigneHtml = (row) => {
  const measure = row.isDimensionLine
    ? row.dimensionLxhN || row.dimension || ''
    : row.nombrePdf ?? '';
  const note = row.note || '';
  const measureClass = measure ? 'dim-measure' : 'dim-measure-secondary';

  if (measure && note) {
    return `<div class="dim-ligne">
      <span class="${measureClass}">${escapeHtml(measure)}</span><span class="dim-ligne-note">${renderDimensionNoteArrowHtml()}${escapeHtml(note)}</span>
    </div>`;
  }
  if (measure) {
    return `<div class="dim-ligne"><span class="${measureClass}">${escapeHtml(measure)}</span></div>`;
  }
  if (note) {
    return `<div class="dim-ligne"><span class="dim-ligne-note">${renderDimensionNoteArrowHtml()}${escapeHtml(note)}</span></div>`;
  }
  return '';
};

const renderDimensionsDesignationBlock = (row) => {
  const metierHtml = row.showMetier
    ? `<div class="dim-metier" style="color:${row.metierColor}">${escapeHtml(row.metierNom)}</div>`
    : '';
  const ouvrageHtml = row.showOuvrage
    ? `<div class="dim-ouvrage">${escapeHtml(row.ouvrageNom)}</div>`
    : '';
  const ligneHtml = renderDimensionLigneHtml(row);

  return `
    <div class="dim-block ${row.metierDivider ? 'dim-metier-divider' : ''}">
      ${metierHtml}
      ${ouvrageHtml}
      ${ligneHtml}
    </div>
  `;
};

export function buildDimensionsPdfHtml({ chantier, lignes = [], logoDataUri = null }) {
  const tableRows = buildDevisTableRows(lignes);
  const clientNom = chantier?.client_nom?.trim() || 'Client';
  const chantierNom = chantier?.nom?.trim() || 'Chantier';
  const chantierNotes = chantier?.notes?.trim() || '';
  const releveDateRaw = lignes.find((ligne) => ligne.releve_date_facture)?.releve_date_facture;
  const releveDateLabel = formatReleveDate(releveDateRaw);

  const blocks = tableRows.map((row) => renderDimensionsDesignationBlock(row)).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #212529;
            margin: 28px;
            padding-bottom: 48px;
            font-size: 16px;
          }
          .title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.04em;
            margin-bottom: 28px;
            text-align: left;
          }
          .chantier-notes {
            font-size: 17px;
            font-weight: 600;
            line-height: 1.45;
            margin-bottom: 20px;
            text-align: left;
            white-space: pre-wrap;
          }
          .chantier-notes-label {
            font-weight: 700;
          }
          .dimensions-list {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .dim-block {
            text-align: left;
          }
          .dim-metier-divider {
            border-top: 3px solid #212529;
            padding-top: 18px;
            margin-top: 8px;
          }
          .dim-metier {
            font-weight: 800;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .dim-ouvrage {
            font-weight: 700;
            font-size: 28px;
            margin-bottom: 8px;
            text-align: center;
            text-decoration: underline;
          }
          .dim-ligne {
            line-height: 1.35;
            text-align: left;
            white-space: pre-wrap;
          }
          .dim-measure {
            font-size: 32px;
            font-weight: 800;
            color: #C62828;
          }
          .dim-measure-secondary {
            font-size: 28px;
            font-weight: 700;
            color: #C62828;
          }
          .dim-ligne-note {
            font-size: 17px;
            font-weight: 600;
          }
          .dim-ligne-arrow {
            font-size: 26px;
            font-weight: 700;
            line-height: 1;
            padding: 0 12px;
            vertical-align: middle;
          }
          .dimensions-footer {
            position: fixed;
            right: 28px;
            bottom: 20px;
            font-size: 14px;
            font-weight: 600;
            text-align: right;
            z-index: 2;
          }
          ${EXPORT_LOGO_STYLES}
        </style>
      </head>
      <body>
        ${renderExportLogoWatermarkHtml(logoDataUri)}
        <div class="page-content">
        <div class="dimensions-header">
          ${renderExportLogoHeaderHtml(logoDataUri)}
          <div class="title">RELEVÉS - ${escapeHtml(clientNom)} / ${escapeHtml(chantierNom)}</div>
        </div>
        ${chantierNotes ? `<div class="chantier-notes"><span class="chantier-notes-label">Notes:</span> ${escapeHtml(chantierNotes)}</div>` : ''}
        <div class="dimensions-list">
          ${blocks || '<div>Aucune dimension</div>'}
        </div>
        </div>
        ${releveDateLabel ? `<div class="dimensions-footer">${escapeHtml(releveDateLabel)}</div>` : ''}
      </body>
    </html>
  `;
}

export async function generateDevisPdfFile({ entreprise, chantier, lignes }) {
  const logoDataUri = await resolveExportLogoDataUri(entreprise);
  const html = buildDevisHtml({ entreprise, chantier, lignes, logoDataUri });
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function generateDimensionsPdfFile({ entreprise, chantier, lignes }) {
  const logoDataUri = await resolveExportLogoDataUri(entreprise);
  const html = buildDimensionsPdfHtml({ chantier, lignes, logoDataUri });
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareDevisPdf(uri, dialogTitle) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

const buildExportSlug = (chantier) =>
  (chantier?.nom || 'chantier')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const buildDevisFileName = (chantier) => {
  const date = new Date().toISOString().slice(0, 10);
  return `devis_${buildExportSlug(chantier) || 'chantier'}_${date}.pdf`;
};

const buildDimensionsFileName = (chantier) => {
  const date = new Date().toISOString().slice(0, 10);
  return `releve_${buildExportSlug(chantier) || 'chantier'}_${date}.pdf`;
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
      throw new Error('Accès au dossier Téléchargements refusé.');
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
  return { savedUri: destUri, locationLabel: 'Téléchargements' };
}

async function savePdfToAppDocuments(sourceUri, fileName, folderLabel = 'Devis') {
  const dir = `${FileSystem.documentDirectory}${folderLabel}/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const destUri = `${dir}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return { savedUri: destUri, locationLabel: folderLabel };
}

export async function downloadDevisPdf(sourceUri, chantier) {
  const fileName = buildDevisFileName(chantier);
  if (Platform.OS === 'android') {
    return { fileName, ...(await savePdfToAndroidDownloads(sourceUri, fileName)) };
  }
  return { fileName, ...(await savePdfToAppDocuments(sourceUri, fileName, 'Devis')) };
}

export async function downloadDimensionsPdf(sourceUri, chantier) {
  const fileName = buildDimensionsFileName(chantier);
  if (Platform.OS === 'android') {
    return { fileName, ...(await savePdfToAndroidDownloads(sourceUri, fileName)) };
  }
  return { fileName, ...(await savePdfToAppDocuments(sourceUri, fileName, 'Relevés')) };
}
