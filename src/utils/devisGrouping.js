import {
  formatLigneDimensionsLxhN,
  formatLigneMesures,
  formatLigneNombrePdf,
  formatLigneQuantiteAffichage,
  getLigneNomUnite,
  getLignePrixUnitaireAffichage,
  isLigneDimension,
} from './formatLigneMesures';
import { getMetierColor } from './metierColors';

export function formatDevisDimension(ligne) {
  if (!isLigneDimension(ligne)) return null;
  return formatLigneMesures(ligne);
}

export function formatDevisQuantite(ligne) {
  const qty = formatLigneQuantiteAffichage(ligne);
  const nomUnite = getLigneNomUnite(ligne);
  return nomUnite ? `${qty} ${nomUnite}` : qty;
}

function groupByMetierThenOuvrage(lignes = []) {
  const metierMap = new Map();

  lignes.forEach((ligne) => {
    const metierNom = ligne.metier_nom?.trim() || 'Autre';
    const metierId = ligne.metier_id || metierNom;
    const ouvrageNom = ligne.ouvrage_nom?.trim() || 'Ouvrage';
    const ouvrageKey = `${metierId}::${ouvrageNom}`;

    if (!metierMap.has(metierId)) {
      metierMap.set(metierId, {
        metierId,
        metierNom,
        ouvrageMap: new Map(),
      });
    }

    const metierGroup = metierMap.get(metierId);
    if (!metierGroup.ouvrageMap.has(ouvrageKey)) {
      metierGroup.ouvrageMap.set(ouvrageKey, {
        ouvrageNom,
        lignes: [],
      });
    }

    metierGroup.ouvrageMap.get(ouvrageKey).lignes.push(ligne);
  });

  return Array.from(metierMap.values())
    .sort((a, b) => a.metierNom.localeCompare(b.metierNom, 'fr', { sensitivity: 'base' }))
    .map((metierGroup) => ({
      metierId: metierGroup.metierId,
      metierNom: metierGroup.metierNom,
      ouvrages: Array.from(metierGroup.ouvrageMap.values())
        .sort((a, b) => a.ouvrageNom.localeCompare(b.ouvrageNom, 'fr', { sensitivity: 'base' }))
        .map((ouvrageGroup) => ({
          ouvrageNom: ouvrageGroup.ouvrageNom,
          lignes: ouvrageGroup.lignes,
        })),
    }));
}

export function buildDevisTableRows(lignes = []) {
  const metierGroups = groupByMetierThenOuvrage(lignes);
  const rows = [];

  metierGroups.forEach((metierGroup, metierIndex) => {
    metierGroup.ouvrages.forEach((ouvrageGroup, ouvrageIndex) => {
      const ligneCount = ouvrageGroup.lignes.length;
      ouvrageGroup.lignes.forEach((ligne, ligneIndex) => {
        rows.push({
          metierDivider: metierIndex > 0 && ouvrageIndex === 0 && ligneIndex === 0,
          ouvrageLigneSuite: ligneIndex > 0,
          ouvrageLigneBeforeSuite: ligneIndex < ligneCount - 1,
          showMetier: ouvrageIndex === 0 && ligneIndex === 0,
          showOuvrage: ligneIndex === 0,
          metierId: metierGroup.metierId,
          metierNom: metierGroup.metierNom,
          metierColor: getMetierColor(metierGroup.metierId),
          ouvrageNom: ouvrageGroup.ouvrageNom,
          dimension: formatDevisDimension(ligne),
          dimensionLxhN: formatLigneDimensionsLxhN(ligne),
          nombrePdf: formatLigneNombrePdf(ligne),
          isDimensionLine: isLigneDimension(ligne),
          note: ligne.note?.trim() || '',
          quantiteLabel: formatDevisQuantite(ligne),
          prixUnitaire: getLignePrixUnitaireAffichage(ligne),
          montant: Number(ligne.montant) || 0,
        });
      });
    });
  });

  return rows;
}
