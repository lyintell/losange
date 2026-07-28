'use client';

import { useMemo, useState } from 'react';
import { matchesOuvrageSearch } from '@/lib/ouvrages/format';
import OuvragesTable from '@/components/ouvrages/OuvragesTable';
import TablePagination from '@/components/ui/TablePagination';
import { useTablePagination } from '@/hooks/useTablePagination';

const SEARCH_PLACEHOLDERS = {
  default: 'Nom ouvrage, métier…',
  'metier-ouvrages': 'Nom ouvrage…',
};

export default function OuvragesListClient({
  ouvrages = [],
  metierId = null,
  showMetierColumn = true,
  searchMode = 'default',
  onRowSelect = null,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      ouvrages.filter((row) =>
        matchesOuvrageSearch(row, query, { includeMetier: showMetierColumn })
      ),
    [ouvrages, query, showMetierColumn]
  );
  const { pageItems, paginationProps } = useTablePagination(filtered);

  return (
    <div className="ouvrages-list">
      <label className="search-field">
        <span className="search-field-label">Rechercher</span>
        <input
          type="search"
          className="search-field-input"
          placeholder={SEARCH_PLACEHOLDERS[searchMode] || SEARCH_PLACEHOLDERS.default}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <OuvragesTable
        rows={pageItems}
        metierId={metierId}
        showMetierColumn={showMetierColumn}
        onRowSelect={onRowSelect}
      />
      <TablePagination {...paginationProps} />
    </div>
  );
}
