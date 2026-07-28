'use client';

import AdminIcon from '@/components/ui/AdminIcon';

export default function ConfirmDeleteModal({
  open,
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  deleting = false,
  error = '',
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="admin-modal-backdrop admin-modal-backdrop--nested"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        className="admin-modal admin-modal--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="confirm-delete-title" className="admin-modal-title">
            {title}
          </h3>
          <button type="button" className="admin-modal-close" onClick={onCancel} disabled={deleting}>
            ×
          </button>
        </div>

        <p className="admin-confirm-message">{message}</p>
        {error ? <p className="field-error">{error}</p> : null}

        <div className="admin-modal-actions">
          <button
            type="button"
            className="secondary-button icon-text-button"
            onClick={onCancel}
            disabled={deleting}
          >
            <AdminIcon name="close" size={18} />
            <span>Annuler</span>
          </button>
          <button
            type="button"
            className="danger-button icon-text-button"
            onClick={onConfirm}
            disabled={deleting}
          >
            <AdminIcon name="delete" size={18} />
            <span>{deleting ? 'Suppression…' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
