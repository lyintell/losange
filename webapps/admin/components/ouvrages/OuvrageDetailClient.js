'use client';

import { useState } from 'react';
import OuvrageEditModal from '@/components/ouvrages/OuvrageEditModal';
import AdminIcon from '@/components/ui/AdminIcon';
import { formatMontantFcfa, formatUniteTypeLabel } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/ouvrages/format';
import { getMetierColor } from '@/lib/format/metierColors';

function InfoRow({ label, value, valueStyle = null }) {
  return (
    <div className="info-row">
      <p className="info-row-label">{label}</p>
      <p className="info-row-value" style={valueStyle}>
        {value || '—'}
      </p>
    </div>
  );
}

export default function OuvrageDetailClient({ ouvrage: initialOuvrage }) {
  const [ouvrage, setOuvrage] = useState(initialOuvrage);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const metierColor = getMetierColor(ouvrage.metier_id);

  return (
    <>
      <div className="ouvrage-detail-header">
        <div>
          <h2 className="ouvrage-detail-title">{ouvrage.nom}</h2>
          <p className="ouvrage-detail-meta">
            Métier :{' '}
            <span style={{ color: metierColor, fontWeight: 700 }}>{ouvrage.metier_nom || '—'}</span>
          </p>
        </div>
        <button
          type="button"
          className="secondary-button icon-text-button"
          onClick={() => setEditModalOpen(true)}
        >
          <AdminIcon name="pencil" size={16} />
          <span>Modifier ouvrage</span>
        </button>
      </div>

      <div className="detail-card">
        <InfoRow label="Nom" value={ouvrage.nom} />
        <InfoRow label="Métier" value={ouvrage.metier_nom} valueStyle={{ color: metierColor }} />
      </div>

      <h3 className="section-title">
        {ouvrage.unites?.length > 1 ? 'Unités associées' : 'Unité associée'}
      </h3>

      {!ouvrage.unites?.length ? (
        <p className="empty-state">Aucune unité associée.</p>
      ) : (
        <ul className="doc-list">
          {ouvrage.unites.map((unite) => (
            <li key={unite.ouvrage_unite_id} className="doc-list-item">
              <div>
                <p className="doc-list-title">{formatUniteChoiceLabel(unite)}</p>
                <p className="doc-list-meta">
                  {formatUniteTypeLabel(unite.ind_dimension, unite.formule)} ·{' '}
                  {formatMontantFcfa(unite.prix_unitaire)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <OuvrageEditModal
        open={editModalOpen}
        ouvrage={ouvrage}
        onClose={() => setEditModalOpen(false)}
        onSaved={setOuvrage}
      />
    </>
  );
}
