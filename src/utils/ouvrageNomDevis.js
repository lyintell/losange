export function resolveOuvrageNomPourDevis(nom, nomDevis) {
  const devisNom = String(nomDevis ?? '').trim();
  if (devisNom) return devisNom;
  const catalogueNom = String(nom ?? '').trim();
  return catalogueNom || 'Ouvrage';
}

export function getLigneOuvrageNomPourDevis(ligne) {
  return resolveOuvrageNomPourDevis(ligne?.ouvrage_nom, ligne?.ouvrage_nom_devis);
}
