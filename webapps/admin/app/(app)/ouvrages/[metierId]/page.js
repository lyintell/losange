import { notFound } from 'next/navigation';
import MetierCataloguePageClient from '@/components/metiers/MetierCataloguePageClient';
import { fetchArticlesByMetierId } from '@/lib/articles/queries';
import { fetchMetierById } from '@/lib/metiers/queries';
import { fetchOuvragesByMetierId } from '@/lib/ouvrages/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';

export const metadata = {
  title: 'Métiers, ouvrages, articles — Losange Admin',
};

export default async function MetierCatalogueDetailPage({ params }) {
  const session = await getSession();
  const { metierId } = await params;
  const navItem = getAdminNavItem('ouvrages');

  let metier = null;
  let ouvrages = [];
  let articles = [];
  let errorMessage = '';

  try {
    metier = await fetchMetierById(metierId, {
      entrepriseId: session?.entrepriseId || null,
    });
    if (metier) {
      const entrepriseId = session?.entrepriseId || null;
      [ouvrages, articles] = await Promise.all([
        fetchOuvragesByMetierId(metierId, { entrepriseId }),
        fetchArticlesByMetierId(metierId, { entrepriseId }),
      ]);
    }
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger le catalogue.';
  }

  if (!metier) notFound();

  return (
    <MetierCataloguePageClient
      navItem={navItem}
      metier={metier}
      ouvrages={ouvrages}
      articles={articles}
      errorMessage={errorMessage}
    />
  );
}
