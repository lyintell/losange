'use client';

import { ChantierStatusBadge } from '@/components/chantiers/ChantiersTable';
import { CHANTIER_STATUS_OPTIONS } from '@/lib/chantiers/status';

export default function ChantierStatusModal({
  open,
  currentStatus,
  saving = false,
  error = '',
  onClose,
  onSelect,
}) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chantier-status-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="chantier-status-modal-title" className="admin-modal-title">
            Statut du chantier
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <p className="admin-modal-subtitle">Sélectionnez le statut à appliquer.</p>

        <ul className="status-option-list">
          {CHANTIER_STATUS_OPTIONS.map((status) => (
            <li key={status}>
              <button
                type="button"
                className={`status-option-button${currentStatus === status ? ' status-option-button--active' : ''}`}
                onClick={() => onSelect(status)}
                disabled={saving || currentStatus === status}
              >
                <ChantierStatusBadge status={status} />
              </button>
            </li>
          ))}
        </ul>

        {error ? <p className="field-error">{error}</p> : null}
      </div>
    </div>
  );
}
