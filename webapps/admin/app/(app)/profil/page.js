import AdminPageShell from '@/components/layout/AdminPageShell';
import ProfilClient from '@/components/profil/ProfilClient';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { fetchEntrepriseConfig, fetchProfilForSession } from '@/lib/profil/queries';

export const metadata = {
  title: 'Profil — Losange Admin',
};

export default async function ProfilPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('profil');

  const [profil, entreprise] = await Promise.all([
    fetchProfilForSession(session).catch(() => null),
    fetchEntrepriseConfig(session?.entrepriseId || null).catch(() => null),
  ]);

  const canEdit = Boolean(session && !session.isMaster && session.profilId);

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={[{ label: 'Profil' }]}>
      <ProfilClient profil={profil} entreprise={entreprise} canEdit={canEdit} />
    </AdminPageShell>
  );
}
