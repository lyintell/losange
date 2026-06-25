'use client';

import Link from 'next/link';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { getChantierStatusColor, getChantierStatusLabel } from '@/lib/chantiers/status';

export function ChantierStatusBadge({ status }) {
  const label = getChantierStatusLabel(status);
  const color = getChantierStatusColor(status);

  return (
    <span className="status-badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  );
}

export function ChantiersTable({ rows, clientId = null, showClientColumn = true }) {
  if (!rows.length) {
    return <p className="empty-state">Aucun chantier trouvé.</p>;
  }

  const chantierHref = (row) =>
    clientId ? `/clients/${clientId}/chantiers/${row.id}` : `/chantiers/${row.id}`;

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Chantier</th>
            {showClientColumn ? <th>Client</th> : null}
            <th>Statut du chantier</th>
            <th className="num">Devis</th>
            <th className="num">Validés</th>
            <th className="num">En attente</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ChantierRow
              key={row.id}
              row={row}
              href={chantierHref(row)}
              showClientColumn={showClientColumn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChantierRow({ row, href, showClientColumn }) {
  const handleRowClick = useRowNavigate(href);

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td>{row.numero}</td>
      <td>
        <Link href={href} className="table-link">
          {row.nom}
        </Link>
      </td>
      {showClientColumn ? <td>{row.client_nom || '—'}</td> : null}
      <td>
        <ChantierStatusBadge status={row.status} />
      </td>
      <td className="num">{row.devis_total || 0}</td>
      <td className="num">{row.devis_valide || 0}</td>
      <td className="num">{row.devis_en_attente || 0}</td>
    </tr>
  );
}
