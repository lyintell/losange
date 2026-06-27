import { getReleveStatusColor, getReleveStatusLabel } from '@/lib/chantiers/releveStatus';

export default function ReleveStatusBadge({
  status,
  className = '',
  onClick = null,
  disabled = false,
  saving = false,
}) {
  const label = getReleveStatusLabel(status);
  const color = getReleveStatusColor(status);

  const badge = (
    <span className="status-badge" style={{ backgroundColor: color }}>
      {saving ? '…' : label}
    </span>
  );

  if (!onClick) {
    return <span className={className || undefined}>{badge}</span>;
  }

  return (
    <button
      type="button"
      className={`status-trigger-button${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled || saving}
      aria-label="Changer le statut du relevé"
      title="Cliquer pour changer le statut"
    >
      {badge}
    </button>
  );
}
