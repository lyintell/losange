export function groupLignesByMetier(lignes = []) {
  const groups = new Map();

  [...lignes]
    .sort(
      (left, right) =>
        (Number(left.ordre) || 0) - (Number(right.ordre) || 0) ||
        String(left.id || '').localeCompare(String(right.id || ''))
    )
    .forEach((ligne) => {
    const metierNom = ligne.metier_nom?.trim() || 'Autre';
    const metierId = ligne.metier_id || metierNom;

    if (!groups.has(metierId)) {
      groups.set(metierId, {
        metierId,
        metierNom,
        lignes: [],
      });
    }

    groups.get(metierId).lignes.push(ligne);
  });

  return Array.from(groups.values());
}
