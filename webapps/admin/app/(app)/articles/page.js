import AdminPageShell from '@/components/layout/AdminPageShell';
import MetiersListClient from '@/components/metiers/MetiersListClient';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';
import { getSession } from '@/lib/auth/session';
import { ARTICLES_SECTION_LABEL, getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbArticlesMetiersList } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: `${ARTICLES_SECTION_LABEL} — Losange Admin`,
};

export default async function ArticlesMetiersPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('articles');

  let metiers = [];
  let errorMessage = '';

  try {
    metiers = await fetchMetiersCatalogueList({
      entrepriseId: session?.entrepriseId || null,
      catalogueKind: 'article',
    });
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les métiers.';
  }

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbArticlesMetiersList()}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetiersListClient metiers={metiers} basePath="articles" countLabel="Articles" />
    </AdminPageShell>
  );
}
