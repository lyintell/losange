import AdminPageShell from '@/components/layout/AdminPageShell';
import { getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Paramètres — Losange Admin',
};

export default function ParametresPage() {
  const navItem = getAdminNavItem('parametres');

  return <AdminPageShell navItem={navItem} />;
}
