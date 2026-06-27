'use client';

import Link from 'next/link';
import UnitesPrixCell from '@/components/catalogue/UnitesPrixCell';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { getMetierColor } from '@/lib/format/metierColors';

export default function OuvragesTable({
  rows,
  metierId = null,
  showMetierColumn = true,
  onRowSelect = null,
}) {
  if (!rows.length) {
    return <p className="empty-state">Aucun ouvrage trouvé.</p>;
  }

  const ouvrageHref = (row) =>
    metierId ? `/ouvrages/${metierId}/ouvrages/${row.id}` : `/ouvrages/${row.id}`;

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Ouvrage</th>
            {showMetierColumn ? <th>Métier</th> : null}
            <th>Prix unitaires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <OuvrageRow
              key={row.id}
              row={row}
              href={ouvrageHref(row)}
              showMetierColumn={showMetierColumn}
              onRowSelect={onRowSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OuvrageRow({ row, href, showMetierColumn, onRowSelect }) {
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
          <span className="table-link">{row.nom}</span>
        ) : (
          <Link href={href} className="table-link">
            {row.nom}
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
      <td>
        <UnitesPrixCell unites={row.unites} />
      </td>
    </tr>
  );
}
