'use client';

import { useEffect, useState } from 'react';
import { formatUniteTypeLabel } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/articles/format';
import { getMetierColor } from '@/lib/format/metierColors';
import {
  fetchCatalogueUnitesClient,
  searchFournisseursClient,
  updateArticleClient,
  createArticleClient,
} from '@/lib/articles/updateArticleClient';

function buildEmptyUniteDraft() {
  return {
    ouvrageUniteId: `new-${Date.now()}`,
    uniteId: '',
    prixUnitaire: '',
    prixRevient: '',
    typeLabel: '—',
  };
}

function buildUniteDrafts(unites = []) {
  return unites.map((unite) => ({
    ouvrageUniteId: unite.ouvrage_unite_id,
    uniteId: unite.unite_id,
    prixUnitaire: String(unite.prix_unitaire ?? ''),
    prixRevient:
      unite.prix_revient != null && unite.prix_revient !== '' ? String(unite.prix_revient) : '',
    typeLabel: formatUniteTypeLabel(unite.ind_dimension, unite.formule),
  }));
}

function formatFournisseurSubtitle(fournisseur) {
  const phones = [fournisseur.telephone_1, fournisseur.telephone_2].filter(Boolean);
  return phones.join(' · ');
}

function normalizeFournisseurNom(nom) {
  return String(nom || '').trim().toLocaleLowerCase('fr');
}

function findExactFournisseurMatch(results, nom) {
  const normalized = normalizeFournisseurNom(nom);
  if (!normalized) return null;
  return results.find((fournisseur) => normalizeFournisseurNom(fournisseur.nom) === normalized) || null;
}

function resolveFournisseurPayload({ fournisseurNom, selectedFournisseurId, searchResults }) {
  const trimmedNom = fournisseurNom.trim();
  if (!trimmedNom) {
    return { fournisseurId: null, fournisseurNom: null };
  }

  if (selectedFournisseurId) {
    return { fournisseurId: selectedFournisseurId, fournisseurNom: null };
  }

  const exactMatch = findExactFournisseurMatch(searchResults, trimmedNom);
  if (exactMatch) {
    return { fournisseurId: exactMatch.id, fournisseurNom: null };
  }

  return { fournisseurId: null, fournisseurNom: trimmedNom };
}

export default function ArticleEditModal({ open, article, mode = 'edit', onClose, onSaved }) {
  if (!open || !article) return null;

  const isCreate = mode === 'create';

  return (
    <ArticleEditModalForm
      key={isCreate ? 'create' : `${article.id}-${article.nom}-${article.fournisseur_id || ''}`}
      article={article}
      mode={mode}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ArticleEditModalForm({ article, mode = 'edit', onClose, onSaved }) {
  const isCreate = mode === 'create';
  const [nom, setNom] = useState(isCreate ? '' : article.nom || '');
  const [nomDevis, setNomDevis] = useState(isCreate ? '' : article.nom_devis || '');
  const [fournisseurNom, setFournisseurNom] = useState(isCreate ? '' : article.fournisseur_nom || '');
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(
    isCreate ? null : article.fournisseur_id || null
  );
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [showFournisseurDropdown, setShowFournisseurDropdown] = useState(false);
  const [searchingFournisseurs, setSearchingFournisseurs] = useState(false);
  const [uniteDrafts, setUniteDrafts] = useState(() =>
    isCreate ? [buildEmptyUniteDraft()] : buildUniteDrafts(article.unites)
  );
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

  const handleFournisseurFocus = () => {
    setShowFournisseurDropdown(true);
  };

  const handleFournisseurBlur = () => {
    window.setTimeout(() => setShowFournisseurDropdown(false), 150);
  };

  const handleSelectFournisseur = (fournisseur) => {
    setSelectedFournisseurId(fournisseur.id);
    setFournisseurNom(fournisseur.nom || '');
    setFournisseurSearchResults([]);
    setShowFournisseurDropdown(false);
  };

  const handleCreateFournisseurOption = () => {
    setSelectedFournisseurId(null);
    setShowFournisseurDropdown(false);
  };

  const trimmedFournisseurNom = fournisseurNom.trim();
  const exactFournisseurMatch = findExactFournisseurMatch(fournisseurSearchResults, trimmedFournisseurNom);
  const showCreateFournisseurOption =
    Boolean(trimmedFournisseurNom) && !exactFournisseurMatch && !selectedFournisseurId;
  const showFournisseurPanel =
    showFournisseurDropdown &&
    (searchingFournisseurs ||
      fournisseurSearchResults.length > 0 ||
      showCreateFournisseurOption);

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
        return { ...draft, [field]: value };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

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

    const unitesPayload = uniteDrafts.map((draft) => ({
      ...(isCreate ? {} : { ouvrageUniteId: draft.ouvrageUniteId }),
      uniteId: draft.uniteId,
      prixUnitaire: draft.prixUnitaire,
      prixRevient: draft.prixRevient,
    }));

    const fournisseurPayload = resolveFournisseurPayload({
      fournisseurNom,
      selectedFournisseurId,
      searchResults: fournisseurSearchResults,
    });

    try {
      const result = isCreate
        ? await createArticleClient({
            metierId: article.metier_id,
            nom: nom.trim(),
            nomDevis: nomDevis.trim() || null,
            fournisseurId: fournisseurPayload.fournisseurId,
            fournisseurNom: fournisseurPayload.fournisseurNom,
            unites: unitesPayload,
          })
        : await updateArticleClient(article.id, {
            nom: nom.trim(),
            nomDevis: nomDevis.trim() || null,
            fournisseurId: fournisseurPayload.fournisseurId,
            fournisseurNom: fournisseurPayload.fournisseurNom,
            unites: unitesPayload,
          });
      onSaved?.(result);
      onClose();
    } catch (saveError) {
      setError(
        saveError.message ||
          (isCreate ? "Impossible de créer l'article." : "Impossible de mettre à jour l'article.")
      );
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
            {isCreate ? "Ajouter un article" : "Modifier l'article"}
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
            <label className="search-field-label" htmlFor="article-edit-nom-devis">
              Nom sur devis (optionnel)
            </label>
            <input
              id="article-edit-nom-devis"
              type="text"
              className="search-field-input"
              placeholder="Affiché sur les devis à la place du nom catalogue"
              value={nomDevis}
              onChange={(event) => setNomDevis(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="search-field search-field--dropdown">
            <label className="search-field-label" htmlFor="article-edit-fournisseur">
              Fournisseur (optionnel)
            </label>
            <input
              id="article-edit-fournisseur"
              type="text"
              className="search-field-input"
              placeholder="Rechercher ou saisir un nom"
              value={fournisseurNom}
              onChange={(event) => handleFournisseurNomChange(event.target.value)}
              onFocus={handleFournisseurFocus}
              onBlur={handleFournisseurBlur}
              disabled={saving}
              autoComplete="off"
            />
            {searchingFournisseurs ? <p className="search-field-hint">Recherche…</p> : null}
            {exactFournisseurMatch && !selectedFournisseurId ? (
              <p className="search-field-hint">Fournisseur existant — sélectionnez-le dans la liste.</p>
            ) : null}

            {showFournisseurPanel ? (
              <ul className="search-dropdown" role="listbox">
                {fournisseurSearchResults.map((fournisseur) => {
                  const isExactMatch =
                    normalizeFournisseurNom(fournisseur.nom) === normalizeFournisseurNom(trimmedFournisseurNom);
                  const isSelected =
                    selectedFournisseurId === fournisseur.id ||
                    (isExactMatch && !selectedFournisseurId);

                  return (
                    <li key={fournisseur.id}>
                      <button
                        type="button"
                        className={`search-dropdown-item${isSelected ? ' search-result-button--selected' : ''}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectFournisseur(fournisseur)}
                        disabled={saving}
                      >
                        <span className="search-result-name">{fournisseur.nom}</span>
                        {formatFournisseurSubtitle(fournisseur) ? (
                          <span className="search-dropdown-meta">
                            {formatFournisseurSubtitle(fournisseur)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}

                {showCreateFournisseurOption ? (
                  <li>
                    <button
                      type="button"
                      className="search-dropdown-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleCreateFournisseurOption}
                      disabled={saving}
                    >
                      <span className="search-result-name">Créer « {trimmedFournisseurNom} »</span>
                      <span className="search-dropdown-meta">Nouveau fournisseur</span>
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

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

                <div className="search-field">
                  <label
                    className="search-field-label"
                    htmlFor={`article-edit-revient-${draft.ouvrageUniteId}`}
                  >
                    Prix de revient (FCFA, optionnel)
                  </label>
                  <input
                    id={`article-edit-revient-${draft.ouvrageUniteId}`}
                    type="number"
                    min="0"
                    step="1"
                    className="search-field-input"
                    placeholder="Coût interne"
                    value={draft.prixRevient}
                    onChange={(event) =>
                      handleUniteChange(draft.ouvrageUniteId, 'prixRevient', event.target.value)
                    }
                    disabled={saving}
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
            <button type="submit" className="primary-button p-1" disabled={saving || !isValid}>
              {saving ? 'Enregistrement…' : isCreate ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
