'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ClientEditModal from '@/components/clients/ClientEditModal';
import ChantiersListClient from '@/components/chantiers/ChantiersListClient';
import AdminIcon from '@/components/ui/AdminIcon';
import { formatClientNamePhoneLine } from '@/lib/chantiers/format';

export default function ClientChantiersClient({ client: initialClient, chantiers, clientId }) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [editModalOpen, setEditModalOpen] = useState(false);

  return (
    <>
      <div className="client-chantiers-header">
        <p className="client-chantiers-title">{formatClientNamePhoneLine(client)}</p>
        <button
          type="button"
          className="secondary-button icon-text-button"
          onClick={() => setEditModalOpen(true)}
        >
          <AdminIcon name="pencil" size={16} />
          <span>Modifier client</span>
        </button>
      </div>

      <ChantiersListClient
        chantiers={chantiers}
        clientId={clientId}
        showClientColumn={false}
        searchMode="client-chantiers"
        canCreate
      />

      <ClientEditModal
        open={editModalOpen}
        client={client}
        onClose={() => setEditModalOpen(false)}
        onSaved={setClient}
        onDeleted={() => {
          router.push('/clients');
          router.refresh();
        }}
      />
    </>
  );
}
