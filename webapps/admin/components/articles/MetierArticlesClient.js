'use client';

import ArticlesListClient from '@/components/articles/ArticlesListClient';
import { getMetierColor } from '@/lib/format/metierColors';

export default function MetierArticlesClient({ metier, articles, metierId }) {
  const metierColor = getMetierColor(metier?.id);

  return (
    <>
      <div className="client-chantiers-header">
        <p className="client-chantiers-title">
          <span className="metier-label" style={{ color: metierColor }}>
            {metier?.nom || 'Métier'}
          </span>
          {metier?.abbrev ? (
            <span className="client-chantiers-meta"> ({metier.abbrev})</span>
          ) : null}
        </p>
      </div>

      <ArticlesListClient
        articles={articles}
        metierId={metierId}
        showMetierColumn={false}
        showFournisseurColumn
        searchMode="metier-articles"
      />
    </>
  );
}
