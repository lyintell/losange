import {
  mdiAccount,
  mdiAccountGroup,
  mdiBriefcase,
  mdiCashMultiple,
  mdiChartPie,
  mdiCog,
  mdiDatabase,
  mdiDownload,
  mdiEye,
  mdiFileDocumentOutline,
  mdiHammerWrench,
  mdiHome,
  mdiLogout,
  mdiPackageVariant,
  mdiPencil,
  mdiPrinter,
  mdiViewDashboard,
} from '@mdi/js';

/** Noms alignés sur MaterialCommunityIcons (app mobile). */
export const ADMIN_ICONS = {
  home: mdiHome,
  'view-dashboard': mdiViewDashboard,
  briefcase: mdiBriefcase,
  'account-group': mdiAccountGroup,
  'hammer-wrench': mdiHammerWrench,
  'package-variant': mdiPackageVariant,
  cog: mdiCog,
  account: mdiAccount,
  logout: mdiLogout,
  database: mdiDatabase,
  'chart-pie': mdiChartPie,
  'file-document': mdiFileDocumentOutline,
  'cash-multiple': mdiCashMultiple,
  printer: mdiPrinter,
  download: mdiDownload,
  eye: mdiEye,
  pencil: mdiPencil,
};

export function getAdminIconPath(name) {
  return ADMIN_ICONS[name] || null;
}
