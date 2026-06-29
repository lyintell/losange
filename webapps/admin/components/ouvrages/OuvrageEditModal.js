'use client';

import { useEffect, useState } from 'react';
import { formatUniteTypeLabel } from '@/lib/format/formatLigneMesures';
import { formatUniteChoiceLabel } from '@/lib/ouvrages/format';
import { getMetierColor } from '@/lib/format/metierColors';
import {
  fetchCatalogueUnitesClient,
  updateOuvrageClient,
  createOuvrageClient,
} from '@/lib/ouvrages/updateOuvrageClient';

function buildEmptyUniteDraft() {
  return {
    ouvrageUniteId: `new-${Date.now()}`,
    uniteId: '',
    prixUnitaire: '',
    typeLabel: '—',
  };
}

function buildUniteDrafts(unites = []) {
  return unites.map((unite) => ({
    ouvrageUniteId: unite.ouvrage_unite_id,
    uniteId: unite.unite_id,
    prixUnitaire: String(unite.prix_unitaire ?? ''),
    typeLabel: formatUniteTypeLabel(unite.ind_dimension, unite.formule),
  }));
}

export default function OuvrageEditModal({ open, ouvrage, mode = 'edit', onClose, onSaved }) {
  if (!open || !ouvrage) return null;

  const isCreate = mode === 'create';

  return (
    <OuvrageEditModalForm
      key={isCreate ? 'create' : `${ouvrage.id}-${ouvrage.nom}`}
      ouvrage={ouvrage}
      mode={mode}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function OuvrageEditModalForm({ ouvrage, mode = 'edit', onClose, onSaved }) {
  const isCreate = mode === 'create';
  const [nom, setNom] = useState(isCreate ? '' : ouvrage.nom || '');
  const [nomDevis, setNomDevis] = useState(isCreate ? '' : ouvrage.nom_devis || '');
  const [uniteDrafts, setUniteDrafts] = useState(() =>
    isCreate ? [buildEmptyUniteDraft()] : buildUniteDrafts(ouvrage.unites)
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

    if (!nom.trim()) {
      setError("Le nom de l'ouvrage est requis.");
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
    }));

    try {
      const result = isCreate
        ? await createOuvrageClient({
            metierId: ouvrage.metier_id,
            nom: nom.trim(),
            nomDevis: nomDevis.trim() || null,
            unites: unitesPayload,
          })
        : await updateOuvrageClient(ouvrage.id, {
            nom: nom.trim(),
            nomDevis: nomDevis.trim() || null,
            unites: unitesPayload,
          });
      onSaved?.(result);
      onClose();
    } catch (saveError) {
      setError(
        saveError.message ||
          (isCreate ? "Impossible de créer l'ouvrage." : "Impossible de mettre à jour l'ouvrage.")
      );
    } finally {
      setSaving(false);
    }
  };

  const metierColor = getMetierColor(ouvrage.metier_id);
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
        aria-labelledby="ouvrage-edit-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="ouvrage-edit-modal-title" className="admin-modal-title">
            {isCreate ? "Ajouter un ouvrage" : "Modifier l'ouvrage"}
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="detail-card detail-card--compact">
            <p className="info-row-label">Métier</p>
            <p className="info-row-value" style={{ color: metierColor }}>
              {ouvrage.metier_nom || '—'}
            </p>
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="ouvrage-edit-nom">
              Nom de l&apos;ouvrage
            </label>
            <input
              id="ouvrage-edit-nom"
              type="text"
              className="search-field-input"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="ouvrage-edit-nom-devis">
              Nom sur devis (optionnel)
            </label>
            <input
              id="ouvrage-edit-nom-devis"
              type="text"
              className="search-field-input"
              placeholder="Affiché sur les devis à la place du nom catalogue"
              value={nomDevis}
              onChange={(event) => setNomDevis(event.target.value)}
              disabled={saving}
            />
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
                    htmlFor={`ouvrage-edit-unite-${draft.ouvrageUniteId}`}
                  >
                    Unité catalogue
                  </label>
                  <select
                    id={`ouvrage-edit-unite-${draft.ouvrageUniteId}`}
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
                    htmlFor={`ouvrage-edit-prix-${draft.ouvrageUniteId}`}
                  >
                    Prix unitaire (FCFA)
                  </label>
                  <input
                    id={`ouvrage-edit-prix-${draft.ouvrageUniteId}`}
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
            <button type="submit" className="primary-button p-1" disabled={saving || !isValid}>
              {saving ? 'Enregistrement…' : isCreate ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
