import {
  CHANTIER_STATUS_COLORS,
  CHANTIER_STATUS_LABELS,
} from './chantierStatus';

export const REPORT_STATUS_ORDER = ['D', 'V', 'E', 'X', 'Z'];

export const buildLastTwelveMonthKeys = (referenceDate = new Date()) => {
  const keys = [];
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(cursor.getFullYear(), cursor.getMonth() - offset, 1);
    keys.push(
      `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    );
  }

  return keys;
};

export const parseChantierMonthKey = (creeLe) => {
  if (!creeLe) return null;

  const normalized = String(creeLe).includes('T')
    ? creeLe
    : String(creeLe).replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

export const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const parsed = new Date(year, month - 1, 1);
  return parsed
    .toLocaleDateString('fr-FR', { month: 'short' })
    .replace('.', '')
    .replace(/^\w/, (char) => char.toUpperCase());
};

export const aggregateReportByStatus = (rows, mode) => {
  const totals = Object.fromEntries(REPORT_STATUS_ORDER.map((status) => [status, 0]));

  for (const row of rows) {
    const status = REPORT_STATUS_ORDER.includes(row.status) ? row.status : 'D';
    totals[status] += mode === 'montant' ? Number(row.montant_total) || 0 : 1;
  }

  return totals;
};

export const aggregateReportByMonthAndStatus = (rows, mode, monthKeys) => {
  const monthSet = new Set(monthKeys);
  const byMonth = Object.fromEntries(
    monthKeys.map((monthKey) => [
      monthKey,
      Object.fromEntries(REPORT_STATUS_ORDER.map((status) => [status, 0])),
    ])
  );

  for (const row of rows) {
    const monthKey = parseChantierMonthKey(row.cree_le);
    if (!monthKey || !monthSet.has(monthKey)) continue;

    const status = REPORT_STATUS_ORDER.includes(row.status) ? row.status : 'D';
    byMonth[monthKey][status] += mode === 'montant' ? Number(row.montant_total) || 0 : 1;
  }

  return byMonth;
};

export const buildPieChartData = (totalsByStatus) =>
  REPORT_STATUS_ORDER.filter((status) => totalsByStatus[status] > 0).map((status) => ({
    value: totalsByStatus[status],
    color: CHANTIER_STATUS_COLORS[status],
    text: CHANTIER_STATUS_LABELS[status],
  }));

export const buildStackedBarData = (byMonth, monthKeys) =>
  monthKeys
    .map((monthKey) => {
      const stacks = REPORT_STATUS_ORDER.filter((status) => byMonth[monthKey][status] > 0).map(
        (status) => ({
          value: byMonth[monthKey][status],
          color: CHANTIER_STATUS_COLORS[status],
          marginBottom: 0,
        })
      );

      return {
        label: formatMonthLabel(monthKey),
        stacks,
      };
    })
    .filter((entry) => entry.stacks.length > 0);

export const formatReportValue = (value, mode) => {
  if (mode === 'montant') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} k€`;
    }
    return `${Math.round(value)} €`;
  }
  return String(Math.round(value));
};

export const getReportTotal = (totalsByStatus) =>
  REPORT_STATUS_ORDER.reduce((sum, status) => sum + totalsByStatus[status], 0);

export const buildStatusLegendItems = () =>
  REPORT_STATUS_ORDER.map((status) => ({
    status,
    label: CHANTIER_STATUS_LABELS[status],
    color: CHANTIER_STATUS_COLORS[status],
  }));
