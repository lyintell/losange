import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/ouvrages/format';

function UnitesPriceList({ unites, getAmount, emptyWhenMissing = false }) {
  if (!unites.length) {
    return <span className="muted-inline">—</span>;
  }

  return (
    <ul className="unites-prix-list">
      {unites.map((unite) => {
        const amount = getAmount(unite);
        if (emptyWhenMissing && (amount == null || amount === '')) {
          return (
            <li key={unite.ouvrage_unite_id} className="unites-prix-item">
              <span className="muted-inline">—</span>
              <span className="unites-prix-sep">/</span>
              <span className="unites-prix-label">{formatUniteChoiceLabel(unite)}</span>
            </li>
          );
        }

        return (
          <li key={unite.ouvrage_unite_id} className="unites-prix-item">
            <span className="unites-prix-value">{formatMontantFcfa(amount)}</span>
            <span className="unites-prix-sep">/</span>
            <span className="unites-prix-label">{formatUniteChoiceLabel(unite)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function UnitesPrixCell({ unites = [] }) {
  return <UnitesPriceList unites={unites} getAmount={(unite) => unite.prix_unitaire} />;
}

export function UnitesPrixRevientCell({ unites = [] }) {
  return (
    <UnitesPriceList
      unites={unites}
      getAmount={(unite) => unite.prix_revient}
      emptyWhenMissing
    />
  );
}
