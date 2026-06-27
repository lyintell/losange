import { notFound } from 'next/navigation';
import DevisDocumentView from '@/components/chantiers/DevisDocumentView';
import { fetchChantierDetail, fetchEntrepriseForSession } from '@/lib/chantiers/queries';
import { fetchLignesByReleveId } from '@/lib/lignes/queries';
import { getSession } from '@/lib/auth/session';

export default async function DevisDocumentPage({ params }) {
  const session = await getSession();
  const { chantierId, releveId } = await params;

  const chantier = await fetchChantierDetail(chantierId, {
    entrepriseId: session?.entrepriseId || null,
    role: session?.role,
    profilId: session?.profilId,
  }).catch(() => null);

  if (!chantier) notFound();

  const releve = (chantier.releves || []).find((row) => row.id === releveId);
  if (!releve) notFound();

  const [{ lignes }, entreprise] = await Promise.all([
    fetchLignesByReleveId(releveId).catch(() => ({ releve: null, lignes: [] })),
    fetchEntrepriseForSession(session?.entrepriseId).catch(() => null),
  ]);

  return (
    <DevisDocumentView
      chantier={chantier}
      lignes={lignes}
      releve={releve}
      entreprise={entreprise}
    />
  );
}
