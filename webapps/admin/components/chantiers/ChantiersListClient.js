'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { matchesChantierSearch, matchesClientChantierSearch } from '@/lib/chantiers/format';
import { ChantiersTable } from '@/components/chantiers/ChantiersTable';
import ChantierInfoModal from '@/components/chantiers/ChantierInfoModal';
import AdminIcon from '@/components/ui/AdminIcon';
import TablePagination from '@/components/ui/TablePagination';
import { useTablePagination } from '@/hooks/useTablePagination';

const SEARCH_PLACEHOLDERS = {
  default: 'Nom chantier, adresse, client, téléphone…',
  'client-chantiers': 'Nom chantier, adresse, notes…',
};

export default function ChantiersListClient({
  chantiers = [],
  clientId = null,
  showClientColumn = true,
  searchMode = 'default',
  canCreate = false,
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const matchFn =
      searchMode === 'client-chantiers' ? matchesClientChantierSearch : matchesChantierSearch;
    return chantiers.filter((row) => matchFn(row, query));
  }, [chantiers, query, searchMode]);
  const { pageItems, paginationProps } = useTablePagination(filtered);

  return (
    <div className="chantiers-list">
      <div className="list-toolbar">
        <label className="search-field list-toolbar-search">
          <span className="search-field-label">Rechercher</span>
          <input
            type="search"
            className="search-field-input"
            placeholder={SEARCH_PLACEHOLDERS[searchMode] || SEARCH_PLACEHOLDERS.default}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {canCreate && clientId ? (
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

      <ChantiersTable rows={pageItems} clientId={clientId} showClientColumn={showClientColumn} />
      <TablePagination {...paginationProps} />

      {canCreate && clientId ? (
        <ChantierInfoModal
          open={createOpen}
          mode="create"
          clientId={clientId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
