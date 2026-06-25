'use client';

import Link from 'next/link';
import { useRowNavigate } from '@/components/ui/useRowNavigate';

export default function ClientsTable({ rows }) {
  if (!rows.length) {
    return <p className="empty-state">Aucun client trouvé.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Téléphone</th>
            <th className="num">Chantiers</th>
            <th className="num">Devis</th>
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

  return (
    <tr className="data-table-row--clickable" onClick={handleRowClick}>
      <td>
        <Link href={href} className="table-link">
          {row.nom_complet || '—'}
        </Link>
      </td>
      <td>{row.telephone_1 || row.telephone_2 || '—'}</td>
      <td className="num">{row.chantier_count || 0}</td>
      <td className="num">{row.devis_total || 0}</td>
    </tr>
  );
}
