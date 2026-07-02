import { notFound, redirect } from 'next/navigation';
import ChantierDetailPageClient from '@/components/chantiers/ChantierDetailPageClient';
import { canModifyChantiers, canChangeChantierStatus, canChangeDevisStatus } from '@/lib/chantiers/access';
import { fetchChantierDetail } from '@/lib/chantiers/queries';
import { getSession } from '@/lib/auth/session';
import { CLIENTS_SECTION_LABEL, getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: `${CLIENTS_SECTION_LABEL} — Losange Admin`,
};

export default async function ClientChantierDetailPage({ params }) {
  const session = await getSession();
  const { clientId, chantierId } = await params;
  const navItem = getAdminNavItem('clients');

  let chantier = null;
  try {
    chantier = await fetchChantierDetail(chantierId, {
      entrepriseId: session?.entrepriseId || null,
      role: session?.role,
      profilId: session?.profilId,
    });
  } catch {
    chantier = null;
  }

  if (!chantier) notFound();

  if (chantier.client_id !== clientId) {
    redirect(`/clients/${chantier.client_id}/chantiers/${chantierId}`);
  }

  return (
    <ChantierDetailPageClient
      navItem={navItem}
      clientId={clientId}
      clientName={chantier.client_nom}
      chantier={chantier}
      canModifyChantier={canModifyChantiers(session?.role)}
      canChangeChantierStatus={canChangeChantierStatus(session?.role)}
      canChangeDevisStatus={canChangeDevisStatus(session?.role)}
    />
  );
}
