import AdminPageShell from '@/components/layout/AdminPageShell';
import WelcomeJumbotron from '@/components/dashboard/WelcomeJumbotron';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Accueil — Losange Admin',
};

export default async function AccueilPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('accueil');

  return (
    <AdminPageShell navItem={navItem}>
      <WelcomeJumbotron session={session} />
    </AdminPageShell>
  );
}
