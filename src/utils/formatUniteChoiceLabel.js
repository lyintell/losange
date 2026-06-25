/**
 * Libellé pour le choix d'une unité catalogue ou ouvrage_unite.
 * ind_dimension = 1 : formule (nom_unite), ex. lxh (m2)
 * ind_dimension = 0 : nom uniquement
 */
export const formatUniteChoiceLabel = (unite) => {
  if (!unite) return 'Unité';

  if (Number(unite.ind_dimension) === 1) {
    const formule = String(unite.formule || '').trim() || unite.nom || 'Unité';
    const nomUnite = String(unite.nom_unite || '').trim();
    return nomUnite ? `${formule} (${nomUnite})` : formule;
  }

  const nom = unite.nom || unite.nom_unite || 'Unité';
  return nom;
};
