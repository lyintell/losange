export const DEFAULT_SECTION_NOM = 'Pas de section';

export const isDefaultSectionNom = (nom) =>
  String(nom || '').trim().toLowerCase() === DEFAULT_SECTION_NOM.toLowerCase();

export const sortSectionsForSelection = (sections = []) =>
  [...sections].sort((left, right) => {
    const leftDefault = isDefaultSectionNom(left?.nom);
    const rightDefault = isDefaultSectionNom(right?.nom);
    if (leftDefault && !rightDefault) return -1;
    if (!leftDefault && rightDefault) return 1;
    return String(left?.nom || '').localeCompare(String(right?.nom || ''), 'fr', {
      sensitivity: 'base',
    });
  });
