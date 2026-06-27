'use client';

import { useMemo, useState } from 'react';
import { matchesChantierSearch, matchesClientChantierSearch } from '@/lib/chantiers/format';
import { ChantiersTable } from '@/components/chantiers/ChantiersTable';

const SEARCH_PLACEHOLDERS = {
  default: 'Nom chantier, adresse, client, téléphone…',
  'client-chantiers': 'Nom chantier, adresse, notes…',
};

export default function ChantiersListClient({
  chantiers = [],
  clientId = null,
  showClientColumn = true,
  searchMode = 'default',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const matchFn =
      searchMode === 'client-chantiers' ? matchesClientChantierSearch : matchesChantierSearch;
    return chantiers.filter((row) => matchFn(row, query));
  }, [chantiers, query, searchMode]);

  return (
    <div className="chantiers-list">
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
      <ChantiersTable
        rows={filtered}
        clientId={clientId}
        showClientColumn={showClientColumn}
      />
    </div>
  );
}
