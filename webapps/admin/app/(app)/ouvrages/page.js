import AdminPageShell from '@/components/layout/AdminPageShell';
import MetiersListClient from '@/components/metiers/MetiersListClient';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';
import { getSession } from '@/lib/auth/session';
import { CATALOGUE_SECTION_LABEL, getAdminNavItem } from '@/lib/navigation/adminNav';
import { breadcrumbMetiersList } from '@/lib/navigation/breadcrumbs';

export const metadata = {
  title: `${CATALOGUE_SECTION_LABEL} — Losange Admin`,
};

export default async function MetiersCataloguePage() {
  const session = await getSession();
  const navItem = getAdminNavItem('ouvrages');

  let metiers = [];
  let errorMessage = '';

  try {
    metiers = await fetchMetiersCatalogueList({
      entrepriseId: session?.entrepriseId || null,
    });
  } catch (error) {
    errorMessage = error.message || 'Impossible de charger les métiers.';
  }

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbMetiersList()}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetiersListClient metiers={metiers} />
    </AdminPageShell>
  );
}
