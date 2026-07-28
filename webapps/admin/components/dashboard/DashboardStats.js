import Link from 'next/link';
import AdminIcon from '@/components/ui/AdminIcon';
import { ChantierStatusBadge } from '@/components/chantiers/ChantiersTable';
import ReleveStatusBadge from '@/components/chantiers/ReleveStatusBadge';
import { formatDisplayDate } from '@/lib/chantiers/format';
import { CHANTIER_STATUS_COLORS } from '@/lib/chantiers/status';
import { RELEVE_STATUS_COLORS } from '@/lib/chantiers/releveStatus';
import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';
import { ROLE_LABELS } from '@/lib/auth/constants';

function percentOf(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function buildPieGradient(items, colorMap, total) {
  if (!total) return '#e5e7eb';

  let cursor = 0;
  const parts = [];

  items.forEach((item) => {
    const count = Number(item.count) || 0;
    if (count <= 0) return;
    const slice = (count / total) * 100;
    const next = cursor + slice;
    const color = colorMap[item.status] || '#9ca3af';
    parts.push(`${color} ${cursor}% ${next}%`);
    cursor = next;
  });

  if (!parts.length) return '#e5e7eb';
  if (cursor < 100) {
    parts.push(`#e5e7eb ${cursor}% 100%`);
  }
  return `conic-gradient(${parts.join(', ')})`;
}

function KpiCard({ icon, label, value, hint, tone = 'neutral', href }) {
  const content = (
    <>
      <span className={`dashboard-kpi-icon dashboard-kpi-icon--${tone}`} aria-hidden="true">
        <AdminIcon name={icon} size={22} />
      </span>
      <div className="dashboard-kpi-body">
        <p className="dashboard-kpi-label">{label}</p>
        <p className="dashboard-kpi-value">{value}</p>
        {hint ? <p className="dashboard-kpi-hint">{hint}</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`dashboard-kpi dashboard-kpi--${tone} dashboard-kpi--link`}>
        {content}
      </Link>
    );
  }

  return <article className={`dashboard-kpi dashboard-kpi--${tone}`}>{content}</article>;
}

function StatusBreakdown({ title, icon, items, total, colorMap, showAmounts = false }) {
  const pieBackground = buildPieGradient(items, colorMap, total);

  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <span className="dashboard-panel-icon" aria-hidden="true">
          <AdminIcon name={icon} size={20} />
        </span>
        <div>
          <h2 className="dashboard-panel-title">{title}</h2>
          <p className="dashboard-panel-subtitle">{total} au total</p>
        </div>
      </header>

      <div className="dashboard-pie-layout">
        <div
          className="dashboard-pie"
          style={{ background: pieBackground }}
          role="img"
          aria-label={`${title} : ${total} au total`}
        >
          <div className="dashboard-pie-hole">
            <span className="dashboard-pie-total">{total}</span>
            <span className="dashboard-pie-total-label">total</span>
          </div>
        </div>

        <ul className="dashboard-pie-legend">
          {items.map((item) => {
            const count = item.count || 0;
            const pct = percentOf(count, total);
            const color = colorMap[item.status];

            return (
              <li key={item.status} className="dashboard-pie-legend-item">
                <span className="dashboard-status-dot" style={{ backgroundColor: color }} />
                <div className="dashboard-pie-legend-copy">
                  <span className="dashboard-pie-legend-label">{item.label}</span>
                  {showAmounts ? (
                    <span className="dashboard-pie-legend-amount">{formatMontantFcfa(item.total)}</span>
                  ) : null}
                </div>
                <span className="dashboard-pie-legend-stats">
                  <strong>{count}</strong>
                  <span>{pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function RecentChantiers({ rows }) {
  if (!rows?.length) {
    return <p className="dashboard-empty">Aucun chantier récent.</p>;
  }

  return (
    <ul className="dashboard-recent-list">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={row.client_id ? `/clients/${row.client_id}/chantiers/${row.id}` : `/chantiers/${row.id}`}
            className="dashboard-recent-item"
          >
            <div className="dashboard-recent-main">
              <p className="dashboard-recent-title">{row.nom}</p>
              <p className="dashboard-recent-meta">
                {row.client_nom || 'Client'}
                {row.adresse ? ` · ${row.adresse}` : ''}
              </p>
            </div>
            <div className="dashboard-recent-side">
              <ChantierStatusBadge status={row.status} />
              <span className="dashboard-recent-date">{formatDisplayDate(row.cree_le)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentDevis({ rows }) {
  if (!rows?.length) {
    return <p className="dashboard-empty">Aucun devis récent.</p>;
  }

  return (
    <ul className="dashboard-recent-list">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/chantiers/${row.chantier_id}/devis/${row.id}`} className="dashboard-recent-item">
            <div className="dashboard-recent-main">
              <p className="dashboard-recent-title">{row.chantier_nom}</p>
              <p className="dashboard-recent-meta">
                {row.client_nom || 'Client'} · {formatMontantFcfa(row.total_ht_facture)} HT
              </p>
            </div>
            <div className="dashboard-recent-side">
              <ReleveStatusBadge status={row.status} />
              <span className="dashboard-recent-date">
                {formatDisplayDate(row.date_facture || row.cree_le)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardStats({ stats, session = null }) {
  if (!stats) {
    return <p className="empty-state">Impossible de charger le tableau de bord.</p>;
  }

  const roleLabel = ROLE_LABELS[session?.role] || session?.role || '';
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const montantsByStatus = (stats.montants?.byStatus || []).map((item) => ({
    ...item,
    count: item.count || 0,
  }));

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <h1 className="dashboard-hero-title">
            Bonjour{session?.prenom ? ` ${session.prenom}` : ''}
          </h1>
          <p className="dashboard-hero-text">
            {session?.entrepriseNom
              ? `${session.entrepriseNom}${roleLabel ? ` · ${roleLabel}` : ''}`
              : 'Vue d’ensemble de l’activité'}
          </p>
        </div>
        <p className="dashboard-hero-date">{todayLabel}</p>
      </section>

      <section className="dashboard-kpi-grid" aria-label="Indicateurs clés">
        <KpiCard
          icon="account-group"
          label="Clients"
          value={stats.clients?.total ?? 0}
          hint="Fiches actives"
          tone="teal"
          href="/clients"
        />
        <KpiCard
          icon="briefcase"
          label="Chantiers"
          value={stats.chantiers.total}
          hint={`${stats.chantiers.byStatus.find((s) => s.status === 'E')?.count || 0} en cours`}
          tone="blue"
        />
        <KpiCard
          icon="file-document"
          label="Devis"
          value={stats.devis.total}
          hint={`${stats.devis.validationRate || 0}% validés`}
          tone="orange"
        />
        <KpiCard
          icon="cash-multiple"
          label="HT validé"
          value={formatMontantFcfa(stats.montants?.valide || 0)}
          hint={`${formatMontantFcfa(stats.montants?.enAttente || 0)} en attente`}
          tone="green"
        />
      </section>

      <section className="dashboard-money-strip" aria-label="Montants">
        <div className="dashboard-money-item">
          <span className="dashboard-money-label">Total HT</span>
          <strong className="dashboard-money-value">{formatMontantFcfa(stats.montants.total)}</strong>
        </div>
        <div className="dashboard-money-item">
          <span className="dashboard-money-label">Total TTC</span>
          <strong className="dashboard-money-value">
            {formatMontantFcfa(stats.montants.totalTtc || stats.montants.total)}
          </strong>
        </div>
        <div className="dashboard-money-item">
          <span className="dashboard-money-label">Moyenne / devis</span>
          <strong className="dashboard-money-value">{formatMontantFcfa(stats.devis.avgHt || 0)}</strong>
        </div>
        <div className="dashboard-money-item">
          <span className="dashboard-money-label">Taux validation</span>
          <strong className="dashboard-money-value">{stats.devis.validationRate || 0}%</strong>
        </div>
      </section>

      <section className="dashboard-panels">
        <StatusBreakdown
          title="Chantiers par statut"
          icon="briefcase"
          items={stats.chantiers.byStatus}
          total={stats.chantiers.total}
          colorMap={CHANTIER_STATUS_COLORS}
        />
        <StatusBreakdown
          title="Devis par statut"
          icon="file-document"
          items={montantsByStatus.map((item) => ({
            ...item,
            count: stats.devis.byStatus.find((row) => row.status === item.status)?.count || 0,
          }))}
          total={stats.devis.total}
          colorMap={RELEVE_STATUS_COLORS}
          showAmounts
        />
      </section>

      <section className="dashboard-recent-grid">
        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <span className="dashboard-panel-icon" aria-hidden="true">
              <AdminIcon name="briefcase" size={20} />
            </span>
            <div>
              <h2 className="dashboard-panel-title">Derniers chantiers</h2>
              <p className="dashboard-panel-subtitle">5 plus récents</p>
            </div>
          </header>
          <RecentChantiers rows={stats.chantiers.recent} />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <span className="dashboard-panel-icon" aria-hidden="true">
              <AdminIcon name="file-document" size={20} />
            </span>
            <div>
              <h2 className="dashboard-panel-title">Derniers devis</h2>
              <p className="dashboard-panel-subtitle">5 plus récents</p>
            </div>
          </header>
          <RecentDevis rows={stats.devis.recent} />
        </article>
      </section>
    </div>
  );
}
