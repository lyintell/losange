'use client';

import Link from 'next/link';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { formatDisplayDate } from '@/lib/chantiers/format';
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
      <table className="data-table data-table--rich">
        <thead>
          <tr>
            <th>N°</th>
            <th>Chantier</th>
            {showClientColumn ? <th>Client</th> : null}
            <th>Adresse</th>
            <th>Statut</th>
            <th className="num">Devis</th>
            <th className="num">Validés</th>
            <th className="num">En attente</th>
            <th>Créé le</th>
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
  const tel = row.client_telephone_1?.trim() || row.client_telephone_2?.trim();

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td className="table-muted">{row.numero}</td>
      <td>
        <div className="table-stack">
          <Link href={href} className="table-link">
            {row.nom}
          </Link>
          {row.notes?.trim() ? (
            <span className="table-subtext table-subtext--clamp">{row.notes}</span>
          ) : null}
        </div>
      </td>
      {showClientColumn ? (
        <td>
          <div className="table-stack">
            <span>{row.client_nom || '—'}</span>
            {tel ? <span className="table-subtext">{tel}</span> : null}
          </div>
        </td>
      ) : null}
      <td>
        <span className={row.adresse?.trim() ? undefined : 'table-muted'}>
          {row.adresse?.trim() || '—'}
        </span>
      </td>
      <td>
        <ChantierStatusBadge status={row.status} />
      </td>
      <td className="num">{row.devis_total || 0}</td>
      <td className="num">{row.devis_valide || 0}</td>
      <td className="num">{row.devis_en_attente || 0}</td>
      <td className="table-muted">{formatDisplayDate(row.cree_le)}</td>
    </tr>
  );
}
