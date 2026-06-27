'use client';

export default function MetierInfoModal({ open, metier, onClose }) {
  if (!open || !metier) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metier-info-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="metier-info-title" className="admin-modal-title">
            Détails du métier
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-modal-form">
          <label className="search-field">
            <span className="search-field-label">Nom</span>
            <input type="text" className="search-field-input" value={metier.nom || ''} readOnly />
          </label>
          <label className="search-field">
            <span className="search-field-label">Abréviation</span>
            <input type="text" className="search-field-input" value={metier.abbrev || ''} readOnly />
          </label>
          <label className="search-field">
            <span className="search-field-label">Type</span>
            <input
              type="text"
              className="search-field-input"
              value={metier.ind_custom ? 'Personnalisé' : 'Par défaut'}
              readOnly
            />
          </label>
          <label className="search-field">
            <span className="search-field-label">Actif (prise de dimension)</span>
            <input
              type="text"
              className="search-field-input"
              value={Number(metier.ind_actif) === 0 ? 'Non' : 'Oui'}
              readOnly
            />
          </label>
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
