import { notFound } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import MetierArticlesClient from '@/components/articles/MetierArticlesClient';
import { fetchMetierById } from '@/lib/metiers/queries';
import { fetchArticlesByMetierId } from '@/lib/articles/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbMetierArticles } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: 'Métiers et articles — Losange Admin',
};

export default async function MetierArticlesPage({ params }) {
  const session = await getSession();
  const { metierId } = await params;
  const navItem = getAdminNavItem('articles');

  let metier = null;
  let articles = [];
  let errorMessage = '';

  try {
    metier = await fetchMetierById(metierId, {
      entrepriseId: session?.entrepriseId || null,
    });
    if (metier) {
      articles = await fetchArticlesByMetierId(metierId, {
        entrepriseId: session?.entrepriseId || null,
      });
    }
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les articles.';
  }

  if (!metier) notFound();

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbMetierArticles(metier)}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetierArticlesClient metier={metier} articles={articles} metierId={metierId} />
    </AdminPageShell>
  );
}
