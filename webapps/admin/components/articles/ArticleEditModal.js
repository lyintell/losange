'use client';

import { useEffect, useState } from 'react';
import { formatUniteTypeLabel } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/articles/format';
import { getMetierColor } from '@/lib/format/metierColors';
import {
  fetchCatalogueUnitesClient,
  searchFournisseursClient,
  updateArticleClient,
} from '@/lib/articles/updateArticleClient';

function buildUniteDrafts(unites = []) {
  return unites.map((unite) => ({
    ouvrageUniteId: unite.ouvrage_unite_id,
    uniteId: unite.unite_id,
    prixUnitaire: String(unite.prix_unitaire ?? ''),
    typeLabel: formatUniteTypeLabel(unite.ind_dimension, unite.formule),
  }));
}

function formatFournisseurSubtitle(fournisseur) {
  const phones = [fournisseur.telephone_1, fournisseur.telephone_2].filter(Boolean);
  return phones.join(' · ');
}

export default function ArticleEditModal({ open, article, onClose, onSaved }) {
  if (!open || !article) return null;

  return (
    <ArticleEditModalForm
      key={`${article.id}-${article.nom}-${article.fournisseur_id || ''}`}
      article={article}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ArticleEditModalForm({ article, onClose, onSaved }) {
  const [nom, setNom] = useState(article.nom || '');
  const [fournisseurNom, setFournisseurNom] = useState(article.fournisseur_nom || '');
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(article.fournisseur_id || null);
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [showFournisseurDropdown, setShowFournisseurDropdown] = useState(false);
  const [searchingFournisseurs, setSearchingFournisseurs] = useState(false);
  const [uniteDrafts, setUniteDrafts] = useState(() => buildUniteDrafts(article.unites));
  const [catalogueUnites, setCatalogueUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingUnites(true);
      try {
        const data = await fetchCatalogueUnitesClient();
        if (!cancelled) setCatalogueUnites(data);
      } catch (loadError) {
        if (!cancelled) {
          setCatalogueUnites([]);
          setError(loadError.message || 'Impossible de charger les unités.');
        }
      } finally {
        if (!cancelled) setLoadingUnites(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showFournisseurDropdown || !fournisseurNom.trim() || !article.metier_id) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearchingFournisseurs(true);
        const results = await searchFournisseursClient({
          metierId: article.metier_id,
          query: fournisseurNom,
        });
        if (!cancelled) setFournisseurSearchResults(results);
      } catch {
        if (!cancelled) setFournisseurSearchResults([]);
      } finally {
        if (!cancelled) setSearchingFournisseurs(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fournisseurNom, showFournisseurDropdown, article.metier_id]);

  const handleFournisseurNomChange = (value) => {
    setFournisseurNom(value);
    setSelectedFournisseurId(null);
    setShowFournisseurDropdown(true);
    if (!value.trim()) {
      setFournisseurSearchResults([]);
    }
  };

  const handleSelectFournisseur = (fournisseur) => {
    setSelectedFournisseurId(fournisseur.id);
    setFournisseurNom(fournisseur.nom || '');
    setFournisseurSearchResults([]);
    setShowFournisseurDropdown(false);
  };

  const handleUniteChange = (ouvrageUniteId, field, value) => {
    setUniteDrafts((prev) =>
      prev.map((draft) => {
        if (draft.ouvrageUniteId !== ouvrageUniteId) return draft;
        if (field === 'uniteId') {
          const catalogueUnite = catalogueUnites.find((item) => item.id === value);
          return {
            ...draft,
            uniteId: value,
            typeLabel: catalogueUnite
              ? formatUniteTypeLabel(catalogueUnite.ind_dimension, catalogueUnite.formule)
              : draft.typeLabel,
          };
        }
        return { ...draft, prixUnitaire: value };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!article?.id) return;

    if (!nom.trim()) {
      setError("Le nom de l'article est requis.");
      return;
    }

    if (uniteDrafts.some((draft) => !draft.uniteId)) {
      setError('Choisissez une unité pour chaque ligne.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await updateArticleClient(article.id, {
        nom: nom.trim(),
        fournisseurId: selectedFournisseurId,
        fournisseurNom: fournisseurNom.trim() || null,
        unites: uniteDrafts.map((draft) => ({
          ouvrageUniteId: draft.ouvrageUniteId,
          uniteId: draft.uniteId,
          prixUnitaire: draft.prixUnitaire,
        })),
      });
      onSaved?.(updated);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Impossible de mettre à jour l'article.");
    } finally {
      setSaving(false);
    }
  };

  const metierColor = getMetierColor(article.metier_id);
  const isValid = Boolean(nom.trim()) && !uniteDrafts.some((draft) => !draft.uniteId);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (saving || event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      <div
        className="admin-modal admin-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-edit-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="article-edit-modal-title" className="admin-modal-title">
            Modifier l&apos;article
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="detail-card detail-card--compact">
            <p className="info-row-label">Métier</p>
            <p className="info-row-value" style={{ color: metierColor }}>
              {article.metier_nom || '—'}
            </p>
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="article-edit-nom">
              Nom de l&apos;article
            </label>
            <input
              id="article-edit-nom"
              type="text"
              className="search-field-input"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="article-edit-fournisseur">
              Nom du fournisseur (optionnel)
            </label>
            <input
              id="article-edit-fournisseur"
              type="text"
              className="search-field-input"
              placeholder="Nom ou téléphone"
              value={fournisseurNom}
              onChange={(event) => handleFournisseurNomChange(event.target.value)}
              disabled={saving}
            />
            {searchingFournisseurs ? (
              <p className="search-field-hint">Recherche…</p>
            ) : null}
          </div>

          {showFournisseurDropdown && fournisseurSearchResults.length > 0 ? (
            <ul className="search-results-list">
              {fournisseurSearchResults.map((fournisseur) => (
                <li key={fournisseur.id}>
                  <button
                    type="button"
                    className={`search-result-button${
                      selectedFournisseurId === fournisseur.id ? ' search-result-button--selected' : ''
                    }`}
                    onClick={() => handleSelectFournisseur(fournisseur)}
                    disabled={saving}
                  >
                    <span className="search-result-name">{fournisseur.nom}</span>
                    {formatFournisseurSubtitle(fournisseur) ? (
                      <span className="search-result-meta">{formatFournisseurSubtitle(fournisseur)}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {uniteDrafts.length === 0 ? (
            <p className="empty-state">Aucune unité associée.</p>
          ) : (
            uniteDrafts.map((draft, index) => (
              <div key={draft.ouvrageUniteId} className="unite-edit-block">
                <p className="unite-edit-title">
                  {uniteDrafts.length > 1 ? `Unité ${index + 1}` : 'Unité'}
                </p>

                <div className="search-field">
                  <label
                    className="search-field-label"
                    htmlFor={`article-edit-unite-${draft.ouvrageUniteId}`}
                  >
                    Unité catalogue
                  </label>
                  <select
                    id={`article-edit-unite-${draft.ouvrageUniteId}`}
                    className="search-field-input"
                    value={draft.uniteId}
                    onChange={(event) =>
                      handleUniteChange(draft.ouvrageUniteId, 'uniteId', event.target.value)
                    }
                    disabled={saving || loadingUnites}
                    required
                  >
                    <option value="">Choisir une unité</option>
                    {catalogueUnites.map((catalogueUnite) => (
                      <option key={catalogueUnite.id} value={catalogueUnite.id}>
                        {formatUniteChoiceLabel(catalogueUnite)}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="unite-edit-meta">Type : {draft.typeLabel}</p>

                <div className="search-field">
                  <label
                    className="search-field-label"
                    htmlFor={`article-edit-prix-${draft.ouvrageUniteId}`}
                  >
                    Prix unitaire (FCFA)
                  </label>
                  <input
                    id={`article-edit-prix-${draft.ouvrageUniteId}`}
                    type="number"
                    min="0"
                    step="1"
                    className="search-field-input"
                    value={draft.prixUnitaire}
                    onChange={(event) =>
                      handleUniteChange(draft.ouvrageUniteId, 'prixUnitaire', event.target.value)
                    }
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            ))
          )}

          {error ? <p className="field-error">{error}</p> : null}

          <div className="admin-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="primary-button" disabled={saving || !isValid}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
