import {
  CHANTIER_STATUS_OPTIONS,
  getChantierStatusLabel,
} from '@/lib/chantiers/status';
import {
  RELEVE_STATUS_OPTIONS,
  getReleveStatusLabel,
  normalizeReleveStatus,
} from '@/lib/chantiers/releveStatus';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function emptyStatusCounts(options) {
  return Object.fromEntries(options.map((key) => [key, 0]));
}

function emptyMontantBuckets(options) {
  return Object.fromEntries(options.map((key) => [key, { sum: 0, count: 0 }]));
}

export async function fetchDashboardStats({ entrepriseId }) {
  const supabase = createServerSupabaseClient();

  let clientsQuery = supabase.from('clients').select('id').is('supprime_le', null);
  if (entrepriseId) {
    clientsQuery = clientsQuery.eq('entreprise_id', entrepriseId);
  }

  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error(clientsError.message || 'Erreur chargement clients.');

  const clientIds = (clients || []).map((client) => client.id);
  if (!clientIds.length) {
    return {
      chantiers: {
        total: 0,
        byStatus: CHANTIER_STATUS_OPTIONS.map((status) => ({
          status,
          label: getChantierStatusLabel(status),
          count: 0,
        })),
      },
      devis: {
        total: 0,
        byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
          status,
          label: getReleveStatusLabel(status),
          count: 0,
        })),
      },
      montants: {
        total: 0,
        byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
          status,
          label: getReleveStatusLabel(status),
          total: 0,
          count: 0,
        })),
      },
    };
  }

  const { data: chantiers, error: chantiersError } = await supabase
    .from('chantiers')
    .select('id, status')
    .in('client_id', clientIds)
    .is('supprime_le', null);

  if (chantiersError) throw new Error(chantiersError.message || 'Erreur chargement chantiers.');

  const chantierIds = (chantiers || []).map((row) => row.id);
  const chantiersByStatus = emptyStatusCounts(CHANTIER_STATUS_OPTIONS);

  (chantiers || []).forEach((chantier) => {
    const status = CHANTIER_STATUS_OPTIONS.includes(chantier.status) ? chantier.status : 'D';
    chantiersByStatus[status] += 1;
  });

  const devisByStatus = emptyStatusCounts(RELEVE_STATUS_OPTIONS);
  const montantsByStatus = emptyMontantBuckets(RELEVE_STATUS_OPTIONS);

  let releves = [];
  if (chantierIds.length) {
    const { data, error } = await supabase
      .from('releves')
      .select('status, total_ht_facture')
      .in('chantier_id', chantierIds)
      .is('supprime_le', null);

    if (error) throw new Error(error.message || 'Erreur chargement statistiques devis.');
    releves = data || [];
  }

  let montantTotal = 0;

  releves.forEach((releve) => {
    const status = normalizeReleveStatus(releve.status);
    const amount = Math.round(Number(releve.total_ht_facture) || 0);

    devisByStatus[status] = (devisByStatus[status] || 0) + 1;
    montantTotal += amount;

    if (montantsByStatus[status]) {
      montantsByStatus[status].sum += amount;
      montantsByStatus[status].count += 1;
    }
  });

  const devisTotal = releves.length;

  return {
    chantiers: {
      total: chantiers?.length || 0,
      byStatus: CHANTIER_STATUS_OPTIONS.map((status) => ({
        status,
        label: getChantierStatusLabel(status),
        count: chantiersByStatus[status] || 0,
      })),
    },
    devis: {
      total: devisTotal,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        count: devisByStatus[status] || 0,
      })),
    },
    montants: {
      total: montantTotal,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        total: montantsByStatus[status].sum,
        count: montantsByStatus[status].count,
      })),
    },
  };
}
