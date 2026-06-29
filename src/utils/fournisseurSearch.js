export function normalizeFournisseurNom(nom) {
  return String(nom || '').trim().toLocaleLowerCase('fr');
}

export function findExactFournisseurMatch(results, nom) {
  const normalized = normalizeFournisseurNom(nom);
  if (!normalized) return null;
  return (
    (results || []).find(
      (fournisseur) => normalizeFournisseurNom(fournisseur.nom) === normalized
    ) || null
  );
}

export function resolveFournisseurPayload({ fournisseurNom, selectedFournisseurId, searchResults }) {
  const trimmedNom = String(fournisseurNom || '').trim();
  if (!trimmedNom) {
    return { fournisseurId: null, fournisseurNom: null };
  }

  if (selectedFournisseurId) {
    return { fournisseurId: selectedFournisseurId, fournisseurNom: null };
  }

  const exactMatch = findExactFournisseurMatch(searchResults, trimmedNom);
  if (exactMatch) {
    return { fournisseurId: exactMatch.id, fournisseurNom: null };
  }

  return { fournisseurId: null, fournisseurNom: trimmedNom };
}

export function formatFournisseurSubtitle(fournisseur) {
  const phones = [fournisseur.telephone_1, fournisseur.telephone_2].filter(Boolean);
  return phones.join(' · ');
}
