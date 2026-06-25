'use client';

import { useMemo, useState } from 'react';
import { matchesArticleSearch } from '@/lib/articles/format';
import ArticlesTable from '@/components/articles/ArticlesTable';

const SEARCH_PLACEHOLDERS = {
  default: 'Nom article, métier, fournisseur…',
  'metier-articles': 'Nom article, fournisseur…',
};

export default function ArticlesListClient({
  articles = [],
  metierId = null,
  showMetierColumn = true,
  showFournisseurColumn = true,
  searchMode = 'default',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      articles.filter((row) =>
        matchesArticleSearch(row, query, { includeMetier: showMetierColumn })
      ),
    [articles, query, showMetierColumn]
  );

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
      <ArticlesTable
        rows={filtered}
        metierId={metierId}
        showMetierColumn={showMetierColumn}
        showFournisseurColumn={showFournisseurColumn}
      />
    </div>
  );
}
