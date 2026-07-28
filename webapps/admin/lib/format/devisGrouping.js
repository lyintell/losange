import {
  formatCoteAffichage,
  formatLigneDimensionsLxhN,
  formatLigneDimensionsSelonFormule,
  formatLigneMesures,
  formatLigneNombrePdf,
  formatLigneQuantiteAffichage,
  formatOuvrageNomAvecUnite,
  formatQuantite,
  formatReleveDimensionEquivalence,
  getLigneMontant,
  getLigneNomUnite,
  getLignePrixUnitaireApplique,
  isLigneDimension,
  shouldAfficherFormuleDerivee,
} from './formatLigneMesures';
import { isDefaultSectionNom } from './defaultSection';
import { getMetierColor } from './metierColors';
import { groupLignesByMetier } from './groupLignesByMetier';
import { groupLignesBySection } from './groupLignesBySection';
import { getLigneOuvrageNomPourDevis } from './ouvrageNomDevis';

export function formatDevisDimension(ligne) {
  if (!isLigneDimension(ligne)) return null;
  if (shouldAfficherFormuleDerivee(ligne)) {
    const dims = formatLigneDimensionsSelonFormule(ligne);
    const nFormatted = formatCoteAffichage(ligne?.nombre);
    if (dims && dims !== '—' && nFormatted != null) {
      return `${dims} x ${nFormatted}`;
    }
    return dims;
  }
  return formatLigneMesures(ligne);
}

/** Chiffre quantité seul (colonne Qté). */
export function formatDevisQuantiteValeur(ligne) {
  if (shouldAfficherFormuleDerivee(ligne)) {
    return formatQuantite(Number(ligne?.quantite) || 0);
  }
  return formatLigneQuantiteAffichage(ligne);
}

/** Unité seule (colonne U). */
export function formatDevisUnite(ligne) {
  return getLigneNomUnite(ligne) || '';
}

export function formatDevisQuantite(ligne) {
  const qty = formatDevisQuantiteValeur(ligne);
  const nomUnite = formatDevisUnite(ligne);
  return nomUnite ? `${qty} ${nomUnite}` : qty;
}

/** Designation devis : nom ouvrage seul (sans formule l x h x n). */
export function formatDevisOuvrageDesignation(ligne) {
  return getLigneOuvrageNomPourDevis(ligne);
}

function groupByMetierThenOuvrageInOrder(lignes = []) {
  const metierOrder = [];
  const metierMap = new Map();

  [...lignes]
    .sort(
      (left, right) =>
        (Number(left.metier_ordre) || 0) - (Number(right.metier_ordre) || 0) ||
        (Number(left.ordre) || 0) - (Number(right.ordre) || 0) ||
        String(left.id || '').localeCompare(String(right.id || ''))
    )
    .forEach((ligne) => {
    const metierNom = ligne.metier_nom?.trim() || 'Autre';
    const metierId = ligne.metier_id || metierNom;
    const ouvrageNom = formatDevisOuvrageDesignation(ligne);
    const nomUnite = getLigneNomUnite(ligne);
    const isDimension = isLigneDimension(ligne);
    const ouvrageKey = `${metierId}::${getLigneOuvrageNomPourDevis(ligne)}::${isDimension ? `dim::${ligne.formule || ''}::${nomUnite}` : nomUnite}`;

    if (!metierMap.has(metierId)) {
      metierOrder.push(metierId);
      metierMap.set(metierId, {
        metierId,
        metierNom,
        ouvrageOrder: [],
        ouvrageMap: new Map(),
      });
    }

    const metierGroup = metierMap.get(metierId);
    if (!metierGroup.ouvrageMap.has(ouvrageKey)) {
      metierGroup.ouvrageOrder.push(ouvrageKey);
      metierGroup.ouvrageMap.set(ouvrageKey, {
        ouvrageNom,
        lignes: [],
      });
    }

    metierGroup.ouvrageMap.get(ouvrageKey).lignes.push(ligne);
  });

  return metierOrder.map((metierId) => {
    const metierGroup = metierMap.get(metierId);
    return {
      metierId: metierGroup.metierId,
      metierNom: metierGroup.metierNom,
      ouvrages: metierGroup.ouvrageOrder.map((ouvrageKey) => metierGroup.ouvrageMap.get(ouvrageKey)),
    };
  });
}

function buildOuvrageKey(metierId, ligne) {
  const ouvrageNom = getLigneOuvrageNomPourDevis(ligne);
  const nomUnite = getLigneNomUnite(ligne);
  const isDimension = isLigneDimension(ligne);
  return `${metierId}::${ouvrageNom}::${isDimension ? `dim::${ligne.formule || ''}` : nomUnite}`;
}

function buildOuvrageLabel(ligne) {
  const ouvrageNom = ligne.ouvrage_nom?.trim() || 'Ouvrage';
  const nomUnite = getLigneNomUnite(ligne);
  const isDimension = isLigneDimension(ligne);
  return formatOuvrageNomAvecUnite(ouvrageNom, nomUnite, isDimension ? 1 : 0, ligne.formule);
}

/** PDF relevés : sections puis métiers, ordre de saisie conservé. */
export function buildRelevesTableRows(lignes = [], sectionOrder = null) {
  const sectionGroups = groupLignesBySection(lignes, sectionOrder);
  const rows = [];
  let hasPreviousContent = false;

  sectionGroups.forEach((sectionGroup) => {
    const isDefaultSection = isDefaultSectionNom(sectionGroup.sectionNom);
    const metierGroups = groupLignesByMetier(sectionGroup.lignes);

    if (hasPreviousContent && sectionGroup.lignes.length) {
      rows.push({ isSectionSeparator: true });
    }

    if (!isDefaultSection && sectionGroup.lignes.length) {
      rows.push({ isSectionHeader: true, sectionNom: sectionGroup.sectionNom });
    }

    metierGroups.forEach((metierGroup, metierIndex) => {
      let previousOuvrageKey = null;

      metierGroup.lignes.forEach((ligne, ligneIndex) => {
        const ouvrageKey = buildOuvrageKey(metierGroup.metierId, ligne);
        const showOuvrage = ouvrageKey !== previousOuvrageKey;
        previousOuvrageKey = ouvrageKey;

        rows.push({
          metierDivider: metierIndex > 0 && ligneIndex === 0,
          showMetier: ligneIndex === 0,
          showOuvrage,
          metierId: metierGroup.metierId,
          metierNom: metierGroup.metierNom,
          metierColor: getMetierColor(metierGroup.metierId),
          ouvrageNom: buildOuvrageLabel(ligne),
          dimension: formatDevisDimension(ligne),
          dimensionLxhN: formatLigneDimensionsLxhN(ligne),
          dimensionEquivalence: formatReleveDimensionEquivalence(ligne),
          nombrePdf: formatLigneNombrePdf(ligne),
          isDimensionLine: isLigneDimension(ligne),
          note: ligne.note?.trim() || '',
          indComplete: Number(ligne.ind_complete) === 1,
        });
      });
    });

    if (sectionGroup.lignes.length) {
      hasPreviousContent = true;
    }
  });

  return rows;
}

export function buildDevisTableRows(lignes = [], sectionOrder = null) {
  const sectionGroups = groupLignesBySection(lignes, sectionOrder);
  const rows = [];
  let hasPreviousContent = false;

  sectionGroups.forEach((sectionGroup) => {
    const isDefaultSection = isDefaultSectionNom(sectionGroup.sectionNom);
    const metierGroups = groupByMetierThenOuvrageInOrder(sectionGroup.lignes);

    if (hasPreviousContent && sectionGroup.lignes.length) {
      rows.push({ isSectionSeparator: true });
    }

    if (!isDefaultSection && sectionGroup.lignes.length) {
      rows.push({ isSectionHeader: true, sectionNom: sectionGroup.sectionNom });
    }

    metierGroups.forEach((metierGroup) => {
      metierGroup.ouvrages.forEach((ouvrageGroup, ouvrageIndex) => {
        const ligneCount = ouvrageGroup.lignes.length;
        ouvrageGroup.lignes.forEach((ligne, ligneIndex) => {
          rows.push({
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
            note_2: ligne.note_2?.trim() || '',
            quantiteLabel: formatDevisQuantiteValeur(ligne),
            uniteLabel: formatDevisUnite(ligne),
            prixUnitaire: getLignePrixUnitaireApplique(ligne),
            montant: getLigneMontant(ligne),
          });
        });
      });
    });

    if (sectionGroup.lignes.length) {
      hasPreviousContent = true;
    }
  });

  return rows;
}
