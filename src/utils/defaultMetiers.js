/** Métiers globaux Losange (entreprise_id NULL) — ordre d'affichage par défaut. */
export const DEFAULT_METIERS = [
  { id: 'metier-menuiserie-alu', nom: 'Menuiserie alu', abbrev: 'MAL', ordre: 0 },
  { id: 'metier-menuiserie-metallique', nom: 'Menuiserie métallique', abbrev: 'MME', ordre: 1 },
  { id: 'metier-vitrage-verre', nom: 'Vitrage et verre', abbrev: 'VVE', ordre: 2 },
  { id: 'metier-gros-oeuvres', nom: 'Gros oeuvres', abbrev: 'GOE', ordre: 3 },
  { id: 'metier-peinture', nom: 'Peinture', abbrev: 'PEI', ordre: 4 },
  { id: 'metier-carrelage', nom: 'Carrélage', abbrev: 'CAR', ordre: 5 },
  { id: 'metier-electricite-clim', nom: 'Électricité et clim', abbrev: 'ELC', ordre: 6 },
  { id: 'metier-courant-faible', nom: 'Courant faible', abbrev: 'CFA', ordre: 7 },
  { id: 'metier-plomberie-sanitaire', nom: 'Plomberie et sanitaire', abbrev: 'PLS', ordre: 8 },
  { id: 'metier-etancheite-toiture', nom: 'Étanchéité et toiture', abbrev: 'ETO', ordre: 9 },
  { id: 'metier-divers', nom: 'Divers', abbrev: 'DIV', ordre: 10 },
];

export const DEFAULT_METIER_IDS = DEFAULT_METIERS.map((metier) => metier.id);

export const isDefaultMetierId = (metierId) => DEFAULT_METIER_IDS.includes(String(metierId || ''));
