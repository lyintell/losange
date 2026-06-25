import { notFound } from 'next/navigation';
import AdminPageShell from '@/components/layout/AdminPageShell';
import ArticleDetailClient from '@/components/articles/ArticleDetailClient';
import { fetchMetierById } from '@/lib/metiers/queries';
import { fetchArticleById } from '@/lib/articles/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbArticleDetail } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: 'Métiers et articles — Losange Admin',
};

export default async function ArticleDetailPage({ params }) {
  const session = await getSession();
  const { metierId, articleId } = await params;
  const navItem = getAdminNavItem('articles');

  let metier = null;
  let article = null;

  try {
    metier = await fetchMetierById(metierId, {
      entrepriseId: session?.entrepriseId || null,
    });
    article = await fetchArticleById(articleId, {
      entrepriseId: session?.entrepriseId || null,
    });
  } catch {
    metier = null;
    article = null;
  }

  if (!metier || !article || article.metier_id !== metierId) notFound();

  return (
    <AdminPageShell
      navItem={navItem}
      breadcrumbs={breadcrumbArticleDetail({ metier, article })}
    >
      <ArticleDetailClient article={article} />
    </AdminPageShell>
  );
}
