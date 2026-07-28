'use client';

import { useState } from 'react';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import {
  createClientClient,
  deleteClientClient,
  updateClientClient,
} from '@/lib/clients/updateClientClient';

export default function ClientEditModal({
  open,
  mode = 'edit',
  client = null,
  onClose,
  onSaved,
  onDeleted,
}) {
  const isCreate = mode === 'create';
  if (!open) return null;
  if (!isCreate && !client) return null;

  return (
    <ClientEditModalForm
      key={isCreate ? 'create' : client.id}
      isCreate={isCreate}
      client={client}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

function ClientEditModalForm({ isCreate, client, onClose, onSaved, onDeleted }) {
  const [nomComplet, setNomComplet] = useState(client?.nom_complet || '');
  const [telephone1, setTelephone1] = useState(client?.telephone_1 || '');
  const [telephone2, setTelephone2] = useState(client?.telephone_2 || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const busy = saving || deleting;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      const payload = {
        nom_complet: nomComplet,
        telephone_1: telephone1,
        telephone_2: telephone2,
      };
      const saved = isCreate
        ? await createClientClient(payload)
        : await updateClientClient(client.id, payload);
      onSaved?.(saved);
      onClose();
    } catch (saveError) {
      setError(
        saveError.message ||
          (isCreate ? 'Impossible de créer le client.' : 'Impossible de mettre à jour le client.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await deleteClientClient(client.id);
      setConfirmOpen(false);
      onClose();
      onDeleted?.(client);
    } catch (err) {
      setDeleteError(err.message || 'Impossible de supprimer le client.');
    } finally {
      setDeleting(false);
    }
  };

  const isValid = Boolean(nomComplet.trim()) && Boolean(telephone1.trim());

  return (
    <>
      <div className="admin-modal-backdrop" onClick={busy ? undefined : onClose}>
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-edit-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="admin-modal-header">
            <h3 id="client-edit-modal-title" className="admin-modal-title">
              {isCreate ? 'Ajouter un client' : 'Modifier le client'}
            </h3>
            <button type="button" className="admin-modal-close" onClick={onClose} disabled={busy}>
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
                disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
              />
            </label>

            {error ? <p className="field-error">{error}</p> : null}

            <div
              className={`admin-modal-actions${isCreate ? '' : ' admin-modal-actions--with-delete'}`}
            >
              {!isCreate ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setDeleteError('');
                    setConfirmOpen(true);
                  }}
                  disabled={busy}
                >
                  Supprimer
                </button>
              ) : null}
              <div className="admin-modal-actions-end">
                <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
                  Annuler
                </button>
                <button type="submit" className="primary-button p-1" disabled={busy || !isValid}>
                  {saving ? 'Enregistrement…' : isCreate ? 'Ajouter' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {!isCreate ? (
        <ConfirmDeleteModal
          open={confirmOpen}
          title="Supprimer le client"
          message="Supprimer ce client et tous ses chantiers / relevés associés ? Cette action est définitive."
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            if (deleting) return;
            setConfirmOpen(false);
            setDeleteError('');
          }}
          onConfirm={handleDelete}
        />
      ) : null}
    </>
  );
}
