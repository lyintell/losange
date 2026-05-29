/**
 * Symboles ligne_releve : l=largeur, h=hauteur, p=profondeur, n=nombre.
 * Si ind_unitaire=1 ou ind_dimension=0 : quantite = n.
 * Si ind_dimension=1 et ind_unitaire=0 : quantite = eval(unites.formule) * n.
 * l, h, p sont saisis en cm et convertis en m avant le calcul.
 */

const normalizeFormulaString = (raw) => {
  if (!raw) return 'l*h';
  let formula = String(raw).trim().toLowerCase();
  formula = formula.replace(/×/g, '*');
  formula = formula.replace(/\s+/g, '');
  formula = formula.replace(/x/g, '*');
  formula = formula.replace(/([lhp])(?=[lhp0-9(])/g, '$1*');
  formula = formula.replace(/(\))(?=[lhp0-9(])/g, '$1*');
  formula = formula.replace(/([0-9])(?=[lhp(])/g, '$1*');
  formula = formula.replace(/\*+/g, '*');
  return formula;
};

const evaluateDimensionFormula = (formula, { l, h, p }) => {
  let expr = normalizeFormulaString(formula);
  expr = expr.replace(/\bl\b/g, String(l));
  expr = expr.replace(/\bh\b/g, String(h));
  expr = expr.replace(/\bp\b/g, String(p));

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

export const usesDimensionCotes = (indDimension, indUnitaire) =>
  Number(indDimension) === 1 && Number(indUnitaire) !== 1;

export const getRequiredCotesFromFormula = (formule, indDimension, indUnitaire) => {
  if (!usesDimensionCotes(indDimension, indUnitaire)) {
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
  const needsProfondeur = /\bp\b/.test(source);

  return {
    needsLargeur,
    needsHauteur,
    needsProfondeur,
    hasDimensionFormula: needsLargeur || needsHauteur || needsProfondeur,
  };
};

export const computeQuantiteLigneReleve = ({
  indDimension,
  indUnitaire,
  formule,
  largeur,
  hauteur,
  profondeur,
  nombre,
}) => {
  const n = Number(nombre) || 0;

  if (Number(indUnitaire) === 1 || Number(indDimension) !== 1) {
    return n;
  }

  const l = (Number(largeur) || 0) / 100;
  const h = (Number(hauteur) || 0) / 100;
  const p = (Number(profondeur) || 0) / 100;
  const formulaSource = (formule && String(formule).trim()) || 'l*h';

  const dimensionValue = evaluateDimensionFormula(formulaSource, { l, h, p });
  return dimensionValue * n;
};
