import AdminPageShell from '@/components/layout/AdminPageShell';
import MetiersListClient from '@/components/metiers/MetiersListClient';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';
import { getSession } from '@/lib/auth/session';
import { getAdminNavItem, OUVRAGES_SECTION_LABEL } from '@/lib/navigation/adminNav';
import { breadcrumbOuvragesMetiersList } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: `${OUVRAGES_SECTION_LABEL} — Losange Admin`,
};

export default async function OuvragesMetiersPage() {
  const session = await getSession();
  const navItem = getAdminNavItem('ouvrages');

  let metiers = [];
  let errorMessage = '';

  try {
    metiers = await fetchMetiersCatalogueList({
      entrepriseId: session?.entrepriseId || null,
      catalogueKind: 'ouvrage',
    });
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les métiers.';
  }

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbOuvragesMetiersList()}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetiersListClient metiers={metiers} basePath="ouvrages" countLabel="Ouvrages" />
    </AdminPageShell>
  );
}
