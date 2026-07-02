import { notFound } from 'next/navigation';
import ReleveDocumentView from '@/components/chantiers/ReleveDocumentView';
import { canModifyChantiers, canChangeChantierStatus } from '@/lib/chantiers/access';
import { fetchChantierDetail, fetchEntrepriseForSession } from '@/lib/chantiers/queries';
import { fetchLignesByReleveId } from '@/lib/lignes/queries';
import { getSession } from '@/lib/auth/session';

export default async function ReleveDocumentPage({ params }) {
  const session = await getSession();
  const { chantierId, releveId } = await params;

  const chantier = await fetchChantierDetail(chantierId, {
    entrepriseId: session?.entrepriseId || null,
    role: session?.role,
    profilId: session?.profilId,
  }).catch(() => null);

  if (!chantier) notFound();

  const releveExists = (chantier.releves || []).some((row) => row.id === releveId);
  if (!releveExists) notFound();

  const [{ lignes }, entreprise] = await Promise.all([
    fetchLignesByReleveId(releveId).catch(() => ({ lignes: [] })),
    fetchEntrepriseForSession(session?.entrepriseId).catch(() => null),
  ]);

  return (
    <ReleveDocumentView
      chantier={chantier}
      lignes={lignes}
      entreprise={entreprise}
      canModifyChantier={canModifyChantiers(session?.role)}
      canChangeChantierStatus={canChangeChantierStatus(session?.role)}
    />
  );
}
