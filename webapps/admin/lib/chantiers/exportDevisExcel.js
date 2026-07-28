import * as XLSX from 'xlsx';
import { formatDevisDocumentDate } from '@/lib/chantiers/documentDates';
import { buildDevisTableRows } from '@/lib/format/devisGrouping';
import { roundMontant, roundQuantite } from '@/lib/format/formatLigneMesures';
import { montantEnLettresFcfa } from '@/lib/format/montantEnLettres';
import { computeReleveFacturation } from '@/lib/format/releveFacturation';

/** Nombre Excel utilisable en calcul (pas de texte / espace / virgule). */
function toExcelNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(
    String(value)
      .replace(/\u00a0/g, '')
      .replace(/\s/g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyDataCells() {
  return [null, null, null, null];
}

/**
 * Une entrée de table PDF → lignes Excel.
 * - Dimension (ind_dimension = 1) : métier / ouvrage / cote sur lignes séparées ; chiffres sur la cote.
 * - Unitaire (ind_dimension = 0) : métier seul ; ouvrage sur la même ligne que Qté / U / P.U / Montant.
 */
function appendDevisRowToSheet(sheetRows, row) {
  if (row.showMetier && row.metierNom) {
    sheetRows.push([row.metierNom, ...emptyDataCells()]);
  }

  const quantite = toExcelNumber(row.quantiteLabel);
  const prixUnitaire = toExcelNumber(roundMontant(row.prixUnitaire));
  const montant = toExcelNumber(roundMontant(row.montant));
  const unite = row.uniteLabel || null;
  const measureCells = [
    quantite == null ? null : roundQuantite(quantite),
    unite,
    prixUnitaire,
    montant,
  ];

  const isDimension = Boolean(row.isDimensionLine);

  if (isDimension) {
    if (row.showOuvrage && row.ouvrageNom) {
      sheetRows.push([row.ouvrageNom, ...emptyDataCells()]);
    }
    sheetRows.push([row.dimension || '', ...measureCells]);
    return;
  }

  // ind_dimension = 0 : ouvrage + chiffres sur la même ligne.
  if (row.showOuvrage && row.ouvrageNom) {
    sheetRows.push([row.ouvrageNom, ...measureCells]);
    return;
  }
  sheetRows.push(['', ...measureCells]);
}

/**
 * Génère et télécharge le devis au format Excel (.xlsx).
 */
export function downloadDevisExcel({
  entreprise,
  chantier,
  lignes = [],
  releve = null,
  fileName = 'devis.xlsx',
}) {
  const tableRows = buildDevisTableRows(lignes);
  const brutHt = lignes.reduce((sum, ligne) => sum + (Number(ligne.montant) || 0), 0);
  const facturation = computeReleveFacturation({
    lignesMontantTotal: brutHt,
    remise: releve?.remise ?? 0,
    indTva: releve?.ind_tva ?? 0,
    tvaTaux: releve?.tva_facture,
  });
  const afficheTva = Number(entreprise?.ind_pro) === 1 && facturation.applyTva;
  const montantArrete = afficheTva ? facturation.totalTtc : facturation.totalHt;
  const montantArreteLettres = montantEnLettresFcfa(montantArrete, { includeTtcLabel: afficheTva });
  const entete1 = String(entreprise?.entete_1 || '').trim();
  const entete2 = String(entreprise?.entete_2 || '').trim();

  const sheetRows = [
    [entreprise?.nom || 'Entreprise'],
    ...(entete1 ? [[entete1]] : []),
    ...(entete2 ? [[entete2]] : []),
    [],
    ['DEVIS ESTIMATIF'],
    [],
    ['Client :', chantier?.client_nom || 'Client', '', '', formatDevisDocumentDate()],
    ['Chantier :', chantier?.nom || 'Chantier'],
    [],
    ['Designation', 'Qté', 'U', 'P.U', 'Montant'],
  ];

  if (!tableRows.length) {
    sheetRows.push(['Aucune ligne', ...emptyDataCells()]);
  } else {
    tableRows.forEach((row) => {
      if (row.isSectionSeparator) {
        sheetRows.push([]);
        return;
      }
      if (row.isSectionHeader) {
        sheetRows.push([row.sectionNom || '', ...emptyDataCells()]);
        return;
      }
      appendDevisRowToSheet(sheetRows, row);
    });
  }

  sheetRows.push([]);
  sheetRows.push(['Remise', null, null, null, roundMontant(facturation.montantRemise)]);
  sheetRows.push(['Total HT', null, null, null, roundMontant(facturation.totalHt)]);
  if (afficheTva) {
    sheetRows.push(['TVA 18%', null, null, null, roundMontant(facturation.montantTva)]);
    sheetRows.push(['Total TTC', null, null, null, roundMontant(facturation.totalTtc)]);
  }
  sheetRows.push([]);
  sheetRows.push([
    `Arrêté le présent devis estimatif à la somme de ${montantArreteLettres}.`,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet['!cols'] = [
    { wch: 48 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Devis');
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
