import { notFound } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import MetierOuvragesClient from '@/components/ouvrages/MetierOuvragesClient';
import { fetchMetierById } from '@/lib/metiers/queries';
import { fetchOuvragesByMetierId } from '@/lib/ouvrages/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbMetierOuvrages } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: 'Métiers et ouvrages — Losange Admin',
};

export default async function MetierOuvragesPage({ params }) {
  const session = await getSession();
  const { metierId } = await params;
  const navItem = getAdminNavItem('ouvrages');

  let metier = null;
  let ouvrages = [];
  let errorMessage = '';

  try {
    metier = await fetchMetierById(metierId, {
      entrepriseId: session?.entrepriseId || null,
    });
    if (metier) {
      ouvrages = await fetchOuvragesByMetierId(metierId, {
        entrepriseId: session?.entrepriseId || null,
      });
    }
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les ouvrages.';
  }

  if (!metier) notFound();

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbMetierOuvrages(metier)}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetierOuvragesClient metier={metier} ouvrages={ouvrages} metierId={metierId} />
    </AdminPageShell>
  );
}
