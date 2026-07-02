/** Mesures et quantités : 2 décimales max. */
export function roundQuantite(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Montants et P.U. : arrondi à l'unité. */
export function roundMontant(value) {
  return Math.round(Number(value) || 0);
}

/**
 * Affichage mesure/qté : virgule décimale, décimaux seulement si nécessaires.
 * Ex. 10 → "10", 10.5 → "10,5", 10.987 → "10,99"
 */
export function formatMesureAffichage(value) {
  const rounded = roundQuantite(value);
  if (!Number.isFinite(rounded)) return '0';
  if (Math.abs(rounded - Math.trunc(rounded)) < 1e-9) {
    return String(Math.trunc(rounded));
  }
  const str = rounded.toFixed(2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return str.replace('.', ',');
}

/** Cote saisie (l, h, p, n) : respecte les décimaux entrés, arrondi à 2 max. */
export function formatCoteAffichage(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const numeric = Number(raw.replace(',', '.'));
  if (!Number.isFinite(numeric)) return raw.replace('.', ',');
  return formatMesureAffichage(numeric);
}

export function formatQuantite(value) {
  return formatMesureAffichage(value);
}

export function getLigneNomUnite(ligne) {
  return ligne?.nom_unite?.trim() || ligne?.unite_nom?.trim() || '';
}

export const isNomUnitePiece = (nomUnite) =>
  String(nomUnite || '')
    .trim()
    .toLowerCase() === 'u';

const getFormulaCoteFlags = (formule) => {
  const source = String(formule || 'l*h')
    .trim()
    .toLowerCase()
    .replace(/×/g, '*')
    .replace(/\s+/g, '')
    .replace(/x/g, '*')
    .replace(/\*+/g, '*');
  return {
    needsLargeur: /\bl\b/.test(source),
    needsHauteur: /\bh\b/.test(source),
    needsProfondeur: /\bp\b/.test(source) || /\be\b/.test(source),
  };
};

export const shouldAfficherFormuleDerivee = (ligne) =>
  isLigneDimension(ligne) && !isNomUnitePiece(getLigneNomUnite(ligne));

/** Cotes numeriques selon la formule (sans n) : ex. lxh → 120 x 80 */
export function formatLigneDimensionsSelonFormule(ligne) {
  if (!isLigneDimension(ligne)) return null;
  const { needsLargeur, needsHauteur, needsProfondeur } = getFormulaCoteFlags(ligne?.formule);
  const parts = [];
  if (needsLargeur && ligne.largeur != null && ligne.largeur !== '') {
    const formatted = formatCoteAffichage(ligne.largeur);
    if (formatted != null) parts.push(formatted);
  }
  if (needsHauteur && ligne.hauteur != null && ligne.hauteur !== '') {
    const formatted = formatCoteAffichage(ligne.hauteur);
    if (formatted != null) parts.push(formatted);
  }
  if (needsProfondeur && ligne.profondeur != null && ligne.profondeur !== '') {
    const formatted = formatCoteAffichage(ligne.profondeur);
    if (formatted != null) parts.push(formatted);
  }
  return parts.length ? parts.join(' x ') : '—';
}

/** PDF releve : resultat numerique de la formule apres les cotes, ex. = 9,60 m2 */
export function formatReleveDimensionEquivalence(ligne) {
  if (!shouldAfficherFormuleDerivee(ligne)) return null;
  const nomUnite = getLigneNomUnite(ligne);
  const qty = formatQuantite(Number(ligne?.quantite) || 0);
  return nomUnite ? `= ${qty} ${nomUnite}` : `= ${qty}`;
}

/** Article terrain : nom suivi du fournisseur entre parenthèses. */
export function formatArticleNomAvecFournisseur(articleNom, fournisseurNom) {
  const name = String(articleNom || '').trim();
  const fournisseur = String(fournisseurNom || '').trim();
  if (!name) return fournisseur ? `(${fournisseur})` : '';
  if (!fournisseur) return name;
  return `${name} (${fournisseur})`;
}

/** PDF relevés : formule dimension avec espaces + n, ex. lxhxe → l x h x e x n */
export function formatFormuleDimensionLabel(formule) {
  const source = String(formule || 'lxh').trim().toLowerCase();
  const letters = [];
  const seen = new Set();

  for (const match of source.matchAll(/[lhpe]/g)) {
    const letter = match[0];
    if (seen.has(letter)) continue;
    seen.add(letter);
    letters.push(letter);
  }

  if (!letters.length) {
    letters.push('l', 'h');
  }

  letters.push('n');
  return letters.join(' x ');
}

/** Libellé type unité pour écrans base de données : Dimension (l x h x n) ou Unitaire (n). */
export function formatUniteTypeLabel(indDimension, formule = null) {
  if (Number(indDimension) === 1) {
    return `Dimension (${formatFormuleDimensionLabel(formule)})`;
  }
  return 'Unitaire (n)';
}

/** PDF devis / relevés : dimension → (formule), unitaire → (nom_unite) ex. Carreau 60x60 (m2). */
export function formatOuvrageNomAvecUnite(ouvrageNom, nomUnite, indDimension, formule = null) {
  const name = String(ouvrageNom || '').trim() || 'Ouvrage';
  if (Number(indDimension) === 1) {
    return `${name} (${formatFormuleDimensionLabel(formule)})`;
  }
  const unite = String(nomUnite || '').trim();
  return unite ? `${name} (${unite})` : name;
}

/** ind_dimension = 1 : affichage = nombre (n), calculs = quantite. */
export const isLigneDimension = (ligne) => Number(ligne?.ind_dimension) === 1;

export function getLigneQuantiteAffichage(ligne) {
  if (isLigneDimension(ligne)) {
    return Number(ligne?.nombre) || 0;
  }
  return Number(ligne?.quantite) || 0;
}

export function formatLigneQuantiteAffichage(ligne) {
  return formatQuantite(getLigneQuantiteAffichage(ligne));
}

export function getLignePrixUnitaireApplique(ligne) {
  return roundMontant(ligne?.prix_unitaire_applique);
}

/** P.U catalogue ouvrage_unite (reference, distinct du P.U applique editable). */
export function getLignePrixUnitaireCatalogue(ligne) {
  return Number(ligne?.prix_unitaire ?? ligne?.ouvrage_unite_prix_unitaire) || 0;
}

/** Colonne P.U dans les ecrans terrain (details, recap, pave). */
export function getLignePrixUnitaireAffichage(ligne) {
  return getLignePrixUnitaireApplique(ligne);
}

/** Montant = P.U applique x n (nombre). */
export function getLigneMontant(ligne) {
  const stored = Number(ligne?.montant);
  if (Number.isFinite(stored) && ligne?.montant != null && ligne?.montant !== '') {
    return roundMontant(stored);
  }
  return roundMontant(getLignePrixUnitaireApplique(ligne) * (Number(ligne?.nombre) || 0));
}

function pushCotePart(parts, value) {
  const formatted = formatCoteAffichage(value);
  if (formatted != null) parts.push(formatted);
}

export function formatLigneMesures(ligne) {
  const parts = [];
  pushCotePart(parts, ligne.largeur);
  pushCotePart(parts, ligne.hauteur);
  pushCotePart(parts, ligne.profondeur);
  if (!isLigneDimension(ligne)) {
    pushCotePart(parts, ligne.nombre ?? 0);
  }
  return parts.length ? parts.join(' x ') : '—';
}

export function formatLigneDimensions(ligne) {
  const parts = [];
  pushCotePart(parts, ligne.largeur);
  pushCotePart(parts, ligne.hauteur);
  pushCotePart(parts, ligne.profondeur);
  return parts.length ? parts.join(' x ') : '—';
}

/** Dimensions PDF : L x H x [P] x N pour les lignes ind_dimension = 1. */
export function formatLigneDimensionsLxhN(ligne) {
  if (!isLigneDimension(ligne)) return null;
  const parts = [];
  pushCotePart(parts, ligne.largeur);
  pushCotePart(parts, ligne.hauteur);
  pushCotePart(parts, ligne.profondeur);
  pushCotePart(parts, ligne.nombre);
  return parts.length ? parts.join(' x ') : null;
}

/** Dimensions PDF : ind_dimension = 0 (unitaire) : affichage du nombre (n) uniquement. */
export function formatLigneNombrePdf(ligne) {
  if (isLigneDimension(ligne)) return null;
  if (ligne.nombre == null || ligne.nombre === '') return '0';
  return formatCoteAffichage(ligne.nombre) ?? '0';
}

export function formatMontant(value) {
  return formatMontantFcfa(value);
}

export function formatMontantFcfa(value) {
  const amount = roundMontant(value);
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
}
