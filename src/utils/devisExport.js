import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { buildDevisTableRows, buildRelevesTableRows } from './devisGrouping';
import { formatMontantFcfa } from './formatLigneMesures';
import { montantEnLettresFcfa } from './montantEnLettres';
import { computeReleveFacturation } from './releveFacturation';
import {
  EXPORT_LOGO_STYLES,
  renderExportLogoHeaderHtml,
  resolveExportLogoDataUri,
} from './exportLogo';
import { saveFileToAndroidDownloads } from './androidSafExport';

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

export function buildDevisHtml({ entreprise, chantier, lignes = [], releve = null, logoDataUri = null }) {
  const tableRows = buildDevisTableRows(lignes);
  const rows = tableRows
    .map((row, index) => {
      if (row.isSectionSeparator) {
        return `<tr class="section-divider"><td colspan="4"></td></tr>`;
      }

      if (row.isSectionHeader) {
        return `<tr class="section-header"><td colspan="4"><div class="section">${escapeHtml(row.sectionNom)}</div></td></tr>`;
      }

      const rowClass = [
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

  const brutHt = lignes.reduce((sum, ligne) => sum + (Number(ligne.montant) || 0), 0);
  const facturation = computeReleveFacturation({
    lignesMontantTotal: brutHt,
    remise: releve?.remise ?? 0,
    indTva: releve?.ind_tva ?? 0,
    tvaTaux: releve?.tva_facture,
  });
  const afficheTva = Number(entreprise?.ind_pro) === 1 && facturation.applyTva;
  const { montantRemise, totalHt, montantTva, totalTtc } = facturation;
  const montantArrete = afficheTva ? totalTtc : totalHt;
  const montantArreteLettres = montantEnLettresFcfa(montantArrete, { includeTtcLabel: afficheTva });

  const totalsRows = afficheTva
    ? `
          <tr>
            <td class="label">Remise</td>
            <td class="value">${escapeHtml(formatMontantFcfa(montantRemise))}</td>
          </tr>
          <tr>
            <td class="label">Total HT</td>
            <td class="value">${escapeHtml(formatMontantFcfa(totalHt))}</td>
          </tr>
          <tr>
            <td class="label">TVA 18%</td>
            <td class="value">${escapeHtml(formatMontantFcfa(montantTva))}</td>
          </tr>
          <tr>
            <td class="label">Total TTC</td>
            <td class="value">${escapeHtml(formatMontantFcfa(totalTtc))}</td>
          </tr>
        `
    : `
          <tr>
            <td class="label">Remise</td>
            <td class="value">${escapeHtml(formatMontantFcfa(montantRemise))}</td>
          </tr>
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
          tr.section-divider td { border-top: 2px solid #212529; border-bottom: none; padding: 0; height: 0; line-height: 0; }
          tr.section-header td { border-top: none; border-bottom: none; padding: 8px 8px 4px; }
          .designation .section, tr.section-header .section { font-weight: 700; font-size: 14px; text-align: center; }
          tr.ouvrage-ligne-suite td { border-top: none; }
          tr.ouvrage-ligne-before-suite td { border-bottom: none; }
          .designation .metier { font-weight: 700; font-size: 13px; margin-bottom: 6px; text-align: left; }
          .designation .ouvrage { font-weight: 700; font-size: 12px; margin-bottom: 4px; text-align: center; }
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
  const equivalence = row.isDimensionLine ? row.dimensionEquivalence || '' : '';
  const note = row.note || '';
  const measureClass = measure || equivalence ? 'dim-measure' : 'dim-measure-secondary';
  const measureLine = [measure, equivalence].filter(Boolean).join(' ');

  if (measureLine && note) {
    return `<div class="dim-ligne">
      <span class="${measureClass}">${escapeHtml(measureLine)}</span><span class="dim-ligne-note">${renderDimensionNoteArrowHtml()}${escapeHtml(note)}</span>
    </div>`;
  }
  if (measureLine) {
    return `<div class="dim-ligne"><span class="${measureClass}">${escapeHtml(measureLine)}</span></div>`;
  }
  if (note) {
    return `<div class="dim-ligne"><span class="dim-ligne-note">${renderDimensionNoteArrowHtml()}${escapeHtml(note)}</span></div>`;
  }
  return '';
};

const renderDimensionsRowHtml = (row) => {
  if (row.isSectionSeparator) {
    return `<div class="dim-section-divider"></div>`;
  }

  if (row.isSectionHeader) {
    return `<div class="dim-section">${escapeHtml(row.sectionNom)}</div>`;
  }

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

export function buildDimensionsPdfHtml({ chantier, lignes = [], sectionOrder = null, logoDataUri = null }) {
  const tableRows = buildRelevesTableRows(lignes, sectionOrder);
  const clientNom = chantier?.client_nom?.trim() || 'Client';
  const chantierNom = chantier?.nom?.trim() || 'Chantier';
  const chantierNotes = chantier?.notes?.trim() || '';
  const releveDateRaw = lignes.find((ligne) => ligne.releve_date_facture)?.releve_date_facture;
  const releveDateLabel = formatReleveDate(releveDateRaw);

  const blocks = tableRows.map((row) => renderDimensionsRowHtml(row)).join('');

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
          .dim-section-divider {
            border-top: 3px solid #212529;
            margin-top: 8px;
          }
          .dim-section {
            font-weight: 800;
            font-size: 22px;
            text-align: center;
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

export async function generateDevisPdfFile({ entreprise, chantier, lignes, releve = null }) {
  const logoDataUri = await resolveExportLogoDataUri(entreprise);
  const html = buildDevisHtml({ entreprise, chantier, lignes, releve, logoDataUri });
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function generateDimensionsPdfFile({ entreprise, chantier, lignes, sectionOrder = null }) {
  const logoDataUri = await resolveExportLogoDataUri(entreprise);
  const html = buildDimensionsPdfHtml({ chantier, lignes, sectionOrder, logoDataUri });
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

const buildClientSlug = (chantier) =>
  (chantier?.client_nom || 'client')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const buildExportDateSlug = () => new Date().toISOString().slice(0, 10);

export const buildDevisFileName = (chantier) => {
  const client = buildClientSlug(chantier) || 'client';
  return `devis_${client}_${buildExportDateSlug()}.pdf`;
};

export const buildRelevesFileName = (chantier) => {
  const client = buildClientSlug(chantier) || 'client';
  return `releves_${client}_${buildExportDateSlug()}.pdf`;
};

const copyPdfForNamedShare = async (sourceUri, fileName) => {
  const destUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
};

export async function shareDevisPdf(uri, dialogTitle, { chantier, mode = 'devis' } = {}) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }

  const fileName =
    mode === 'pdf' ? buildRelevesFileName(chantier) : buildDevisFileName(chantier);
  const shareUri = chantier ? await copyPdfForNamedShare(uri, fileName) : uri;

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
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
    const result = await saveFileToAndroidDownloads(sourceUri, fileName, 'application/pdf', {
      fallbackFolderLabel: 'Devis',
    });
    return { fileName, ...result };
  }
  return { fileName, ...(await savePdfToAppDocuments(sourceUri, fileName, 'Devis')) };
}

export async function downloadDimensionsPdf(sourceUri, chantier) {
  const fileName = buildRelevesFileName(chantier);
  if (Platform.OS === 'android') {
    const result = await saveFileToAndroidDownloads(sourceUri, fileName, 'application/pdf', {
      fallbackFolderLabel: 'Relevés',
    });
    return { fileName, ...result };
  }
  return { fileName, ...(await savePdfToAppDocuments(sourceUri, fileName, 'Relevés')) };
}
