import AdminPageShell from '@/components/layout/AdminPageShell';
import { getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Tableau de bord — Losange Admin',
};

export default function TableauDeBordPage() {
  const navItem = getAdminNavItem('tableau-de-bord');

  return <AdminPageShell navItem={navItem} />;
}
