import Link from 'next/link';
import { notFound } from 'next/navigation';
import DevisEditClient from '@/components/chantiers/DevisEditClient';
import { fetchChantierDetail } from '@/lib/chantiers/queries';
import { fetchLignesByReleveId } from '@/lib/lignes/queries';
import { canEditReleveRemise } from '@/lib/chantiers/remise';
import { getSession } from '@/lib/auth/session';

export default async function DevisEditPage({ params }) {
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

  const { lignes } = await fetchLignesByReleveId(releveId).catch(() => ({ lignes: [] }));

  return (
    <div className="document-page">
      <Link href={`/chantiers/${chantierId}/devis/${releveId}`} className="back-link">
        ← Retour au devis
      </Link>
      <DevisEditClient
        chantier={chantier}
        releve={releve}
        lignes={lignes}
        canEditRemise={canEditReleveRemise(session?.role)}
      />
    </div>
  );
}
