'use client';

import { useMemo, useState } from 'react';
import MetiersTable from '@/components/metiers/MetiersTable';
import { matchesMetierSearch } from '@/lib/metiers/format';

export default function MetiersListClient({
  metiers = [],
  basePath = 'ouvrages',
  countLabel = 'Ouvrages',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => metiers.filter((row) => matchesMetierSearch(row, query)),
    [metiers, query]
  );

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
      <MetiersTable rows={filtered} basePath={basePath} countLabel={countLabel} />
    </div>
  );
}
