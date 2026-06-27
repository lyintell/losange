'use client';

import { useState } from 'react';
import { updateClientClient } from '@/lib/clients/updateClientClient';

export default function ClientEditModal({ open, client, onClose, onSaved }) {
  if (!open || !client) return null;

  return (
    <ClientEditModalForm
      key={client.id}
      client={client}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ClientEditModalForm({ client, onClose, onSaved }) {
  const [nomComplet, setNomComplet] = useState(client.nom_complet || '');
  const [telephone1, setTelephone1] = useState(client.telephone_1 || '');
  const [telephone2, setTelephone2] = useState(client.telephone_2 || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client?.id) return;

    setSaving(true);
    setError('');

    try {
      const updated = await updateClientClient(client.id, {
        nom_complet: nomComplet,
        telephone_1: telephone1,
        telephone_2: telephone2,
      });
      onSaved?.(updated);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Impossible de mettre à jour le client.');
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(nomComplet.trim()) && Boolean(telephone1.trim());

  return (
    <div className="admin-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-edit-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="client-edit-modal-title" className="admin-modal-title">
            Modifier le client
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <label className="search-field" htmlFor="client-edit-nom">
            <span className="search-field-label">Nom du client</span>
            <input
              id="client-edit-nom"
              type="text"
              className="search-field-input"
              value={nomComplet}
              onChange={(event) => setNomComplet(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label className="search-field" htmlFor="client-edit-tel1">
            <span className="search-field-label">Téléphone 1</span>
            <input
              id="client-edit-tel1"
              type="tel"
              className="search-field-input"
              value={telephone1}
              onChange={(event) => setTelephone1(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label className="search-field" htmlFor="client-edit-tel2">
            <span className="search-field-label">Téléphone 2 (optionnel)</span>
            <input
              id="client-edit-tel2"
              type="tel"
              className="search-field-input"
              value={telephone2}
              onChange={(event) => setTelephone2(event.target.value)}
              disabled={saving}
            />
          </label>

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
