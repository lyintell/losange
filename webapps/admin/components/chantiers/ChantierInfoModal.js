'use client';

import { useState } from 'react';
import { updateChantierInfoClient } from '@/lib/chantiers/updateChantierInfoClient';

export default function ChantierInfoModal({ open, chantier, onClose, onSaved }) {
  if (!open || !chantier) return null;

  return (
    <ChantierInfoModalForm
      key={chantier.id}
      chantier={chantier}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ChantierInfoModalForm({ chantier, onClose, onSaved }) {
  const [nom, setNom] = useState(chantier.nom || '');
  const [adresse, setAdresse] = useState(chantier.adresse || '');
  const [notes, setNotes] = useState(chantier.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!chantier?.id) return;

    setSaving(true);
    setError('');

    try {
      const updated = await updateChantierInfoClient(chantier.id, {
        clientId: chantier.client_id,
        clientNom: chantier.client_nom || '',
        clientTelephone: chantier.client_telephone_1 || '',
        nom: nom.trim(),
        adresse: adresse.trim(),
        notes: notes.trim(),
      });
      onSaved?.(updated);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Impossible de mettre à jour le chantier.');
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(nom.trim());

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (saving || event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chantier-info-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="chantier-info-modal-title" className="admin-modal-title">
            Modifier les informations
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="search-field">
            <label className="search-field-label" htmlFor="chantier-info-nom">
              Nom du chantier
            </label>
            <input
              id="chantier-info-nom"
              type="text"
              className="search-field-input"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="chantier-info-adresse">
              Adresse
            </label>
            <input
              id="chantier-info-adresse"
              type="text"
              className="search-field-input"
              value={adresse}
              onChange={(event) => setAdresse(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="search-field">
            <label className="search-field-label" htmlFor="chantier-info-notes">
              Notes
            </label>
            <textarea
              id="chantier-info-notes"
              className="search-field-input search-field-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              disabled={saving}
            />
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="admin-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="primary-button p-1" disabled={saving || !isValid}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
