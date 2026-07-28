import Link from 'next/link';
import { notFound } from 'next/navigation';
import DevisEditClient from '@/components/chantiers/DevisEditClient';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { fetchChantierDetail } from '@/lib/chantiers/queries';
import { fetchLignesByReleveId } from '@/lib/lignes/queries';
import { canEditReleveRemise } from '@/lib/chantiers/remise';
import { getSession } from '@/lib/auth/session';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';

export default async function DevisEditPage({ params }) {
  const session = await getSession();
  const { chantierId, releveId } = await params;

  const chantier = await fetchChantierDetail(chantierId, {
    entrepriseId: session?.entrepriseId || null,
    role: session?.role,
    profilId: session?.profilId,
  }).catch(() => null);

  if (!chantier) notFound();
  if (!canModifyChantiers(session?.role)) notFound();

  const releve = (chantier.releves || []).find((row) => row.id === releveId);
  if (!releve) notFound();

  const [{ lignes }, metiers] = await Promise.all([
    fetchLignesByReleveId(releveId).catch(() => ({ lignes: [] })),
    fetchMetiersCatalogueList({ entrepriseId: session?.entrepriseId || null }).catch(() => []),
  ]);

  return (
    <div className="document-page">
      <Link href={`/chantiers/${chantierId}/devis/${releveId}`} className="back-link">
        ← Retour au devis
      </Link>
      <DevisEditClient
        mode="edit"
        chantier={chantier}
        releve={releve}
        lignes={lignes}
        metiers={metiers}
        canEditRemise={canEditReleveRemise(session?.role)}
      />
    </div>
  );
}
