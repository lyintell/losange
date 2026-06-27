'use client';

export default function TvaToggle({ value, onChange, disabled = false }) {
  const isOui = Number(value) === 1;

  return (
    <div className="tva-toggle" role="group" aria-label="TVA">
      <button
        type="button"
        className={`tva-toggle-option${isOui ? ' tva-toggle-option--active' : ''}`}
        onClick={() => onChange(1)}
        disabled={disabled}
        aria-pressed={isOui}
      >
        Oui
      </button>
      <button
        type="button"
        className={`tva-toggle-option${!isOui ? ' tva-toggle-option--active' : ''}`}
        onClick={() => onChange(0)}
        disabled={disabled}
        aria-pressed={!isOui}
      >
        Non
      </button>
    </div>
  );
}
