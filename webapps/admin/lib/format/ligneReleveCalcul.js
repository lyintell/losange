import { isNomUnitePiece, roundMontant, roundQuantite } from './formatLigneMesures';

/**
 * Symboles ligne_releve : l=largeur, h=hauteur, p/e=épaisseur (profondeur), n=nombre.
 * ind_dimension=0 : quantite unitaire = n.
 * ind_dimension=1 : quantite = eval(unites.formule) * n (ex. l*h*n, l*h*e*n).
 * l, h, p/e sont saisis en cm et convertis en m avant le calcul.
 *
 * Dimension + nom_unite != u (m2, m3…) :
 *   P.U appliqué = P.U catalogue ; Quantité = formule × n ; Montant = P.U × Quantité.
 * Dimension + nom_unite = u :
 *   P.U appliqué = P.U catalogue × formule(l,h,p) ; Quantité = n ; Montant = P.U × Quantité.
 */

const normalizeFormulaString = (raw) => {
  if (!raw) return 'l*h';
  let formula = String(raw).trim().toLowerCase();
  formula = formula.replace(/×/g, '*');
  formula = formula.replace(/\s+/g, '');
  formula = formula.replace(/x/g, '*');
  formula = formula.replace(/([lhpe])(?=[lhpe0-9(])/g, '$1*');
  formula = formula.replace(/(\))(?=[lhpe0-9(])/g, '$1*');
  formula = formula.replace(/([0-9])(?=[lhpe(])/g, '$1*');
  formula = formula.replace(/\*+/g, '*');
  return formula;
};

const evaluateDimensionFormula = (formula, { l, h, p }) => {
  let expr = normalizeFormulaString(formula);
  expr = expr.replace(/\bl\b/g, String(l));
  expr = expr.replace(/\bh\b/g, String(h));
  expr = expr.replace(/\bp\b/g, String(p));
  expr = expr.replace(/\be\b/g, String(p));

  if (!/^[0-9+\-*/().]+$/.test(expr)) {
    throw new Error(`Formule invalide: ${formula}`);
  }

  const value = Function(`"use strict"; return (${expr});`)();
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Resultat de formule invalide: ${formula}`);
  }
  return numeric;
};

export const usesDimensionCotes = (indDimension) => Number(indDimension) === 1;

export const getRequiredCotesFromFormula = (formule, indDimension) => {
  if (Number(indDimension) !== 1) {
    return {
      needsLargeur: false,
      needsHauteur: false,
      needsProfondeur: false,
      hasDimensionFormula: false,
    };
  }

  const source = normalizeFormulaString(formule || 'l*h');
  const needsLargeur = /\bl\b/.test(source);
  const needsHauteur = /\bh\b/.test(source);
  const needsProfondeur = /\bp\b/.test(source) || /\be\b/.test(source);

  return {
    needsLargeur,
    needsHauteur,
    needsProfondeur,
    hasDimensionFormula: needsLargeur || needsHauteur || needsProfondeur,
  };
};

export const computeDimensionFactor = ({ formule, largeur, hauteur, profondeur }) => {
  const l = (Number(largeur) || 0) / 100;
  const h = (Number(hauteur) || 0) / 100;
  const p = (Number(profondeur) || 0) / 100;
  const formulaSource = (formule && String(formule).trim()) || 'l*h';
  return evaluateDimensionFormula(formulaSource, { l, h, p });
};

export const computeQuantiteLigneReleve = ({
  indDimension,
  formule,
  largeur,
  hauteur,
  profondeur,
  nombre,
}) => {
  const n = Number(nombre) || 0;

  if (Number(indDimension) !== 1) {
    return roundQuantite(n);
  }

  const dimensionValue = computeDimensionFactor({ formule, largeur, hauteur, profondeur });
  return roundQuantite(dimensionValue * n);
};

/** Dimension mesurée (m2…) : P.U reste au catalogue. Pièce (u) : P.U × formule. */
export const usesCataloguePuAsApplique = (indDimension, nomUnite) =>
  Number(indDimension) === 1 && !isNomUnitePiece(nomUnite);

/** P.U applique par defaut selon ind_dimension + nom_unite. */
export const computePrixUnitaireAppliqueDefault = ({
  indDimension,
  prixUnitaire,
  formule,
  largeur,
  hauteur,
  profondeur,
  nomUnite,
}) => {
  const pu = Number(prixUnitaire) || 0;
  if (Number(indDimension) !== 1) {
    return roundMontant(pu);
  }

  // m2, m3… : P.U appliqué = P.U catalogue (pas × l × h)
  if (!isNomUnitePiece(nomUnite)) {
    return roundMontant(pu);
  }

  // u : comportement historique — P.U × formule(l,h,p)
  const dimensionValue = computeDimensionFactor({ formule, largeur, hauteur, profondeur });
  return roundMontant(pu * dimensionValue);
};

/** P.R appliqué par défaut : même logique que P.U appliqué, à partir du P.R catalogue. */
export const computePrixRevientAppliqueDefault = ({
  indDimension,
  prixRevient,
  formule,
  largeur,
  hauteur,
  profondeur,
  nomUnite,
}) => {
  if (prixRevient == null || prixRevient === '') return null;
  return computePrixUnitaireAppliqueDefault({
    indDimension,
    prixUnitaire: prixRevient,
    formule,
    largeur,
    hauteur,
    profondeur,
    nomUnite,
  });
};

/** Quantité utilisée pour le montant (= quantité affichée devis / recap). */
export const resolveQuantitePourMontant = ({
  quantite,
  nombre,
  indDimension,
  nomUnite,
}) => {
  // m2, m3… : Quantité = formule × n (colonne quantite)
  if (usesCataloguePuAsApplique(indDimension, nomUnite)) {
    if (quantite != null && quantite !== '') return Number(quantite) || 0;
    return Number(nombre) || 0;
  }
  // u : Quantité affichée = n ; unitaire : quantite (= n)
  if (Number(indDimension) === 1) {
    return Number(nombre) || 0;
  }
  if (quantite != null && quantite !== '') return Number(quantite) || 0;
  return Number(nombre) || 0;
};

/** Montant = P.U appliqué × Quantité. */
export const computeMontantLigneReleve = ({
  prixUnitaireApplique,
  quantite,
  nombre,
  indDimension,
  nomUnite,
}) => {
  const qty = resolveQuantitePourMontant({
    quantite,
    nombre,
    indDimension,
    nomUnite,
  });
  return roundMontant((Number(prixUnitaireApplique) || 0) * qty);
};
