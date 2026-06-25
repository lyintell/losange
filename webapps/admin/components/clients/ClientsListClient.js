'use client';

import { useMemo, useState } from 'react';
import ClientsTable from '@/components/clients/ClientsTable';

function matchesClientSearch(row, query) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [row.nom_complet, row.telephone_1, row.telephone_2].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(term)
  );
}

export default function ClientsListClient({ clients = [] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => clients.filter((row) => matchesClientSearch(row, query)),
    [clients, query]
  );

  return (
    <div className="clients-list">
      <label className="search-field">
        <span className="search-field-label">Rechercher</span>
        <input
          type="search"
          className="search-field-input"
          placeholder="Nom client, téléphone…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ClientsTable rows={filtered} />
    </div>
  );
}
