'use client';

import { useState } from 'react';
import AdminPageShell from '@/components/layout/AdminPageShell';
import MetierCatalogueClient from '@/components/metiers/MetierCatalogueClient';
import { breadcrumbMetierCatalogue } from '@/lib/navigation/breadcrumbs';

export default function MetierCataloguePageClient({
  navItem,
  metier,
  ouvrages,
  articles,
  errorMessage = '',
}) {
  const [tab, setTab] = useState('ouvrages');

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbMetierCatalogue(metier, tab)}>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      <MetierCatalogueClient
        metier={metier}
        ouvrages={ouvrages}
        articles={articles}
        activeTab={tab}
        onTabChange={setTab}
      />
    </AdminPageShell>
  );
}
