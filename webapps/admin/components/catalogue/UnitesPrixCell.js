import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/ouvrages/format';

export default function UnitesPrixCell({ unites = [] }) {
  if (!unites.length) {
    return <span className="muted-inline">—</span>;
  }

  return (
    <ul className="unites-prix-list">
      {unites.map((unite) => (
        <li key={unite.ouvrage_unite_id} className="unites-prix-item">
          <span className="unites-prix-value">{formatMontantFcfa(unite.prix_unitaire)}</span>
          <span className="unites-prix-sep">/</span>
          <span className="unites-prix-label">{formatUniteChoiceLabel(unite)}</span>
        </li>
      ))}
    </ul>
  );
}
