import { redirect } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import ConfigurationClient from '@/components/configuration/ConfigurationClient';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { fetchEntrepriseConfig } from '@/lib/profil/queries';

export const metadata = {
  title: 'Configuration — Losange Admin',
};

export default async function ConfigurationPage() {
  const session = await getSession();
  if (!session || session.role !== 'A') {
    redirect('/profil');
  }

  const navItem = getAdminNavItem('configuration');
  const entreprise = await fetchEntrepriseConfig(session?.entrepriseId || null).catch(() => null);
  const canEdit = true;

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={[{ label: 'Configuration' }]}>
      <ConfigurationClient entreprise={entreprise} canEdit={canEdit} />
    </AdminPageShell>
  );
}
