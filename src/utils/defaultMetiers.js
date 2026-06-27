/** Gabarits affichés à la présélection (pas des lignes BDD partagées). */
export const DEFAULT_METIER_TEMPLATES = [
  { templateKey: 'menuiserie-alu', nom: 'Menuiserie alu', abbrev: 'MAL', ordre: 0 },
  { templateKey: 'menuiserie-metallique', nom: 'Menuiserie métallique', abbrev: 'MME', ordre: 1 },
  { templateKey: 'vitrage-verre', nom: 'Vitrage et verre', abbrev: 'VVE', ordre: 2 },
  { templateKey: 'gros-oeuvres', nom: 'Gros oeuvres', abbrev: 'GOE', ordre: 3 },
  { templateKey: 'peinture', nom: 'Peinture', abbrev: 'PEI', ordre: 4 },
  { templateKey: 'carrelage', nom: 'Carrélage', abbrev: 'CAR', ordre: 5 },
  { templateKey: 'electricite-clim', nom: 'Électricité et clim', abbrev: 'ELC', ordre: 6 },
  { templateKey: 'courant-faible', nom: 'Courant faible', abbrev: 'CFA', ordre: 7 },
  { templateKey: 'plomberie-sanitaire', nom: 'Plomberie et sanitaire', abbrev: 'PLS', ordre: 8 },
  { templateKey: 'etancheite-toiture', nom: 'Étanchéité et toiture', abbrev: 'ETO', ordre: 9 },
  { templateKey: 'divers', nom: 'Divers', abbrev: 'DIV', ordre: 10 },
];

/** @deprecated */
export const DEFAULT_METIERS = DEFAULT_METIER_TEMPLATES;
