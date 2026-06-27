'use client';

import Link from 'next/link';
import UnitesPrixCell from '@/components/catalogue/UnitesPrixCell';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { formatArticleDisplayName } from '@/lib/articles/format';
import { getMetierColor } from '@/lib/format/metierColors';

export default function ArticlesTable({
  rows,
  metierId = null,
  showMetierColumn = true,
  showFournisseurColumn = true,
  onRowSelect = null,
}) {
  if (!rows.length) {
    return <p className="empty-state">Aucun article trouvé.</p>;
  }

  const articleHref = (row) =>
    metierId ? `/articles/${metierId}/articles/${row.id}` : `/articles/${row.id}`;

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Article</th>
            {showMetierColumn ? <th>Métier</th> : null}
            {showFournisseurColumn ? <th>Fournisseur</th> : null}
            <th>Prix unitaires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ArticleRow
              key={row.id}
              row={row}
              href={articleHref(row)}
              showMetierColumn={showMetierColumn}
              showFournisseurColumn={showFournisseurColumn}
              onRowSelect={onRowSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArticleRow({ row, href, showMetierColumn, showFournisseurColumn, onRowSelect }) {
  const handleNavigate = useRowNavigate(href);
  const handleRowClick = onRowSelect
    ? (event) => {
        event.preventDefault();
        onRowSelect(row);
      }
    : handleNavigate;
  const metierColor = getMetierColor(row.metier_id);

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td>{row.numero}</td>
      <td>
        {onRowSelect ? (
          <span className="table-link">{formatArticleDisplayName(row)}</span>
        ) : (
          <Link href={href} className="table-link">
            {formatArticleDisplayName(row)}
          </Link>
        )}
      </td>
      {showMetierColumn ? (
        <td>
          <span className="metier-label" style={{ color: metierColor }}>
            {row.metier_nom || '—'}
          </span>
        </td>
      ) : null}
      {showFournisseurColumn ? <td>{row.fournisseur_nom || '—'}</td> : null}
      <td>
        <UnitesPrixCell unites={row.unites} />
      </td>
    </tr>
  );
}
