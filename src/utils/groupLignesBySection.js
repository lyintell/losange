import { DEFAULT_SECTION_NOM } from './defaultSection';

export function groupLignesBySection(lignes = [], sectionOrder = null) {
  const groups = new Map();

  [...lignes]
    .sort(
      (left, right) =>
        (Number(left.ordre) || 0) - (Number(right.ordre) || 0) ||
        String(left.id || '').localeCompare(String(right.id || ''))
    )
    .forEach((ligne) => {
    const sectionId = ligne.section_id || 'sans-section';
    const sectionNom = ligne.section_nom?.trim() || DEFAULT_SECTION_NOM;
    const sectionOrdre = Number(ligne.section_ordre);

    if (!groups.has(sectionId)) {
      groups.set(sectionId, {
        sectionId,
        sectionNom,
        sectionOrdre: Number.isFinite(sectionOrdre) ? sectionOrdre : groups.size,
        lignes: [],
      });
    }

    groups.get(sectionId).lignes.push(ligne);
  });

  let result = Array.from(groups.values()).map((group) => ({
    ...group,
    lignes: [...group.lignes].sort(
      (left, right) =>
        (Number(left.ordre) || 0) - (Number(right.ordre) || 0) ||
        String(left.id || '').localeCompare(String(right.id || ''))
    ),
  }));

  if (Array.isArray(sectionOrder) && sectionOrder.length) {
    const orderMap = new Map(sectionOrder.map((id, index) => [id, index]));
    result.sort(
      (left, right) =>
        (orderMap.get(left.sectionId) ?? left.sectionOrdre ?? 999) -
        (orderMap.get(right.sectionId) ?? right.sectionOrdre ?? 999)
    );
  } else {
    result.sort(
      (left, right) =>
        (left.sectionOrdre ?? 0) - (right.sectionOrdre ?? 0) ||
        left.sectionNom.localeCompare(right.sectionNom, 'fr', { sensitivity: 'base' })
    );
  }

  return result;
}

export function buildSectionOrderFromLignes(lignes = []) {
  const order = [];
  const seen = new Set();

  const sorted = [...lignes].sort(
    (left, right) =>
      (Number(left.ordre) || 0) - (Number(right.ordre) || 0) ||
      (Number(left.section_ordre) || 0) - (Number(right.section_ordre) || 0) ||
      String(left.section_nom || '').localeCompare(String(right.section_nom || ''), 'fr', {
        sensitivity: 'base',
      })
  );

  sorted.forEach((ligne) => {
    const sectionId = ligne.section_id || 'sans-section';
    if (seen.has(sectionId)) return;
    seen.add(sectionId);
    order.push(sectionId);
  });

  return order;
}
