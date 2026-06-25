import AdminPageShell from '@/components/layout/AdminPageShell';
import { getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Profil — Losange Admin',
};

export default function ProfilPage() {
  const navItem = getAdminNavItem('profil');

  return <AdminPageShell navItem={navItem} />;
}
