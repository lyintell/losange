'use client';

import { useState } from 'react';
import AdminPageShell from '@/components/layout/AdminPageShell';
import ChantierDetailClient from '@/components/chantiers/ChantierDetailClient';
import { breadcrumbChantierDetail } from '@/lib/navigation/breadcrumbs';

export default function ChantierDetailPageClient({ navItem, clientId, clientName, chantier }) {
  const [tab, setTab] = useState('devis');

  const breadcrumbs = breadcrumbChantierDetail({
    clientId,
    clientName,
    chantierId: chantier.id,
    chantierName: chantier.nom,
    tab,
  });

  return (
    <AdminPageShell navItem={navItem} breadcrumbs={breadcrumbs}>
      <ChantierDetailClient chantier={chantier} activeTab={tab} onTabChange={setTab} />
    </AdminPageShell>
  );
}
