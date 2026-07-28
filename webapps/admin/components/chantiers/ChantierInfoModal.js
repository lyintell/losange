'use client';

import { useState } from 'react';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import {
  createChantierClient,
  deleteChantierClient,
  updateChantierInfoClient,
} from '@/lib/chantiers/updateChantierInfoClient';

export default function ChantierInfoModal({
  open,
  mode = 'edit',
  chantier = null,
  clientId = null,
  onClose,
  onSaved,
  onDeleted,
}) {
  const isCreate = mode === 'create';
  if (!open) return null;
  if (!isCreate && !chantier) return null;
  if (isCreate && !clientId) return null;

  return (
    <ChantierInfoModalForm
      key={isCreate ? `create-${clientId}` : chantier.id}
      isCreate={isCreate}
      chantier={chantier}
      clientId={clientId || chantier?.client_id}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

function ChantierInfoModalForm({ isCreate, chantier, clientId, onClose, onSaved, onDeleted }) {
  const [nom, setNom] = useState(chantier?.nom || '');
  const [adresse, setAdresse] = useState(chantier?.adresse || '');
  const [notes, setNotes] = useState(chantier?.notes || '');
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
      const saved = isCreate
        ? await createChantierClient({
            clientId,
            nom: nom.trim(),
            adresse: adresse.trim(),
            notes: notes.trim(),
          })
        : await updateChantierInfoClient(chantier.id, {
            clientId: chantier.client_id,
            clientNom: chantier.client_nom || '',
            clientTelephone: chantier.client_telephone_1 || '',
            nom: nom.trim(),
            adresse: adresse.trim(),
            notes: notes.trim(),
          });
      onSaved?.(saved);
      onClose();
    } catch (saveError) {
      setError(
        saveError.message ||
          (isCreate
            ? 'Impossible de créer le chantier.'
            : 'Impossible de mettre à jour le chantier.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!chantier?.id) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await deleteChantierClient(chantier.id);
      setConfirmOpen(false);
      onClose();
      onDeleted?.(chantier);
    } catch (err) {
      setDeleteError(err.message || 'Impossible de supprimer le chantier.');
    } finally {
      setDeleting(false);
    }
  };

  const isValid = Boolean(nom.trim());

  return (
    <>
      <div
        className="admin-modal-backdrop"
        onMouseDown={(event) => {
          if (busy || event.target !== event.currentTarget) return;
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
              {isCreate ? 'Ajouter un chantier' : 'Modifier les informations'}
            </h3>
            <button type="button" className="admin-modal-close" onClick={onClose} disabled={busy}>
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
                disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
              />
            </div>

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
          title="Supprimer le chantier"
          message="Supprimer ce chantier et tous ses relevés / devis associés ? Cette action est définitive."
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
