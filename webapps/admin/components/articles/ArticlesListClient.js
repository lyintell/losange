'use client';

import { useMemo, useState } from 'react';
import { matchesArticleSearch } from '@/lib/articles/format';
import ArticlesTable from '@/components/articles/ArticlesTable';
import TablePagination from '@/components/ui/TablePagination';
import { useTablePagination } from '@/hooks/useTablePagination';

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
  onRowSelect = null,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      articles.filter((row) =>
        matchesArticleSearch(row, query, { includeMetier: showMetierColumn })
      ),
    [articles, query, showMetierColumn]
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
      <ArticlesTable
        rows={pageItems}
        metierId={metierId}
        showMetierColumn={showMetierColumn}
        showFournisseurColumn={showFournisseurColumn}
        onRowSelect={onRowSelect}
      />
      <TablePagination {...paginationProps} />
    </div>
  );
}
