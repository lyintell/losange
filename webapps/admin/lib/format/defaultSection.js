export const DEFAULT_SECTION_NOM = 'Pas de section';

export const isDefaultSectionNom = (nom) =>
  String(nom || '').trim().toLowerCase() === DEFAULT_SECTION_NOM.toLowerCase();
