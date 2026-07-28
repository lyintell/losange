'use client';

import Link from 'next/link';
import { useRowNavigate } from '@/components/ui/useRowNavigate';
import { formatDisplayDate } from '@/lib/chantiers/format';

export default function ClientsTable({ rows }) {
  if (!rows.length) {
    return <p className="empty-state">Aucun client trouvé.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table data-table--rich">
        <thead>
          <tr>
            <th>Client</th>
            <th>Téléphones</th>
            <th className="num">Chantiers</th>
            <th className="num">Devis</th>
            <th className="num">Validés</th>
            <th className="num">En attente</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ClientRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientRow({ row }) {
  const href = `/clients/${row.id}`;
  const handleRowClick = useRowNavigate(href);
  const tel1 = row.telephone_1?.trim();
  const tel2 = row.telephone_2?.trim();

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td>
        <Link href={href} className="table-link">
          {row.nom_complet || '—'}
        </Link>
      </td>
      <td>
        <div className="table-stack">
          <span>{tel1 || '—'}</span>
          {tel2 ? <span className="table-subtext">{tel2}</span> : null}
        </div>
      </td>
      <td className="num">{row.chantier_count || 0}</td>
      <td className="num">{row.devis_total || 0}</td>
      <td className="num">{row.devis_valide || 0}</td>
      <td className="num">{row.devis_en_attente || 0}</td>
      <td className="table-muted">{formatDisplayDate(row.cree_le)}</td>
    </tr>
  );
}
