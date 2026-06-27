import { notFound } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import ClientChantiersClient from '@/components/clients/ClientChantiersClient';
import { fetchChantiersByClientId, fetchClientById } from '@/lib/chantiers/queries';
import { getSession } from '@/lib/auth/session';
import { CLIENTS_SECTION_LABEL, getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbClientChantiers } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: `${CLIENTS_SECTION_LABEL} — Losange Admin`,
};

export default async function ClientChantiersPage({ params }) {
  const session = await getSession();
  const { clientId } = await params;
  const navItem = getAdminNavItem('clients');

  let client = null;
  let chantiers = [];
  let errorMessage = '';

  try {
    client = await fetchClientById(clientId, {
      entrepriseId: session?.entrepriseId || null,
    });
    if (client) {
      chantiers = await fetchChantiersByClientId(clientId, {
        entrepriseId: session?.entrepriseId || null,
        role: session?.role,
        profilId: session?.profilId,
      });
    }
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les chantiers.';
  }

  if (!client) notFound();

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbClientChantiers(client)}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <ClientChantiersClient client={client} chantiers={chantiers} clientId={clientId} />
    </AdminPageShell>
  );
}
