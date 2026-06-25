import { notFound, redirect } from 'next/navigation';
import { fetchChantierDetail } from '@/lib/chantiers/queries';
import { getSession } from '@/lib/auth/session';

export default async function LegacyChantierDetailRedirectPage({ params }) {
  const session = await getSession();
  const { chantierId } = await params;

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

  redirect(`/clients/${chantier.client_id}/chantiers/${chantierId}`);
}
