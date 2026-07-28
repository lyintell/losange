export const CLIENTS_SECTION_LABEL = 'Clients, chantiers, devis';
export const CATALOGUE_SECTION_LABEL = 'Métiers, ouvrages, articles';

export const DASHBOARD_NAV_SLUG = 'tableau-de-bord';

export function getDashboardNavLabel() {
  return 'Tableau de bord';
}

export const ADMIN_NAV_ITEMS = [
  {
    slug: DASHBOARD_NAV_SLUG,
    href: '/tableau-de-bord',
    label: 'Tableau de bord',
    icon: 'view-dashboard',
  },
  { slug: 'clients', href: '/clients', label: CLIENTS_SECTION_LABEL, icon: 'account-group' },
  { slug: 'ouvrages', href: '/ouvrages', label: CATALOGUE_SECTION_LABEL, icon: 'hammer-wrench' },
];

export const ADMIN_FOOTER_NAV_ITEMS = [
  { slug: 'profil', href: '/profil', label: 'Profil', icon: 'account' },
  {
    slug: 'configuration',
    href: '/configuration',
    label: 'Configuration',
    icon: 'cog',
    adminOnly: true,
  },
];

export const ADMIN_PROTECTED_PATHS = [
  ...ADMIN_NAV_ITEMS.map((item) => item.href),
  ...ADMIN_FOOTER_NAV_ITEMS.map((item) => item.href),
  '/articles',
  '/parametres',
];

export function getAdminNavItem(slug) {
  const allItems = [...ADMIN_NAV_ITEMS, ...ADMIN_FOOTER_NAV_ITEMS];
  return allItems.find((item) => item.slug === slug) || null;
}

export function getSidebarFooterNavItems(session) {
  const isAdmin = session?.role === 'A';
  return ADMIN_FOOTER_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}

export function isAdminProtectedPath(pathname) {
  return ADMIN_PROTECTED_PATHS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}
