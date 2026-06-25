import { notFound } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import OuvrageDetailClient from '@/components/ouvrages/OuvrageDetailClient';
import { fetchMetierById } from '@/lib/metiers/queries';
import { fetchOuvrageById } from '@/lib/ouvrages/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbOuvrageDetail } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: 'Métiers et ouvrages — Losange Admin',
};

export default async function OuvrageDetailPage({ params }) {
  const session = await getSession();
  const { metierId, ouvrageId } = await params;
  const navItem = getAdminNavItem('ouvrages');

  let metier = null;
  let ouvrage = null;

  try {
    metier = await fetchMetierById(metierId, {
      entrepriseId: session?.entrepriseId || null,
    });
    ouvrage = await fetchOuvrageById(ouvrageId, {
      entrepriseId: session?.entrepriseId || null,
    });
  } catch {
    metier = null;
    ouvrage = null;
  }

  if (!metier || !ouvrage || ouvrage.metier_id !== metierId) notFound();

  return (
    <AdminPageShell
      navItem={navItem}
      breadcrumbs={breadcrumbOuvrageDetail({ metier, ouvrage })}
    >
      <OuvrageDetailClient ouvrage={ouvrage} />
    </AdminPageShell>
  );
}
