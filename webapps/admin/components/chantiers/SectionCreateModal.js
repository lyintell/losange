'use client';

import { useEffect, useState } from 'react';
import AdminIcon from '@/components/ui/AdminIcon';

export default function SectionCreateModal({ open, onClose, onCreated, busy = false }) {
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setNom('');
    setError('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) {
      setError('Nom de section requis.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Création impossible.');
      }
      onCreated?.(result.section);
      onClose?.();
    } catch (saveError) {
      setError(saveError.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const disabled = busy || saving;

  return (
    <div className="admin-modal-backdrop" onClick={disabled ? undefined : onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-create-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="section-create-title" className="admin-modal-title">
            Nouvelle section
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={disabled}>
            ×
          </button>
        </div>
        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="section-create-nom">
            Nom
          </label>
          <input
            id="section-create-nom"
            type="text"
            className="field-input"
            value={nom}
            onChange={(event) => {
              setNom(event.target.value);
              setError('');
            }}
            disabled={disabled}
            placeholder="Ex. RDC, Salon…"
            autoFocus
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="admin-modal-actions">
            <button
              type="button"
              className="secondary-button icon-text-button"
              onClick={onClose}
              disabled={disabled}
            >
              <AdminIcon name="close" size={18} />
              <span>Annuler</span>
            </button>
            <button type="submit" className="primary-button icon-text-button" disabled={disabled}>
              <AdminIcon name="check" size={18} />
              <span>{saving ? 'Création…' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
