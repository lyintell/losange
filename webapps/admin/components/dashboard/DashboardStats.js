import AdminIcon from '@/components/ui/AdminIcon';
import { CHANTIER_STATUS_COLORS } from '@/lib/chantiers/status';
import { RELEVE_STATUS_COLORS } from '@/lib/chantiers/releveStatus';
import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';

function CardHero({ icon, title, value }) {
  return (
    <header className="dashboard-card-hero">
      <span className="dashboard-card-icon" aria-hidden="true">
        <AdminIcon name={icon} size={24} />
      </span>
      <h2 className="dashboard-card-title">{title}</h2>
      <p className="dashboard-card-total">{value}</p>
    </header>
  );
}

function StatusStrip({ items, colorMap }) {
  return (
    <div className="dashboard-status-strip" role="list">
      {items.map((item, index) => (
        <div
          key={item.status}
          className="dashboard-status-cell"
          role="listitem"
        >
          <span
            className="dashboard-status-dot"
            style={{ backgroundColor: colorMap[item.status] }}
            aria-hidden="true"
          />
          <span className="dashboard-status-value">{item.count}</span>
          <span className="dashboard-status-label">{item.label}</span>
          {index < items.length - 1 ? (
            <span className="dashboard-status-divider" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function DashboardStats({ stats }) {
  if (!stats) return null;

  const montantsByStatus = stats.montants.byStatus.map((item) => ({
    ...item,
    montantLabel: formatMontantFcfa(item.total),
  }));

  return (
    <div className="dashboard-stats">
      <article className="dashboard-card dashboard-card--chantiers">
        <CardHero icon="briefcase" title="Chantiers" value={stats.chantiers.total} />
        <StatusStrip items={stats.chantiers.byStatus} colorMap={CHANTIER_STATUS_COLORS} />
      </article>

      <article className="dashboard-card dashboard-card--devis">
        <CardHero icon="file-document" title="Devis" value={stats.devis.total} />
        <StatusStrip items={stats.devis.byStatus} colorMap={RELEVE_STATUS_COLORS} />

        <div className="dashboard-devis-montants">
          <div className="dashboard-devis-summary">
            <div className="dashboard-devis-summary-item">
              <span className="dashboard-devis-summary-label">Montant total HT</span>
              <span className="dashboard-devis-summary-value">
                {formatMontantFcfa(stats.montants.total)}
              </span>
            </div>
          </div>

          <div className="dashboard-status-strip dashboard-status-strip--montants" role="list">
            {montantsByStatus.map((item, index) => (
              <div
                key={item.status}
                className="dashboard-status-cell"
                role="listitem"
              >
                <span
                  className="dashboard-status-dot"
                  style={{ backgroundColor: RELEVE_STATUS_COLORS[item.status] }}
                  aria-hidden="true"
                />
                <span className="dashboard-status-value">{item.montantLabel}</span>
                <span className="dashboard-status-label">{item.label}</span>
                {index < montantsByStatus.length - 1 ? (
                  <span className="dashboard-status-divider" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
