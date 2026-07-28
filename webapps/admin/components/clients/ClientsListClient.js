'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientEditModal from '@/components/clients/ClientEditModal';
import ClientsTable from '@/components/clients/ClientsTable';
import AdminIcon from '@/components/ui/AdminIcon';
import TablePagination from '@/components/ui/TablePagination';
import { useTablePagination } from '@/hooks/useTablePagination';

function matchesClientSearch(row, query) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [row.nom_complet, row.telephone_1, row.telephone_2].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(term)
  );
}

export default function ClientsListClient({ clients = [], canCreate = true }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(
    () => clients.filter((row) => matchesClientSearch(row, query)),
    [clients, query]
  );
  const { pageItems, paginationProps } = useTablePagination(filtered);

  return (
    <div className="clients-list">
      <div className="list-toolbar">
        <label className="search-field list-toolbar-search">
          <span className="search-field-label">Rechercher</span>
          <input
            type="search"
            className="search-field-input"
            placeholder="Nom client, téléphone…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {canCreate ? (
          <button
            type="button"
            className="primary-button icon-text-button list-toolbar-action"
            onClick={() => setCreateOpen(true)}
          >
            <AdminIcon name="plus" size={16} />
            <span>Ajouter</span>
          </button>
        ) : null}
      </div>

      <ClientsTable rows={pageItems} />
      <TablePagination {...paginationProps} />

      <ClientEditModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
