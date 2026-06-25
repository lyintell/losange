import AdminPageShell from '@/components/layout/AdminPageShell';
import ClientsListClient from '@/components/clients/ClientsListClient';
import { fetchClientsList } from '@/lib/chantiers/queries';
import { getSession } from '@/lib/auth/session';
import { CLIENTS_SECTION_LABEL, getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbClientsList } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: `${CLIENTS_SECTION_LABEL} — Losange Admin`,
};

export default async function ClientsPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('clients');

  let clients = [];
  let errorMessage = '';

  try {
    clients = await fetchClientsList({
      entrepriseId: session?.entrepriseId || null,
      role: session?.role,
      profilId: session?.profilId,
    });
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les clients.';
  }

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbClientsList()}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <ClientsListClient clients={clients} />
    </AdminPageShell>
  );
}
