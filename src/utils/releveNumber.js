function compareReleveCreationAsc(a, b) {
  const aTime = new Date(a?.cree_le || 0).getTime();
  const bTime = new Date(b?.cree_le || 0).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

function compareReleveCreationDesc(a, b) {
  const aTime = new Date(a?.cree_le || 0).getTime();
  const bTime = new Date(b?.cree_le || 0).getTime();
  if (aTime !== bTime) return bTime - aTime;
  return String(b?.id || '').localeCompare(String(a?.id || ''));
}

/** Numéro stable par ordre de création (1 = premier relevé du chantier). */
export function buildReleveNumberMap(releves = []) {
  const map = new Map();
  [...releves].sort(compareReleveCreationAsc).forEach((releve, index) => {
    if (releve?.id) map.set(releve.id, index + 1);
  });
  return map;
}

export function getReleveNumber(releves = [], releveId) {
  if (!releveId) return 1;
  return buildReleveNumberMap(releves).get(releveId) || 1;
}

/** Affichage décroissant (plus récent en premier) + champ numero. */
export function withReleveNumbers(releves = []) {
  if (!releves.length) return [];

  const numeroById = buildReleveNumberMap(releves);

  return [...releves]
    .sort(compareReleveCreationDesc)
    .map((releve) => ({
      ...releve,
      numero: numeroById.get(releve.id) || 1,
    }));
}
