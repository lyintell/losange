'use client';

import OuvragesListClient from '@/components/ouvrages/OuvragesListClient';
import { getMetierColor } from '@/lib/format/metierColors';

export default function MetierOuvragesClient({ metier, ouvrages, metierId }) {
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

      <OuvragesListClient
        ouvrages={ouvrages}
        metierId={metierId}
        showMetierColumn={false}
        searchMode="metier-ouvrages"
      />
    </>
  );
}
