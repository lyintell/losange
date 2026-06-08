export function roundQuantite(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatQuantite(value) {
  return roundQuantite(value).toFixed(2);
}

export function getLigneNomUnite(ligne) {
  return ligne?.nom_unite?.trim() || ligne?.unite_nom?.trim() || '';
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
  return Number(ligne?.prix_unitaire_applique) || 0;
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
    return roundQuantite(stored);
  }
  return roundQuantite(getLignePrixUnitaireApplique(ligne) * (Number(ligne?.nombre) || 0));
}

export function formatLigneMesures(ligne) {
  const parts = [];
  if (ligne.largeur != null && ligne.largeur !== '') parts.push(String(ligne.largeur));
  if (ligne.hauteur != null && ligne.hauteur !== '') parts.push(String(ligne.hauteur));
  if (ligne.profondeur != null && ligne.profondeur !== '') parts.push(String(ligne.profondeur));
  if (!isLigneDimension(ligne)) {
    parts.push(String(ligne.nombre ?? 0));
  }
  return parts.length ? parts.join(' x ') : '—';
}

export function formatLigneDimensions(ligne) {
  const parts = [];
  if (ligne.largeur != null && ligne.largeur !== '') parts.push(String(ligne.largeur));
  if (ligne.hauteur != null && ligne.hauteur !== '') parts.push(String(ligne.hauteur));
  if (ligne.profondeur != null && ligne.profondeur !== '') parts.push(String(ligne.profondeur));
  return parts.length ? parts.join(' x ') : '—';
}

/** Dimensions PDF : L x H x [P] x N pour les lignes ind_dimension = 1. */
export function formatLigneDimensionsLxhN(ligne) {
  if (!isLigneDimension(ligne)) return null;
  const parts = [];
  if (ligne.largeur != null && ligne.largeur !== '') parts.push(String(ligne.largeur));
  if (ligne.hauteur != null && ligne.hauteur !== '') parts.push(String(ligne.hauteur));
  if (ligne.profondeur != null && ligne.profondeur !== '') parts.push(String(ligne.profondeur));
  if (ligne.nombre != null && ligne.nombre !== '') parts.push(String(ligne.nombre));
  return parts.length ? parts.join(' x ') : null;
}

/** Dimensions PDF : ind_dimension = 0 (unitaire) : affichage du nombre (n) uniquement. */
export function formatLigneNombrePdf(ligne) {
  if (isLigneDimension(ligne)) return null;
  if (ligne.nombre == null || ligne.nombre === '') return '0';
  return String(ligne.nombre);
}

export function formatMontant(value) {
  return formatMontantFcfa(value);
}

export function formatMontantFcfa(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
}
