import AdminPageShell from '@/components/layout/AdminPageShell';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { getSession } from '@/lib/auth/session';
import { fetchDashboardStats } from '@/lib/dashboard/queries';
import { getAdminNavItem, getDashboardNavLabel } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Tableau de bord — Losange Admin',
};

export default async function TableauDeBordPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('tableau-de-bord');
  const stats = await fetchDashboardStats({
    entrepriseId: session?.entrepriseId || null,
  }).catch(() => null);

  return (
    <AdminPageShell
      navItem={navItem}
      breadcrumbs={[{ label: getDashboardNavLabel(session?.prenom) }]}
    >
      <DashboardStats stats={stats} />
    </AdminPageShell>
  );
}
