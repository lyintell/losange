'use client';

import { useState } from 'react';
import OuvragesListClient from '@/components/ouvrages/OuvragesListClient';
import ArticlesListClient from '@/components/articles/ArticlesListClient';
import OuvrageEditModal from '@/components/ouvrages/OuvrageEditModal';
import ArticleEditModal from '@/components/articles/ArticleEditModal';
import MetierInfoModal from '@/components/metiers/MetierInfoModal';
import AdminIcon from '@/components/ui/AdminIcon';
import { getMetierColor } from '@/lib/format/metierColors';

export default function MetierCatalogueClient({
  metier: initialMetier,
  ouvrages: initialOuvrages,
  articles: initialArticles,
  activeTab: controlledTab = null,
  onTabChange = null,
}) {
  const [internalTab, setInternalTab] = useState('ouvrages');
  const tab = controlledTab ?? internalTab;

  const setTab = (nextTab) => {
    onTabChange?.(nextTab);
    if (controlledTab == null) {
      setInternalTab(nextTab);
    }
  };

  const [metier] = useState(initialMetier);
  const [ouvrages, setOuvrages] = useState(initialOuvrages);
  const [articles, setArticles] = useState(initialArticles);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [createOuvrageOpen, setCreateOuvrageOpen] = useState(false);
  const [createArticleOpen, setCreateArticleOpen] = useState(false);

  const metierColor = getMetierColor(metier?.id);

  const renumberRows = (rows) =>
    rows.map((row, index) => ({
      ...row,
      numero: `#${String(index + 1).padStart(3, '0')}`,
    }));

  const handleOuvrageSaved = (updated) => {
    setOuvrages((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    setSelectedOuvrage(null);
  };

  const handleOuvrageCreated = (created) => {
    setOuvrages((prev) =>
      renumberRows([
        ...prev,
        {
          ...created,
          metier_nom: created.metier_nom || metier?.nom || '',
          unite_count: created.unite_count ?? created.unites?.length ?? 0,
        },
      ])
    );
    setCreateOuvrageOpen(false);
  };

  const handleArticleSaved = (updated) => {
    setArticles((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    setSelectedArticle(null);
  };

  const handleArticleCreated = (created) => {
    setArticles((prev) =>
      renumberRows([
        ...prev,
        {
          ...created,
          metier_nom: created.metier_nom || metier?.nom || '',
          unite_count: created.unite_count ?? created.unites?.length ?? 0,
        },
      ])
    );
    setCreateArticleOpen(false);
  };

  const createStub = metier
    ? { metier_id: metier.id, metier_nom: metier.nom }
    : null;

  return (
    <div className="chantier-detail">
      <div className="chantier-detail-header">
        <div>
          <h2 className="chantier-detail-title">
            <span className="metier-label" style={{ color: metierColor }}>
              {metier?.nom || 'Métier'}
            </span>
            {metier?.abbrev ? (
              <span className="client-chantiers-meta"> ({metier.abbrev})</span>
            ) : null}
          </h2>
          <p className="chantier-detail-meta">
            {metier?.ind_custom ? 'Métier personnalisé' : 'Métier par défaut'}
            {' · '}
            {Number(metier?.ind_actif) === 0 ? 'Inactif' : 'Actif'}
          </p>
        </div>
        <button
          type="button"
          className="secondary-button icon-text-button"
          onClick={() => setInfoModalOpen(true)}
        >
          <AdminIcon name="pencil" size={16} />
          <span>Modifier</span>
        </button>
      </div>

      <div className="catalogue-toolbar">
        <div className="tabs">
          <button
            type="button"
            className={`tab-button ${tab === 'ouvrages' ? 'tab-button--active' : ''}`}
            onClick={() => setTab('ouvrages')}
          >
            Les ouvrages
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'articles' ? 'tab-button--active' : ''}`}
            onClick={() => setTab('articles')}
          >
            Les articles
          </button>
        </div>
        <button
          type="button"
          className="primary-button p-1"
          onClick={() =>
            tab === 'ouvrages' ? setCreateOuvrageOpen(true) : setCreateArticleOpen(true)
          }
        >
          {tab === 'ouvrages' ? 'Ajouter ouvrage' : 'Ajouter article'}
        </button>
      </div>

      {tab === 'ouvrages' ? (
        <OuvragesListClient
          ouvrages={ouvrages}
          showMetierColumn={false}
          searchMode="metier-ouvrages"
          onRowSelect={setSelectedOuvrage}
        />
      ) : (
        <ArticlesListClient
          articles={articles}
          showMetierColumn={false}
          showFournisseurColumn={true}
          searchMode="metier-articles"
          onRowSelect={setSelectedArticle}
        />
      )}

      <MetierInfoModal open={infoModalOpen} metier={metier} onClose={() => setInfoModalOpen(false)} />

      <OuvrageEditModal
        open={Boolean(selectedOuvrage)}
        ouvrage={selectedOuvrage}
        mode="edit"
        onClose={() => setSelectedOuvrage(null)}
        onSaved={handleOuvrageSaved}
      />

      <OuvrageEditModal
        open={createOuvrageOpen}
        ouvrage={createStub}
        mode="create"
        onClose={() => setCreateOuvrageOpen(false)}
        onSaved={handleOuvrageCreated}
      />

      <ArticleEditModal
        open={Boolean(selectedArticle)}
        article={selectedArticle}
        mode="edit"
        onClose={() => setSelectedArticle(null)}
        onSaved={handleArticleSaved}
      />

      <ArticleEditModal
        open={createArticleOpen}
        article={createStub}
        mode="create"
        onClose={() => setCreateArticleOpen(false)}
        onSaved={handleArticleCreated}
      />
    </div>
  );
}
