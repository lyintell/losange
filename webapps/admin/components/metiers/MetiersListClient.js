'use client';

import { useMemo, useState } from 'react';
import MetiersTable from '@/components/metiers/MetiersTable';
import TablePagination from '@/components/ui/TablePagination';
import { matchesMetierSearch } from '@/lib/metiers/format';
import { useTablePagination } from '@/hooks/useTablePagination';

export default function MetiersListClient({ metiers = [] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => metiers.filter((row) => matchesMetierSearch(row, query)),
    [metiers, query]
  );
  const { pageItems, paginationProps } = useTablePagination(filtered);

  return (
    <div className="clients-list">
      <label className="search-field">
        <span className="search-field-label">Rechercher</span>
        <input
          type="search"
          className="search-field-input"
          placeholder="Nom métier, abréviation…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <MetiersTable rows={pageItems} />
      <TablePagination {...paginationProps} />
    </div>
  );
}
