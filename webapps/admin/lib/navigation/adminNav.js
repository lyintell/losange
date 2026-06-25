export const CLIENTS_SECTION_LABEL = 'Clients et chantiers';
export const OUVRAGES_SECTION_LABEL = 'Métiers et ouvrages';
export const ARTICLES_SECTION_LABEL = 'Métiers et articles';

export const ADMIN_NAV_ITEMS = [
  { slug: 'accueil', href: '/accueil', label: 'Accueil', icon: 'home' },
  { slug: 'clients', href: '/clients', label: CLIENTS_SECTION_LABEL, icon: 'account-group' },
  { slug: 'ouvrages', href: '/ouvrages', label: OUVRAGES_SECTION_LABEL, icon: 'hammer-wrench' },
  { slug: 'articles', href: '/articles', label: ARTICLES_SECTION_LABEL, icon: 'package-variant' },
  { slug: 'parametres', href: '/parametres', label: 'Paramètres', icon: 'cog' },
  { slug: 'tableau-de-bord', href: '/tableau-de-bord', label: 'Tableau de bord', icon: 'view-dashboard' },
];

export const ADMIN_FOOTER_NAV_ITEMS = [
  { slug: 'profil', href: '/profil', label: 'Profil', icon: 'account' },
];

export const ADMIN_PROTECTED_PATHS = [
  ...ADMIN_NAV_ITEMS.map((item) => item.href),
  ...ADMIN_FOOTER_NAV_ITEMS.map((item) => item.href),
];

export function getAdminNavItem(slug) {
  const allItems = [...ADMIN_NAV_ITEMS, ...ADMIN_FOOTER_NAV_ITEMS];
  return allItems.find((item) => item.slug === slug) || null;
}

export function isAdminProtectedPath(pathname) {
  return ADMIN_PROTECTED_PATHS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}
