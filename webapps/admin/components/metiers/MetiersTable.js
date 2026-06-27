'use client';

import Link from 'next/link';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { getMetierColor } from '@/lib/format/metierColors';

export default function MetiersTable({ rows }) {
  if (!rows.length) {
    return <p className="empty-state">Aucun métier trouvé.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Métier</th>
            <th className="num">Ouvrages</th>
            <th className="num">Articles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <MetierRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetierRow({ row }) {
  const href = `/ouvrages/${row.id}`;
  const handleRowClick = useRowNavigate(href);
  const metierColor = getMetierColor(row.id);

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td>
        <Link href={href} className="table-link">
          <span className="metier-label" style={{ color: metierColor }}>
            {row.nom || '—'}
          </span>
        </Link>
        {row.abbrev ? <span className="table-secondary-label">{row.abbrev}</span> : null}
      </td>
      <td className="num">{row.ouvrage_count || 0}</td>
      <td className="num">{row.article_count || 0}</td>
    </tr>
  );
}
