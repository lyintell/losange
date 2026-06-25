import {
  mdiAccount,
  mdiAccountGroup,
  mdiBriefcase,
  mdiChartPie,
  mdiCog,
  mdiDatabase,
  mdiDownload,
  mdiEye,
  mdiHammerWrench,
  mdiHome,
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
  database: mdiDatabase,
  'chart-pie': mdiChartPie,
  printer: mdiPrinter,
  download: mdiDownload,
  eye: mdiEye,
  pencil: mdiPencil,
};

export function getAdminIconPath(name) {
  return ADMIN_ICONS[name] || null;
}
