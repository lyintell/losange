import Link from 'next/link';
import { notFound } from 'next/navigation';
import DevisEditClient from '@/components/chantiers/DevisEditClient';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { fetchChantierDetail } from '@/lib/chantiers/queries';
import { canEditReleveRemise } from '@/lib/chantiers/remise';
import { getSession } from '@/lib/auth/session';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';

export default async function DevisNouveauPage({ params }) {
  const session = await getSession();
  const { chantierId } = await params;

  if (!canModifyChantiers(session?.role)) notFound();

  const chantier = await fetchChantierDetail(chantierId, {
    entrepriseId: session?.entrepriseId || null,
    role: session?.role,
    profilId: session?.profilId,
  }).catch(() => null);

  if (!chantier) notFound();

  const metiers = await fetchMetiersCatalogueList({
    entrepriseId: session?.entrepriseId || null,
  }).catch(() => []);

  return (
    <div className="document-page">
      <Link href={`/chantiers/${chantierId}`} className="back-link">
        ← Retour au chantier
      </Link>
      <h1 className="devis-edit-title">Nouveau devis</h1>
      <DevisEditClient
        mode="create"
        chantier={chantier}
        metiers={metiers}
        canEditRemise={canEditReleveRemise(session?.role)}
      />
    </div>
  );
}
