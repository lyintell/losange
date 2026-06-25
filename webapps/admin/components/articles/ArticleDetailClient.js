'use client';

import { useState } from 'react';
import ArticleEditModal from '@/components/articles/ArticleEditModal';
import AdminIcon from '@/components/ui/AdminIcon';
import { formatArticleDisplayName, formatUniteChoiceLabel } from '@/lib/articles/format';
import { formatMontantFcfa, formatUniteTypeLabel } from '@/lib/format/formatLigneMesures';
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

export default function ArticleDetailClient({ article: initialArticle }) {
  const [article, setArticle] = useState(initialArticle);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const metierColor = getMetierColor(article.metier_id);

  return (
    <>
      <div className="ouvrage-detail-header">
        <div>
          <h2 className="ouvrage-detail-title">{formatArticleDisplayName(article)}</h2>
          <p className="ouvrage-detail-meta">
            Métier :{' '}
            <span style={{ color: metierColor, fontWeight: 700 }}>{article.metier_nom || '—'}</span>
          </p>
        </div>
        <button
          type="button"
          className="secondary-button icon-text-button"
          onClick={() => setEditModalOpen(true)}
        >
          <AdminIcon name="pencil" size={16} />
          <span>Modifier article</span>
        </button>
      </div>

      <div className="detail-card">
        <InfoRow label="Nom" value={article.nom} />
        <InfoRow label="Métier" value={article.metier_nom} valueStyle={{ color: metierColor }} />
        <InfoRow label="Fournisseur" value={article.fournisseur_nom} />
      </div>

      <h3 className="section-title">
        {article.unites?.length > 1 ? 'Unités associées' : 'Unité associée'}
      </h3>

      {!article.unites?.length ? (
        <p className="empty-state">Aucune unité associée.</p>
      ) : (
        <ul className="doc-list">
          {article.unites.map((unite) => (
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

      <ArticleEditModal
        open={editModalOpen}
        article={article}
        onClose={() => setEditModalOpen(false)}
        onSaved={setArticle}
      />
    </>
  );
}
